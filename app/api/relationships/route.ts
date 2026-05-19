import { apiError, created, readJson } from "@/lib/http/api-response";
import { createRelationship } from "@/lib/relationships/relationship-service";
import { createRelationshipSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = createRelationshipSchema.parse(await readJson(request));
    return created({ relationship: await createRelationship(input) });
  } catch (error) {
    return apiError(error);
  }
}

