import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { generateEmbeddingForText } from "@/lib/memory/memory-service";
import { generateEmbeddingSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = generateEmbeddingSchema.parse(await readJson(request));
    await assertStoryOwnership(input.storyId, await getRequestActor(request));
    return ok({ embedding: await generateEmbeddingForText(input) });
  } catch (error) {
    return apiError(error);
  }
}

