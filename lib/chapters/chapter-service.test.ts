import assert from "node:assert/strict";
import test from "node:test";

import {
  commitDraftToChapter,
  completeChapterAndStartNext,
  createChapter,
  ensureActiveChapter,
} from "@/lib/chapters/chapter-service";
import { prisma } from "@/lib/db/prisma";
import { getDefaultWritingHarness } from "@/lib/writing-harness/config";
import {
  createWritingHarnessAudit,
  validateWritingHarnessOutput,
} from "@/lib/writing-harness/evaluation";

async function withTransaction<T>(transaction: unknown, run: () => Promise<T>) {
  const client = prisma as unknown as { $transaction: unknown };
  const original = client.$transaction;
  client.$transaction = (callback: (tx: unknown) => Promise<T>) =>
    callback(transaction);
  try {
    return await run();
  } finally {
    client.$transaction = original;
  }
}

test("chapter content enters the canonical manuscript as Scene 1", async () => {
  let chapterData: Record<string, unknown> | undefined;
  let sceneData: Record<string, unknown> | undefined;
  await withTransaction(
    {
      storySettings: { findUnique: async () => null },
      chapter: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          chapterData = data;
          return { id: "chapter-1", ...data };
        },
      },
      scene: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          sceneData = data;
          return { id: "scene-1", ...data };
        },
      },
    },
    () =>
      createChapter({
        storyId: "story-1",
        number: 1,
        title: "Chapter 1",
        content: "Opening prose",
      }),
  );

  assert.equal(chapterData?.content, undefined);
  assert.equal(chapterData?.wordCount, 2);
  assert.deepEqual(sceneData, {
    storyId: "story-1",
    chapterId: "chapter-1",
    number: 1,
    content: "Opening prose",
    tokenCount: 4,
  });
});

test("chapter creation rejects initial content above the story hard limit", async () => {
  let chapterCreates = 0;
  await assert.rejects(
    withTransaction(
      {
        storySettings: {
          findUnique: async () => ({
            chapterTargetWords: 1,
            chapterSoftLimitWords: 1,
            chapterHardLimitWords: 1,
            chapterAutoAdvance: true,
          }),
        },
        chapter: {
          create: async () => {
            chapterCreates += 1;
          },
        },
      },
      () =>
        createChapter({
          storyId: "story-1",
          number: 1,
          title: "Chapter 1",
          content: "two words",
        }),
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "CHAPTER_HARD_LIMIT_EXCEEDED",
  );
  assert.equal(chapterCreates, 0);
});

test("first generation creates Chapter 1 and later generation reuses the active chapter", async () => {
  let createdData: Record<string, unknown> | undefined;
  const created = await withTransaction(
    {
      chapter: {
        findFirst: async () => null,
        aggregate: async () => ({ _max: { number: null } }),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdData = data;
          return { id: "chapter-1", ...data };
        },
      },
    },
    () => ensureActiveChapter("story-1"),
  );
  assert.equal(created.id, "chapter-1");
  assert.deepEqual(createdData, {
    storyId: "story-1",
    number: 1,
    title: "Chapter 1",
    status: "DRAFT",
  });

  const active = { id: "chapter-1", storyId: "story-1", status: "DRAFT" };
  assert.equal(
    await withTransaction(
      { chapter: { findFirst: async () => active } },
      () => ensureActiveChapter("story-1"),
    ),
    active,
  );
});

test("an explicitly selected closed chapter cannot receive a new generation", async () => {
  await assert.rejects(
    withTransaction(
      {
        chapter: {
          findFirst: async () => ({
            id: "chapter-1",
            storyId: "story-1",
            status: "COMPLETE",
          }),
        },
      },
      () => ensureActiveChapter("story-1", "chapter-1"),
    ),
    /Generation requires an active chapter/,
  );
});

test("commit uses final edited content while pending canon proposals remain non-blocking", async () => {
  let sceneData: Record<string, unknown> | undefined;
  let draftUpdate: Record<string, unknown> | undefined;
  let chapterUpdate: Record<string, unknown> | undefined;
  const transaction = {
    draftVersion: {
      findUnique: async () => ({
        id: "draft-1",
        storyId: "story-1",
        chapterId: "chapter-1",
        title: "Scene",
        content: "old content",
        metadata: "{}",
        scene: null,
        job: {
          chapterId: "chapter-1",
          proposals: [{ id: "proposal-1", status: "PENDING" }],
        },
        generationRun: { continuityIssues: [] },
      }),
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        draftUpdate = data;
        return { count: 1 };
      },
    },
    chapter: {
      findFirst: async () => ({
        id: "chapter-1",
        storyId: "story-1",
        number: 1,
        title: "Chapter 1",
        wordCount: 10,
        tokenCount: 10,
        status: "DRAFT",
        story: { settings: null },
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        chapterUpdate = data;
        return { id: "chapter-1", number: 1, title: "Chapter 1", wordCount: 13 };
      },
      upsert: async () => { throw new Error("should not advance"); },
    },
    scene: {
      aggregate: async () => ({ _max: { number: 2 } }),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        sceneData = data;
        return { id: "scene-3", ...data };
      },
    },
    auditLog: { create: async () => ({ id: "audit-1" }) },
  };

  const result = await withTransaction(transaction, () =>
    commitDraftToChapter("draft-1", { content: "final edited prose" }),
  );
  assert.equal(sceneData?.content, "final edited prose");
  assert.equal(sceneData?.number, 3);
  assert.deepEqual(draftUpdate, {
    content: "final edited prose",
    status: "ACCEPTED",
    sceneId: "scene-3",
  });
  assert.equal(chapterUpdate?.wordCount, 13);
  assert.equal(result.reused, false);
});

test("manual edits can resolve a stored Writing Harness violation before approval", async () => {
  const harness = {
    ...getDefaultWritingHarness(),
    forbiddenPhrases: ["forbidden phrase"],
  };
  const originalContent = "This contains a forbidden phrase.";
  const metadata = JSON.stringify({
    writingHarness: createWritingHarnessAudit(harness, {
      content: originalContent,
      status: "needs_review",
      normalizationFindings: [],
      findingsBeforeRepair: validateWritingHarnessOutput(originalContent, harness),
      findingsAfterRepair: [],
      repairAttempted: false,
    }),
  });
  let sceneContent = "";

  await withTransaction(
    {
      draftVersion: {
        findUnique: async () => ({
          id: "draft-1",
          storyId: "story-1",
          chapterId: "chapter-1",
          title: "Scene",
          content: originalContent,
          metadata,
          scene: null,
          job: { chapterId: "chapter-1" },
          generationRun: { continuityIssues: [] },
        }),
        updateMany: async () => ({ count: 1 }),
      },
      chapter: {
        findFirst: async () => ({
          id: "chapter-1",
          storyId: "story-1",
          number: 1,
          title: "Chapter 1",
          wordCount: 0,
          tokenCount: 0,
          status: "DRAFT",
          story: { settings: null },
        }),
        update: async () => ({
          id: "chapter-1",
          number: 1,
          title: "Chapter 1",
          wordCount: 3,
        }),
        upsert: async () => {
          throw new Error("should not advance");
        },
      },
      scene: {
        aggregate: async () => ({ _max: { number: 0 } }),
        create: async ({ data }: { data: { content: string } }) => {
          sceneContent = data.content;
          return { id: "scene-1", ...data };
        },
      },
      auditLog: { create: async () => ({ id: "audit-1" }) },
    },
    () => commitDraftToChapter("draft-1", { content: "Clean final prose." }),
  );

  assert.equal(sceneContent, "Clean final prose.");
});

test("duplicate approval reuses its existing scene without appending", async () => {
  let sceneCreates = 0;
  const scene = { id: "scene-1", chapterId: "chapter-1" };
  const result = await withTransaction(
    {
      draftVersion: {
        findUnique: async () => ({ id: "draft-1", scene }),
      },
      scene: { create: async () => { sceneCreates += 1; } },
      chapter: {
        findUniqueOrThrow: async () => ({ id: "chapter-1", wordCount: 20 }),
      },
    },
    () => commitDraftToChapter("draft-1"),
  );
  assert.equal(result.reused, true);
  assert.equal(sceneCreates, 0);
});

test("open P0 blocks commit and open P1 requires an explicit override", async () => {
  const draft = (severity: "P0" | "P1") => ({
    id: "draft-1",
    storyId: "story-1",
    metadata: "{}",
    scene: null,
    job: null,
    generationRun: {
      continuityIssues: [{ severity, status: "OPEN" }],
    },
  });

  await assert.rejects(
    withTransaction(
      { draftVersion: { findUnique: async () => draft("P0") } },
      () => commitDraftToChapter("draft-1"),
    ),
    /Resolve blocking continuity issues/,
  );
  await assert.rejects(
    withTransaction(
      { draftVersion: { findUnique: async () => draft("P1") } },
      () => commitDraftToChapter("draft-1"),
    ),
    /explicitly override P1 continuity issues/,
  );
});

test("an approved closing draft can complete the chapter and reuse Chapter 2", async () => {
  let nextChapterCreate: Record<string, unknown> | undefined;
  const result = await withTransaction(
    {
      draftVersion: {
        findUnique: async () => ({
          id: "draft-1",
          storyId: "story-1",
          chapterId: "chapter-1",
          title: "Closing scene",
          content: "one two three four",
          metadata: JSON.stringify({ chapterMode: "CLOSING" }),
          scene: null,
          job: null,
          generationRun: { continuityIssues: [] },
        }),
        updateMany: async () => ({ count: 1 }),
      },
      chapter: {
        findUnique: async () => null,
        findFirst: async () => ({
          id: "chapter-1",
          storyId: "story-1",
          number: 1,
          title: "Chapter 1",
          wordCount: 5_499,
          status: "DRAFT",
          story: {
            settings: {
              chapterTargetWords: 5_000,
              chapterSoftLimitWords: 5_500,
              chapterHardLimitWords: 6_000,
              chapterAutoAdvance: true,
            },
          },
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "chapter-1",
          number: 1,
          title: "Chapter 1",
          wordCount: data.wordCount,
          status: data.status,
        }),
        upsert: async ({ create }: { create: Record<string, unknown> }) => {
          nextChapterCreate = create;
          return { id: "chapter-2", ...create };
        },
      },
      scene: {
        aggregate: async () => ({ _max: { number: 1 } }),
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "scene-2",
          ...data,
        }),
      },
      auditLog: { create: async () => ({ id: "audit-1" }) },
    },
    () => commitDraftToChapter("draft-1"),
  );

  assert.equal(result.chapter.status, "COMPLETE");
  assert.equal(result.nextChapter?.id, "chapter-2");
  assert.deepEqual(nextChapterCreate, {
    storyId: "story-1",
    number: 2,
    title: "Chapter 2",
    status: "DRAFT",
  });
});

test("approval rejects an edited draft that would exceed the chapter hard limit", async () => {
  let sceneCreates = 0;
  await assert.rejects(
    withTransaction(
      {
        draftVersion: {
          findUnique: async () => ({
            id: "draft-1",
            storyId: "story-1",
            chapterId: "chapter-1",
            title: "Too long",
            content: "six seven",
            metadata: JSON.stringify({ chapterMode: "CLOSING" }),
            scene: null,
            job: null,
            generationRun: { continuityIssues: [] },
          }),
        },
        chapter: {
          findFirst: async () => ({
            id: "chapter-1",
            storyId: "story-1",
            number: 1,
            status: "DRAFT",
            wordCount: 5,
            story: {
              settings: {
                chapterTargetWords: 4,
                chapterSoftLimitWords: 5,
                chapterHardLimitWords: 6,
                chapterAutoAdvance: true,
              },
            },
          }),
        },
        scene: {
          create: async () => {
            sceneCreates += 1;
          },
        },
      },
      () => commitDraftToChapter("draft-1"),
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "CHAPTER_HARD_LIMIT_EXCEEDED" &&
      "details" in error &&
      typeof error.details === "object" &&
      error.details !== null &&
      "excessWords" in error.details &&
      error.details.excessWords === 1,
  );
  assert.equal(sceneCreates, 0);
});

test("a normal Continue Anyway draft may reach the hard limit without auto-advancing", async () => {
  let chapterStatus: unknown;
  const result = await withTransaction(
    {
      draftVersion: {
        findUnique: async () => ({
          id: "draft-1",
          storyId: "story-1",
          chapterId: "chapter-1",
          title: "Exact boundary",
          content: "five six",
          metadata: JSON.stringify({ chapterMode: "NORMAL" }),
          scene: null,
          job: null,
          generationRun: { continuityIssues: [] },
        }),
        updateMany: async () => ({ count: 1 }),
      },
      chapter: {
        findFirst: async () => ({
          id: "chapter-1",
          storyId: "story-1",
          number: 1,
          status: "DRAFT",
          wordCount: 4,
          story: {
            settings: {
              chapterTargetWords: 4,
              chapterSoftLimitWords: 5,
              chapterHardLimitWords: 6,
              chapterAutoAdvance: true,
            },
          },
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          chapterStatus = data.status;
          return { id: "chapter-1", number: 1, wordCount: data.wordCount, status: data.status };
        },
        upsert: async () => {
          throw new Error("normal mode must not auto-advance");
        },
      },
      scene: {
        aggregate: async () => ({ _max: { number: 1 } }),
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "scene-2", ...data }),
      },
      auditLog: { create: async () => ({ id: "audit-1" }) },
    },
    () => commitDraftToChapter("draft-1"),
  );

  assert.equal(result.chapter.wordCount, 6);
  assert.equal(chapterStatus, "DRAFT");
  assert.equal(result.nextChapter, null);
});

test("manual chapter end completes once and reuses the uniquely numbered next chapter", async () => {
  let upsertWhere: unknown;
  let nextChapter: { id: string; number: number; status: string } | null = null;
  let nextChapterCreates = 0;
  const transaction =
    {
      chapter: {
        findUnique: async ({ where }: { where: { id?: string } }) =>
          where.id
            ? { id: "chapter-1", storyId: "story-1", number: 1, status: "DRAFT" }
            : nextChapter,
        update: async () => ({ id: "chapter-1", status: "COMPLETE" }),
        upsert: async ({ where }: { where: unknown }) => {
          upsertWhere = where;
          if (!nextChapter) {
            nextChapterCreates += 1;
            nextChapter = { id: "chapter-2", number: 2, status: "DRAFT" };
          }
          return nextChapter;
        },
      },
    };
  const result = await withTransaction(
    transaction,
    () => completeChapterAndStartNext("chapter-1"),
  );
  const repeated = await withTransaction(
    transaction,
    () => completeChapterAndStartNext("chapter-1"),
  );
  assert.deepEqual(upsertWhere, {
    storyId_number: { storyId: "story-1", number: 2 },
  });
  assert.equal(result.nextChapter.id, "chapter-2");
  assert.equal(repeated.nextChapter.id, "chapter-2");
  assert.equal(nextChapterCreates, 1);
});
