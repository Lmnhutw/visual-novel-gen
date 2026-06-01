import { apiError, created, ok, readJson } from "@/lib/http/api-response";
import {
  createCharacter,
  listCharactersByStory,
} from "@/lib/services/character-service";
import { createCharacterSchema, uuidSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ storyId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { storyId } = await context.params;
    const parsedStoryId = uuidSchema.parse(storyId);
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

    return created({ character: await createCharacter(input) });
  } catch (error) {
    return apiError(error);
  }
}
