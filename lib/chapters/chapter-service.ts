import { generateText } from "@/lib/ai/ollama-client";
import { prisma } from "@/lib/db/prisma";

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
    data: { summary },
  });
}

