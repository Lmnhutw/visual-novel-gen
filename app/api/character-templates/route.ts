import { created, ok, apiError, readJson } from "@/lib/http/api-response";
import { getRequestActor } from "@/lib/security/ownership";
import {
  createCharacterTemplate,
  listCharacterTemplates,
} from "@/lib/characters/character-template-service";
import { createCharacterTemplateSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("query") ?? undefined;
    return ok({ templates: await listCharacterTemplates(await getRequestActor(request), query) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createCharacterTemplateSchema.parse(await readJson(request));
    return created({ template: await createCharacterTemplate(await getRequestActor(request), input) });
  } catch (error) {
    return apiError(error);
  }
}
