import { z } from "zod";

import { apiError, ok, WorkflowError } from "@/lib/http/api-response";
import { PUBLICATION_PEN_NAME_MAX } from "@/lib/publication/publication-contract";
import {
  deletePublication,
  getPublicationManagement,
  previewPublicationChapter,
  savePublication,
} from "@/lib/publication/publication-service";
import { getRequestActor } from "@/lib/security/ownership";

type Context = { params: Promise<{ storyId: string }> };

const idSchema = z.string().trim().min(1).max(128);
const publicationSchema = z.object({
  penName: z.string().trim().min(1).max(PUBLICATION_PEN_NAME_MAX),
  chapterIds: z.array(idSchema).min(1)
    .refine((ids) => new Set(ids).size === ids.length, "Choose each chapter once."),
}).strict();

const cacheControl = "private, no-store";
const privateResponse = { headers: { "Cache-Control": cacheControl } };

function publicationError(error: unknown) {
  const response = apiError(error);
  response.headers.set("Cache-Control", cacheControl);
  return response;
}

async function requireAuthor(request: Request) {
  const actor = await getRequestActor(request);
  if (!actor) throw new WorkflowError("AUTH_REQUIRED", "Sign in to manage your publication.", 401);
  return actor;
}

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await requireAuthor(request);
    const storyId = idSchema.parse((await params).storyId);
    const chapterId = new URL(request.url).searchParams.get("chapterId");
    if (chapterId !== null) {
      const chapter = await previewPublicationChapter(storyId, actor, idSchema.parse(chapterId));
      return ok({ chapter }, privateResponse);
    }
    return ok(await getPublicationManagement(storyId, actor), privateResponse);
  } catch (error) {
    return publicationError(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const actor = await requireAuthor(request);
    const storyId = idSchema.parse((await params).storyId);
    const body: unknown = await request.json().catch(() => {
      throw new WorkflowError("INVALID_JSON", "Request body must be valid JSON.", 400);
    });
    const publication = await savePublication(storyId, actor, publicationSchema.parse(body));
    return ok({ publication }, privateResponse);
  } catch (error) {
    return publicationError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await requireAuthor(request);
    const storyId = idSchema.parse((await params).storyId);
    await deletePublication(storyId, actor);
    return ok({ deleted: true }, privateResponse);
  } catch (error) {
    return publicationError(error);
  }
}
