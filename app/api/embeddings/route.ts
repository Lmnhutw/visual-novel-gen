import { apiError, ok, readJson } from "@/lib/http/api-response";
import { generateEmbeddingForText } from "@/lib/memory/memory-service";
import { generateEmbeddingSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = generateEmbeddingSchema.parse(await readJson(request));
    return ok({ embedding: await generateEmbeddingForText(input) });
  } catch (error) {
    return apiError(error);
  }
}

