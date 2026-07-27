import { apiError, ok, readJson } from "@/lib/http/api-response";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { retrieveContextSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = retrieveContextSchema.parse(await readJson(request));
    await assertStoryOwnership(input.storyId, await getRequestActor(request));
    return ok({ context: await retrieveContext(input) });
  } catch (error) {
    return apiError(error);
  }
}

