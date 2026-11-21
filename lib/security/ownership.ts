import "server-only";

import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";
import { getSessionUser } from "@/lib/security/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAuthRequired } from "@/lib/supabase/session";

export async function getRequestActor(
  request: Request,
): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  if (authorization !== null) {
    const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (token) {
      const { data, error } = await getSupabaseServerClient().auth.getUser(token);
      if (!error && data.user) return data.user.id;
    }
    throw new WorkflowError("INVALID_SESSION", "Your session is no longer valid. Sign in again.", 401);
  }

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  const requestUrl = new URL(request.url);
  // Next.js can normalize the URL host to its internal listener.
  const host = request.headers.get("host") ?? requestUrl.host;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    ((origin && origin !== `${requestUrl.protocol}//${host.toLowerCase()}`) ||
      fetchSite === "cross-site" || fetchSite === "same-site")) {
    throw new WorkflowError("INVALID_ORIGIN", "This request must come from the workspace.", 403);
  }

  const user = await getSessionUser(true);
  if (user) return user.id;
  if (isAuthRequired()) {
    throw new WorkflowError("AUTH_REQUIRED", "Sign in is required for this workspace.", 401);
  }
  return null;
}

export async function assertStoryOwnership(
  storyId: string,
  actorId: string | null,
) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, ownerId: actorId },
    select: { id: true },
  });
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
    throw new WorkflowError(
      `${resourceName.toUpperCase()}_NOT_FOUND`,
      `${resourceName} not found.`,
      404,
    );
  }
  await assertStoryOwnership(storyId, actorId);
}

export async function assertCharacterOwnership(
  characterId: string,
  actorId: string | null,
) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(character?.storyId, actorId, "character");
}

export async function assertChapterOwnership(
  chapterId: string,
  actorId: string | null,
) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(chapter?.storyId, actorId, "chapter");
}

export async function assertRelationshipOwnership(
  relationshipId: string,
  actorId: string | null,
) {
  const relationship = await prisma.relationship.findUnique({
    where: { id: relationshipId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(
    relationship?.storyId,
    actorId,
    "relationship",
  );
}

export async function assertDraftVersionOwnership(
  draftVersionId: string,
  actorId: string | null,
) {
  const draftVersion = await prisma.draftVersion.findUnique({
    where: { id: draftVersionId },
    select: { storyId: true },
  });
  await assertResourceStoryOwnership(
    draftVersion?.storyId,
    actorId,
    "draft version",
  );
}
