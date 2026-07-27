import "server-only";

import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function isAuthRequired() {
  return process.env.REQUIRE_AUTH === "true";
}

export async function getRequestActor(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    if (isAuthRequired()) {
      throw new WorkflowError("AUTH_REQUIRED", "Sign in is required for this workspace.", 401);
    }
    return null;
  }

  const { data, error } = await getSupabaseServerClient().auth.getUser(token);
  if (error || !data.user) {
    throw new WorkflowError("INVALID_SESSION", "Your session is no longer valid. Sign in again.", 401);
  }
  return data.user.id;
}

export async function assertStoryOwnership(storyId: string, actorId: string | null) {
  if (!actorId) return;
  const story = await prisma.story.findFirst({ where: { id: storyId, ownerId: actorId }, select: { id: true } });
  if (!story) {
    throw new WorkflowError("STORY_NOT_FOUND", "Story not found.", 404);
  }
}

async function assertResourceStoryOwnership(
  storyId: string | null | undefined,
  actorId: string | null,
  resourceName: string,
) {
  if (!storyId) {
    throw new WorkflowError(`${resourceName.toUpperCase()}_NOT_FOUND`, `${resourceName} not found.`, 404);
  }
  await assertStoryOwnership(storyId, actorId);
}

export async function assertCharacterOwnership(characterId: string, actorId: string | null) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(character?.storyId, actorId, "character");
}

export async function assertChapterOwnership(chapterId: string, actorId: string | null) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(chapter?.storyId, actorId, "chapter");
}

export async function assertRelationshipOwnership(relationshipId: string, actorId: string | null) {
  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(relationship?.storyId, actorId, "relationship");
}

export async function assertDraftVersionOwnership(draftVersionId: string, actorId: string | null) {
  const draftVersion = await prisma.draftVersion.findUnique({
    where: { id: draftVersionId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(draftVersion?.storyId, actorId, "draft version");
}
