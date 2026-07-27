import { apiError, created, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { createRelationship } from "@/lib/relationships/relationship-service";
import { createRelationshipSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = createRelationshipSchema.parse(await readJson(request));
    await assertStoryOwnership(input.storyId, await getRequestActor(request));
    return created({ relationship: await createRelationship(input) });
  } catch (error) {
    return apiError(error);
  }
}

