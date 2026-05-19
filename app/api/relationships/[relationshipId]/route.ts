import { apiError, ok, readJson } from "@/lib/http/api-response";
import { updateRelationship } from "@/lib/relationships/relationship-service";
import { updateRelationshipSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ relationshipId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { relationshipId } = await context.params;
    const input = updateRelationshipSchema.parse(await readJson(request));
    return ok({ relationship: await updateRelationship(relationshipId, input) });
  } catch (error) {
    return apiError(error);
  }
}

