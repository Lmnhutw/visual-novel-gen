import { apiError, ok, readJson } from "@/lib/http/api-response";
import { getStory, updateStory } from "@/lib/stories/story-service";
import { updateStorySchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ storyId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { storyId } = await context.params;
    return ok({ story: await getStory(storyId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { storyId } = await context.params;
    const input = updateStorySchema.parse(await readJson(request));
    return ok({ story: await updateStory(storyId, input) });
  } catch (error) {
    return apiError(error);
  }
}

