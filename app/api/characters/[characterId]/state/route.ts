import { apiError, created, readJson } from "@/lib/http/api-response";
import { updateCharacterState } from "@/lib/services/character-service";
import { updateCharacterStateSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ characterId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { characterId } = await context.params;
    const body = updateCharacterStateSchema.parse(await readJson(request));
    return created({
      state: await updateCharacterState({
        ...body,
        characterId: body.characterId ?? characterId,
      }),
    });
  } catch (error) {
    return apiError(error);
  }
}
