import { apiError, ok } from "@/lib/http/api-response";
import { searchMemories } from "@/lib/memory/memory-service";
import { searchMemoriesSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const memoryTypes = url.searchParams.get("memoryTypes");
    const input = searchMemoriesSchema.parse({
      storyId: url.searchParams.get("storyId"),
      query: url.searchParams.get("query") ?? undefined,
      memoryTypes: memoryTypes ? memoryTypes.split(",") : undefined,
      threshold: url.searchParams.get("threshold")
        ? Number(url.searchParams.get("threshold"))
        : undefined,
      limit: url.searchParams.get("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
    });

    return ok({ memories: await searchMemories(input) });
  } catch (error) {
    return apiError(error);
  }
}

