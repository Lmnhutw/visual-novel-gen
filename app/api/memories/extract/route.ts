import { createMemory } from "@/lib/memory/memory-service";
import { extractMemoriesFromDraft } from "@/lib/memory/memory-extractor";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { extractMemoriesSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = extractMemoriesSchema.parse(await readJson(request));
    const extraction = await extractMemoriesFromDraft({
      draft: input.draft,
      contextSummary: input.contextSummary,
    });

    if (input.persist) {
      for (const memory of extraction.memories) {
        await createMemory({
          storyId: input.storyId,
          sourceType: "manual_extraction",
          memoryType: memory.memoryType,
          content: memory.content,
          salience: memory.salience,
          emotionalWeight: memory.emotionalWeight,
          entities: memory.entities,
        });
      }
    }

    return ok({ extraction });
  } catch (error) {
    return apiError(error);
  }
}
