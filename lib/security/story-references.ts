import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";

export async function assertStoryReferences(
  storyId: string,
  references: { chapterId?: string; sceneId?: string; eventId?: string; generationRunId?: string },
  db: Prisma.TransactionClient = prisma,
) {
  const { chapterId, sceneId, eventId, generationRunId } = references;
  const select = { id: true } as const;
  const matches = await Promise.all([
    chapterId ? db.chapter.findFirst({ where: { id: chapterId, storyId }, select }) : true,
    sceneId ? db.scene.findFirst({ where: { id: sceneId, storyId, chapterId }, select }) : true,
    eventId ? db.event.findFirst({ where: { id: eventId, storyId, sceneId }, select }) : true,
    generationRunId
      ? db.generationRun.findFirst({ where: { id: generationRunId, storyId }, select })
      : true,
  ]);
  if (matches.some((match) => !match)) {
    throw new WorkflowError("INVALID_STORY_REFERENCE", "The referenced item is not in this story.", 404);
  }
}
