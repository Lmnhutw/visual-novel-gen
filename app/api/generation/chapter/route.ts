import { generateChapter } from "@/lib/generation/generation-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { generateSceneSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = generateSceneSchema.parse(await readJson(request));
    return ok(await generateChapter(input));
  } catch (error) {
    return apiError(error);
  }
}

