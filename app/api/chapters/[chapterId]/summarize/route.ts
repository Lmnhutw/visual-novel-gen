import { summarizeChapter } from "@/lib/chapters/chapter-service";
import { apiError, ok } from "@/lib/http/api-response";
import { assertChapterOwnership, getRequestActor } from "@/lib/security/ownership";

type Context = {
  params: Promise<{ chapterId: string }>;
};

export async function POST(request: Request, context: Context) {
  try {
    const { chapterId } = await context.params;
    await assertChapterOwnership(chapterId, await getRequestActor(request));
    return ok({ chapter: await summarizeChapter(chapterId) });
  } catch (error) {
    return apiError(error);
  }
}

