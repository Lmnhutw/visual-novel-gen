import { apiError, created, readJson } from "@/lib/http/api-response";
import { copyCharacterTemplateToStory } from "@/lib/characters/character-template-service";
import { characterRoleSchema, uuidSchema } from "@/lib/validation/schemas";
import { getRequestActor } from "@/lib/security/ownership";
import { z } from "zod";

const inputSchema = z.object({ templateId: uuidSchema, role: characterRoleSchema.optional() });
type Context = { params: Promise<{ storyId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { storyId } = await context.params;
    const input = inputSchema.parse(await readJson(request));
    const character = await copyCharacterTemplateToStory({
      actorId: await getRequestActor(request),
      storyId: uuidSchema.parse(storyId),
      ...input,
    });
    return created({ character });
  } catch (error) {
    return apiError(error);
  }
}
