import { apiError, ok, readJson } from "@/lib/http/api-response";
import {
  deleteCharacter,
  getCharacterById,
  updateCharacter,
} from "@/lib/services/character-service";
import { updateCharacterSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ characterId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { characterId } = await context.params;
    const character = await getCharacterById(characterId);

    if (!character) {
      return ok({ error: "Character not found." }, { status: 404 });
    }

    return ok({ character });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { characterId } = await context.params;
    const input = updateCharacterSchema.parse(await readJson(request));
    return ok({ character: await updateCharacter(characterId, input) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { characterId } = await context.params;
    return ok(await deleteCharacter(characterId));
  } catch (error) {
    return apiError(error);
  }
}
