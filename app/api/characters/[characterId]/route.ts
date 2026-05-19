import { apiError, ok, readJson } from "@/lib/http/api-response";
import { updateCharacter } from "@/lib/characters/character-service";
import { updateCharacterSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ characterId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { characterId } = await context.params;
    const input = updateCharacterSchema.parse(await readJson(request));
    return ok({ character: await updateCharacter(characterId, input) });
  } catch (error) {
    return apiError(error);
  }
}

