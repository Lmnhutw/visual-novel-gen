import { generateChapter } from "@/lib/generation/generation-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { generateSceneSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = generateSceneSchema.parse(await readJson(request));
    await assertStoryOwnership(input.storyId, await getRequestActor(request));
    return ok(await generateChapter(input));
  } catch (error) {
    return apiError(error);
  }
}

