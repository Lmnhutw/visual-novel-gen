import { randomizeCharacterSection } from "@/lib/characters/character-randomization-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { randomizeCharacterSectionSchema } from "@/lib/validators/character.schema";

export async function POST(request: Request) {
  try {
    const input = randomizeCharacterSectionSchema.parse(await readJson(request));
    const actorId = await getRequestActor(request);

    if (input.storyId) {
      await assertStoryOwnership(input.storyId, actorId);
    }

    return ok({ section: await randomizeCharacterSection(input) });
  } catch (error) {
    return apiError(error);
  }
}
