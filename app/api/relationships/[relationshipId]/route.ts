import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertRelationshipOwnership, getRequestActor } from "@/lib/security/ownership";
import { updateRelationship } from "@/lib/relationships/relationship-service";
import { updateRelationshipSchema } from "@/lib/validation/schemas";

type Context = {
  params: Promise<{ relationshipId: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const { relationshipId } = await context.params;
    await assertRelationshipOwnership(relationshipId, await getRequestActor(request));
    const input = updateRelationshipSchema.parse(await readJson(request));
    return ok({ relationship: await updateRelationship(relationshipId, input) });
  } catch (error) {
    return apiError(error);
  }
}

