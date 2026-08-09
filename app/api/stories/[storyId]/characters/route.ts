import { apiError, created, ok, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import {
  createCharacter,
  listCharactersByStory,
} from "@/lib/characters/character-service";
import { createCharacterSchema, uuidSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ storyId: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const { storyId } = await context.params;
    const parsedStoryId = uuidSchema.parse(storyId);
    await assertStoryOwnership(parsedStoryId, await getRequestActor(request));
    return ok({ characters: await listCharactersByStory(parsedStoryId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { storyId } = await context.params;
    const body = await readJson(request);
    const input = createCharacterSchema.parse({
      ...(body && typeof body === "object" ? body : {}),
      storyId,
    });
    await assertStoryOwnership(input.storyId, await getRequestActor(request));

    return created({ character: await createCharacter(input) });
  } catch (error) {
    return apiError(error);
  }
}
