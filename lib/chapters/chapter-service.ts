import { Prisma } from "@prisma/client";

import { generateText } from "@/lib/ai/provider";
import { parseJsonString, toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";
import { parseWritingHarnessAuditMetadata } from "@/lib/writing-harness/evaluation";
import {
  chapterGenerationMode,
  chapterLengthConfig,
  chapterProgress,
  chapterWordBudget,
  composeChapterManuscript,
  countWords,
  type ChapterGenerationMode,
} from "@/lib/chapters/chapter-lifecycle";

export type CreateChapterInput = {
  storyId: string;
  number: number;
  title: string;
  summary?: string;
  content?: string;
  status?: "OUTLINE" | "DRAFT" | "COMPLETE" | "ARCHIVED";
};

export async function createChapter(input: CreateChapterInput) {
  const content = input.content?.trim();
  const contentWords = content ? countWords(content) : 0;
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const settings = content
          ? await tx.storySettings.findUnique({ where: { storyId: input.storyId } })
          : null;
        const config = chapterLengthConfig(settings);
        const budget = chapterWordBudget(0, contentWords, config);
        if (budget.exceedsHardLimit) {
          throw chapterHardLimitError(budget);
        }

        const chapter = await tx.chapter.create({
          data: {
            storyId: input.storyId,
            number: input.number,
            title: input.title,
            summary: input.summary,
            status: input.status ?? "OUTLINE",
            tokenCount: content ? Math.ceil(content.length / 4) : 0,
            wordCount: contentWords,
          },
        });
        if (content) {
          await tx.scene.create({
            data: {
              storyId: input.storyId,
              chapterId: chapter.id,
              number: 1,
              content,
              tokenCount: Math.ceil(content.length / 4),
            },
          });
        }
        return chapter;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

function chapterHardLimitError(
  budget: ReturnType<typeof chapterWordBudget>,
) {
  return new WorkflowError(
    "CHAPTER_HARD_LIMIT_EXCEEDED",
    `This draft exceeds the chapter hard limit by ${budget.excessWords.toLocaleString("en-US")} words. Shorten the draft before approving it.`,
    409,
    budget,
  );
}

function storedChapterMode(metadata: string | null): ChapterGenerationMode | null {
  const value = parseJsonString<Record<string, unknown>>(metadata, {});
  return value.chapterMode === "NORMAL" || value.chapterMode === "CLOSING"
    ? value.chapterMode
    : null;
}

function isTransactionConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2002", "P2034"].includes(error.code)
  );
}

async function withSerializableRetry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === 2) throw error;
    }
  }
  throw new Error("Unreachable transaction retry state.");
}

async function upsertNextDraftChapter(
  tx: Prisma.TransactionClient,
  storyId: string,
  number: number,
) {
  const where = { storyId_number: { storyId, number } };
  const existing = await tx.chapter.findUnique({ where });
  if (existing && ["COMPLETE", "ARCHIVED"].includes(existing.status)) {
    throw new WorkflowError(
      "NEXT_CHAPTER_CLOSED",
      `Chapter ${number} is already closed and cannot be reopened automatically.`,
      409,
    );
  }
  return tx.chapter.upsert({
    where,
    create: {
      storyId,
      number,
      title: `Chapter ${number}`,
      status: "DRAFT",
    },
    update: { status: "DRAFT" },
  });
}

export async function ensureActiveChapter(
  storyId: string,
  requestedChapterId?: string,
) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        if (requestedChapterId) {
          const requested = await tx.chapter.findFirst({
            where: { id: requestedChapterId, storyId },
          });
          if (!requested) {
            throw new WorkflowError(
              "CHAPTER_NOT_FOUND",
              "Chapter does not belong to this story.",
              404,
            );
          }
          if (["COMPLETE", "ARCHIVED"].includes(requested.status)) {
            throw new WorkflowError(
              "CHAPTER_NOT_ACTIVE",
              "Generation requires an active chapter.",
              409,
            );
          }
          return requested;
        }

        const active = await tx.chapter.findFirst({
          where: { storyId, status: { notIn: ["COMPLETE", "ARCHIVED"] } },
          orderBy: { number: "desc" },
        });
        if (active) return active;

        const latest = await tx.chapter.aggregate({
          where: { storyId },
          _max: { number: true },
        });
        const number = (latest._max.number ?? 0) + 1;
        return tx.chapter.create({
          data: {
            storyId,
            number,
            title: `Chapter ${number}`,
            status: "DRAFT",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

export type CommitDraftInput = {
  content?: string;
  action?: "continue" | "end_chapter";
  allowContinuityReview?: boolean;
};

export async function commitDraftToChapter(
  draftVersionId: string,
  input: CommitDraftInput = {},
) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const draft = await tx.draftVersion.findUnique({
          where: { id: draftVersionId },
          include: {
            scene: true,
            job: true,
            generationRun: { include: { continuityIssues: true } },
          },
        });
        if (!draft) {
          throw new WorkflowError("DRAFT_NOT_FOUND", "Draft not found.", 404);
        }
        if (draft.scene) {
          const chapter = await tx.chapter.findUniqueOrThrow({
            where: { id: draft.scene.chapterId },
          });
          return { draft, scene: draft.scene, chapter, nextChapter: null, reused: true };
        }

        const audit = parseWritingHarnessAuditMetadata(draft.metadata);
        if (audit?.evaluation.status === "needs_review") {
          throw new WorkflowError(
            "HARNESS_REVIEW_REQUIRED",
            "Resolve remaining Writing Harness violations before adding this draft to the chapter.",
            409,
          );
        }

        const issues = draft.generationRun?.continuityIssues ?? [];
        if (issues.some((issue) => issue.severity === "P0" && issue.status === "OPEN")) {
          throw new WorkflowError(
            "CONTINUITY_BLOCKED",
            "Resolve blocking continuity issues before adding this draft to the chapter.",
            409,
          );
        }
        if (
          !input.allowContinuityReview &&
          issues.some((issue) => issue.severity === "P1" && issue.status === "OPEN")
        ) {
          throw new WorkflowError(
            "CONTINUITY_REVIEW_REQUIRED",
            "Review or explicitly override P1 continuity issues before adding this draft.",
            409,
          );
        }

        const chapter = await tx.chapter.findFirst({
          where: { id: draft.chapterId ?? draft.job?.chapterId ?? "", storyId: draft.storyId },
          include: { story: { include: { settings: true } } },
        });
        if (!chapter) {
          throw new WorkflowError(
            "CHAPTER_NOT_FOUND",
            "The draft is not associated with an active chapter.",
            409,
          );
        }
        if (["COMPLETE", "ARCHIVED"].includes(chapter.status)) {
          throw new WorkflowError(
            "CHAPTER_NOT_ACTIVE",
            "This chapter is already closed and cannot accept another draft.",
            409,
          );
        }

        const content = input.content?.trim() || draft.content;
        const addedWords = countWords(content);
        if (!addedWords) {
          throw new WorkflowError("EMPTY_DRAFT", "Draft content cannot be empty.", 422);
        }

        const config = chapterLengthConfig(chapter.story.settings);
        const budget = chapterWordBudget(chapter.wordCount, addedWords, config);
        if (budget.exceedsHardLimit) {
          throw chapterHardLimitError(budget);
        }

        const latestScene = await tx.scene.aggregate({
          where: { chapterId: chapter.id },
          _max: { number: true },
        });
        const scene = await tx.scene.create({
          data: {
            storyId: draft.storyId,
            chapterId: chapter.id,
            number: (latestScene._max.number ?? 0) + 1,
            title: draft.title,
            content,
            tokenCount: Math.ceil(content.length / 4),
          },
        });

        const claimed = await tx.draftVersion.updateMany({
          where: { id: draft.id, sceneId: null },
          data: { content, status: "ACCEPTED", sceneId: scene.id },
        });
        if (claimed.count !== 1) {
          throw new Prisma.PrismaClientKnownRequestError(
            "Draft was committed concurrently.",
            { code: "P2034", clientVersion: Prisma.prismaVersion.client },
          );
        }

        const effectiveChapterMode =
          storedChapterMode(draft.metadata) ??
          chapterGenerationMode(chapter.wordCount, config);
        const shouldAdvance =
          input.action === "end_chapter" ||
          (config.autoAdvance &&
            effectiveChapterMode === "CLOSING" &&
            budget.projectedWords >= config.targetWords);

        const updatedChapter = await tx.chapter.update({
          where: { id: chapter.id },
          data: {
            wordCount: budget.projectedWords,
            tokenCount: { increment: Math.ceil(content.length / 4) },
            status: shouldAdvance ? "COMPLETE" : "DRAFT",
          },
        });

        let nextChapter = null;
        if (shouldAdvance) {
          nextChapter = await upsertNextDraftChapter(
            tx,
            draft.storyId,
            chapter.number + 1,
          );
        }

        await tx.auditLog.create({
          data: {
            storyId: draft.storyId,
            action: "draft.version.committed",
            entityType: "draft_version",
            entityId: draft.id,
            metadata: toJsonString({
              sceneId: scene.id,
              chapterId: chapter.id,
              addedWords,
              projectedWords: budget.projectedWords,
              hardLimitWords: budget.hardLimitWords,
              chapterMode: effectiveChapterMode,
              action: shouldAdvance ? "end_chapter" : "continue",
            }),
          },
        });

        return {
          draft: { ...draft, content, status: "ACCEPTED", sceneId: scene.id },
          scene,
          chapter: updatedChapter,
          nextChapter,
          progress: chapterProgress(budget.projectedWords, config),
          reused: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

export async function completeChapterAndStartNext(chapterId: string) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const chapter = await tx.chapter.findUnique({ where: { id: chapterId } });
        if (!chapter) {
          throw new WorkflowError("CHAPTER_NOT_FOUND", "Chapter not found.", 404);
        }
        await tx.chapter.update({
          where: { id: chapter.id },
          data: { status: "COMPLETE" },
        });
        const nextChapter = await upsertNextDraftChapter(
          tx,
          chapter.storyId,
          chapter.number + 1,
        );
        return { chapter: { ...chapter, status: "COMPLETE" }, nextChapter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}

export async function listChapters(storyId: string) {
  const [chapters, settings] = await Promise.all([
    prisma.chapter.findMany({
      where: { storyId },
      orderBy: { number: "asc" },
      include: {
        _count: {
          select: {
            scenes: true,
            events: true,
            continuityIssues: true,
          },
        },
      },
    }),
    prisma.storySettings.findUnique({ where: { storyId } }),
  ]);
  const config = chapterLengthConfig(settings);
  return chapters.map((chapter) => ({
    ...chapter,
    progress: chapterProgress(chapter.wordCount, config),
  }));
}

export async function summarizeChapter(chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      story: true,
      scenes: {
        orderBy: { number: "asc" },
      },
    },
  });

  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  const sourceText = composeChapterManuscript({
    content: chapter.content,
    scenes: chapter.scenes.map((scene) => ({
      content: scene.content ?? scene.summary,
    })),
  });

  const summary = await generateText(
    `Summarize this chapter for future continuity retrieval. Include important character, relationship, timeline, secret, lore, and unresolved-thread facts. Return concise prose.\n\nStory: ${chapter.story.title}\nChapter: ${chapter.title}\n\n${sourceText}`,
    { temperature: 0.2, topP: 0.8 },
  );

  return prisma.chapter.update({
    where: { id: chapterId },
    data: { summary: summary.text },
  });
}
