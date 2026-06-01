import { generateText } from "@/lib/ai/provider";
import { prisma } from "@/lib/db/prisma";

export type CreateChapterInput = {
  storyId: string;
  number: number;
  title: string;
  summary?: string;
  content?: string;
  status?: "OUTLINE" | "DRAFT" | "COMPLETE" | "ARCHIVED";
};

export async function createChapter(input: CreateChapterInput) {
  return prisma.chapter.create({
    data: {
      storyId: input.storyId,
      number: input.number,
      title: input.title,
      summary: input.summary,
      content: input.content,
      status: input.status ?? "OUTLINE",
      tokenCount: input.content ? Math.ceil(input.content.length / 4) : 0,
    },
  });
}

export async function listChapters(storyId: string) {
  return prisma.chapter.findMany({
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
  });
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

  const sourceText =
    chapter.content ??
    chapter.scenes
      .map((scene) => `Scene ${scene.number}: ${scene.content ?? scene.summary ?? ""}`)
      .join("\n\n");

  const summary = await generateText(
    `Summarize this chapter for future continuity retrieval. Include important character, relationship, timeline, secret, lore, and unresolved-thread facts. Return concise prose.\n\nStory: ${chapter.story.title}\nChapter: ${chapter.title}\n\n${sourceText}`,
    { temperature: 0.2, topP: 0.8 },
  );

  return prisma.chapter.update({
    where: { id: chapterId },
    data: { summary: summary.text },
  });
}
