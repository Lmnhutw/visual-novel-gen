import { apiError, created, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { createCharacter } from "@/lib/services/character-service";
import { createCharacterSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = createCharacterSchema.parse(await readJson(request));
    await assertStoryOwnership(input.storyId, await getRequestActor(request));
    return created({ character: await createCharacter(input) });
  } catch (error) {
    return apiError(error);
  }
}
