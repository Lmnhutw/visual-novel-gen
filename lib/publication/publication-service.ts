import { Prisma } from "@prisma/client";

import { composeChapterManuscript } from "@/lib/chapters/chapter-lifecycle";
import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";

import {
  STORE_PAGE_LIMIT,
  type PublicationChapterPreview,
  type PublicationManagement,
  type PublicationSummary,
} from "./publication-contract";

function finishedManuscriptSelect(storyId: string) {
  return {
    id: true,
    number: true,
    title: true,
    content: true,
    scenes: {
      where: { storyId },
      select: { content: true },
      orderBy: { number: "asc" },
    },
  } satisfies Prisma.ChapterSelect;
}

const chapterHeadingSelect = { number: true, title: true } as const;

const publicationSummarySelect = {
  penName: true,
  publishedAt: true,
  updatedAt: true,
  chapters: {
    select: { number: true },
    orderBy: { number: "asc" },
  },
} satisfies Prisma.PublishedStorySelect;

const publicStorySelect = {
  slug: true,
  title: true,
  description: true,
  penName: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.PublishedStorySelect;

type PublicationInput = {
  penName: string;
  chapterIds: string[];
};

type PublicationRecord = Prisma.PublishedStoryGetPayload<{
  select: typeof publicationSummarySelect;
}>;

function publicationSummary(record: PublicationRecord): PublicationSummary {
  return {
    penName: record.penName,
    chapterNumbers: record.chapters.map(({ number }) => number),
    publishedAt: record.publishedAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function readOwnedStory(tx: Prisma.TransactionClient, storyId: string, actorId: string) {
  const story = await tx.story.findFirst({
    where: { id: storyId, ownerId: actorId },
    select: { slug: true, title: true, description: true },
  });
  if (!story) {
    throw new WorkflowError("STORY_NOT_FOUND", "Story not found.", 404);
  }
  return story;
}

async function canPublish(tx: Prisma.TransactionClient, actorId: string) {
  const permission = await tx.authorPermission.findUnique({
    where: { userId: actorId },
    select: { allowToPublish: true },
  });
  return permission?.allowToPublish === true;
}

export function getPublicationManagement(storyId: string, actorId: string): Promise<PublicationManagement> {
  return prisma.$transaction(async (tx) => {
    const story = await readOwnedStory(tx, storyId, actorId);
    const candidateChapters = await tx.chapter.findMany({
      where: { storyId, status: "COMPLETE" },
      select: finishedManuscriptSelect(storyId),
      orderBy: { number: "asc" },
    });
    const publication = await tx.publishedStory.findUnique({
      where: { storyId },
      select: publicationSummarySelect,
    });
    return {
      canPublish: await canPublish(tx, actorId),
      story,
      chapters: candidateChapters
        .filter(({ content, scenes }) => content?.trim() || scenes.some((scene) => scene.content?.trim()))
        .map(({ id, number, title }) => ({ id, number, title })),
      publication: publication && publicationSummary(publication),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export function previewPublicationChapter(
  storyId: string,
  actorId: string,
  chapterId: string,
): Promise<PublicationChapterPreview> {
  return prisma.$transaction(async (tx) => {
    await readOwnedStory(tx, storyId, actorId);
    const chapter = await tx.chapter.findFirst({
      where: { id: chapterId, storyId, status: "COMPLETE" },
      select: finishedManuscriptSelect(storyId),
    });
    const content = chapter && composeChapterManuscript(chapter);
    if (!chapter || !content) {
      throw new WorkflowError("CHAPTER_NOT_FOUND", "Publishable chapter not found.", 404);
    }
    return { id: chapter.id, number: chapter.number, title: chapter.title, content };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

async function writePublication<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");
      if (!conflict) throw error;
      if (attempt === 3) {
        throw new WorkflowError("PUBLICATION_CONFLICT", "The publication changed concurrently. Try again.", 409);
      }
    }
  }
}

export function savePublication(
  storyId: string,
  actorId: string,
  input: PublicationInput,
): Promise<PublicationSummary> {
  return writePublication(async (tx) => {
    const story = await readOwnedStory(tx, storyId, actorId);
    if (!(await canPublish(tx, actorId))) {
      throw new WorkflowError(
        "PUBLISH_PERMISSION_REQUIRED",
        "Your account needs permission to publish and update stories on the Store.",
        403,
      );
    }

    const chapters = await tx.chapter.findMany({
      where: { id: { in: input.chapterIds }, storyId, status: "COMPLETE" },
      select: finishedManuscriptSelect(storyId),
      orderBy: { number: "asc" },
    });
    const snapshots = chapters.map((chapter) => ({
      storyId,
      number: chapter.number,
      title: chapter.title,
      content: composeChapterManuscript(chapter),
    }));
    if (!snapshots.length || snapshots.length !== input.chapterIds.length || snapshots.some(({ content }) => !content)) {
      throw new WorkflowError(
        "INVALID_PUBLICATION_CHAPTERS",
        "Choose completed chapters from this story that have manuscript text.",
        409,
      );
    }

    const { title, description } = story;
    const fields = { title, description, penName: input.penName };
    const publication = await tx.publishedStory.upsert({
      where: { storyId },
      create: { ...fields, storyId, slug: story.slug },
      update: fields,
      select: { penName: true, publishedAt: true, updatedAt: true },
    });
    await tx.publishedChapter.deleteMany({ where: { storyId } });
    await tx.publishedChapter.createMany({ data: snapshots });

    return publicationSummary({ ...publication, chapters: snapshots });
  });
}

export function deletePublication(storyId: string, actorId: string): Promise<void> {
  return writePublication(async (tx) => {
    await readOwnedStory(tx, storyId, actorId);
    await tx.publishedStory.deleteMany({ where: { storyId } });
  });
}

const STORE_PAGE_SIZE = 20;

export async function listPublishedStories(page = 1) {
  const currentPage = Number.isInteger(page) && page >= 1 && page <= STORE_PAGE_LIMIT ? page : 1;
  const records = await prisma.publishedStory.findMany({
    orderBy: [{ publishedAt: "desc" }, { storyId: "desc" }],
    take: STORE_PAGE_SIZE + 1,
    skip: (currentPage - 1) * STORE_PAGE_SIZE,
    select: { ...publicStorySelect, _count: { select: { chapters: true } } },
  });
  return {
    stories: records.slice(0, STORE_PAGE_SIZE).map(({ _count, ...story }) => ({
      ...story,
      chapterCount: _count.chapters,
    })),
    hasNextPage: currentPage < STORE_PAGE_LIMIT && records.length > STORE_PAGE_SIZE,
  };
}

export function getPublishedStory(slug: string) {
  return prisma.$transaction((tx) => tx.publishedStory.findUnique({
    where: { slug },
    select: {
      ...publicStorySelect,
      chapters: { select: chapterHeadingSelect, orderBy: { number: "asc" } },
    },
  }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function getPublishedChapter(slug: string, number: number) {
  if (!Number.isInteger(number) || number <= 0 || number > 2_147_483_647) return null;

  return prisma.$transaction(async (tx) => {
    const record = await tx.publishedChapter.findFirst({
      where: { number, publication: { slug } },
      select: {
        ...chapterHeadingSelect,
        storyId: true,
        content: true,
        publication: { select: { title: true, slug: true } },
      },
    });
    if (!record) return null;

    const { storyId, publication: story, ...chapter } = record;
    const previous = await tx.publishedChapter.findFirst({
      where: { storyId, number: { lt: number } },
      orderBy: { number: "desc" },
      select: chapterHeadingSelect,
    });
    const next = await tx.publishedChapter.findFirst({
      where: { storyId, number: { gt: number } },
      orderBy: { number: "asc" },
      select: chapterHeadingSelect,
    });
    return { story, chapter, previous, next };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
