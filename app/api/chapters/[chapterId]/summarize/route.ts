import { summarizeChapter } from "@/lib/chapters/chapter-service";
import { apiError, ok } from "@/lib/http/api-response";

type Context = {
  params: Promise<{ chapterId: string }>;
};

export async function POST(_request: Request, context: Context) {
  try {
    const { chapterId } = await context.params;
    return ok({ chapter: await summarizeChapter(chapterId) });
  } catch (error) {
    return apiError(error);
  }
}

