import { apiError, ok, readJson } from "@/lib/http/api-response";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { retrieveContextSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = retrieveContextSchema.parse(await readJson(request));
    return ok({ context: await retrieveContext(input) });
  } catch (error) {
    return apiError(error);
  }
}

