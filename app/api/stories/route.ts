import { apiError, created, ok, readJson } from "@/lib/http/api-response";
import { createStory, listStories } from "@/lib/stories/story-service";
import { createStorySchema } from "@/lib/validation/schemas";
import { getRequestActor } from "@/lib/security/ownership";

export async function GET(request: Request) {
  try {
    return ok({ stories: await listStories(await getRequestActor(request)) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createStorySchema.parse(await readJson(request));
    return created({ story: await createStory({ ...input, ownerId: await getRequestActor(request) ?? undefined }) });
  } catch (error) {
    return apiError(error);
  }
}

