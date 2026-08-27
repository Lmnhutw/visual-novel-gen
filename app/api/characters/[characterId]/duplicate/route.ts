import { apiError, ok } from "@/lib/http/api-response";
import { duplicateCharacterForEdit } from "@/lib/characters/character-template-service";
import { getRequestActor } from "@/lib/security/ownership";

type Context = { params: Promise<{ characterId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { characterId } = await context.params;
    return ok({ character: await duplicateCharacterForEdit(await getRequestActor(request), characterId) });
  } catch (error) {
    return apiError(error);
  }
}
