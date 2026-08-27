import { apiError, ok, readJson } from "@/lib/http/api-response";
import {
  deleteCharacterTemplate,
  updateCharacterTemplate,
} from "@/lib/characters/character-template-service";
import { createCharacterTemplateSchema } from "@/lib/validation/schemas";
import { getRequestActor } from "@/lib/security/ownership";

type Context = { params: Promise<{ templateId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { templateId } = await context.params;
    const input = createCharacterTemplateSchema.parse(await readJson(request));
    return ok({ template: await updateCharacterTemplate(await getRequestActor(request), templateId, input) });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { templateId } = await context.params;
    return ok(await deleteCharacterTemplate(await getRequestActor(request), templateId));
  } catch (error) {
    return apiError(error);
  }
}
