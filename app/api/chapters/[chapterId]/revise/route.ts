import { reviseDraft } from "@/lib/generation/generation-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertChapterOwnership, getRequestActor } from "@/lib/security/ownership";
import { assertStoryReferences } from "@/lib/security/story-references";
import { reviseChapterSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ chapterId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { chapterId } = await context.params;
    await assertChapterOwnership(chapterId, await getRequestActor(request));
    const input = reviseChapterSchema.parse(await readJson(request));
    await assertStoryReferences(input.storyId, { chapterId });
    return ok(await reviseDraft({ ...input, chapterId }));
  } catch (error) {
    return apiError(error);
  }
}

