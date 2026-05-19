import { apiError, created, ok, readJson } from "@/lib/http/api-response";
import { createStory, listStories } from "@/lib/stories/story-service";
import { createStorySchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    return ok({ stories: await listStories() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createStorySchema.parse(await readJson(request));
    return created({ story: await createStory(input) });
  } catch (error) {
    return apiError(error);
  }
}

