import { createChapter, listChapters } from "@/lib/chapters/chapter-service";
import { apiError, created, ok, readJson } from "@/lib/http/api-response";
import { createChapterSchema, uuidSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const storyId = uuidSchema.parse(url.searchParams.get("storyId"));
    return ok({ chapters: await listChapters(storyId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createChapterSchema.parse(await readJson(request));
    return created({ chapter: await createChapter(input) });
  } catch (error) {
    return apiError(error);
  }
}
