import { apiError, created, readJson } from "@/lib/http/api-response";
import { assertCharacterOwnership, getRequestActor } from "@/lib/security/ownership";
import { updateCharacterState } from "@/lib/services/character-service";
import { updateCharacterStateSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ characterId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { characterId } = await context.params;
    await assertCharacterOwnership(characterId, await getRequestActor(request));
    const body = updateCharacterStateSchema.parse(await readJson(request));
    return created({
      state: await updateCharacterState({
        ...body,
        characterId,
      }),
    });
  } catch (error) {
    return apiError(error);
  }
}
