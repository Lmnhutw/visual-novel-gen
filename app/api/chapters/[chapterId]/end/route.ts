import { completeChapterAndStartNext } from "@/lib/chapters/chapter-service";
import { apiError, ok } from "@/lib/http/api-response";
import { assertChapterOwnership, getRequestActor } from "@/lib/security/ownership";
import { endChapterSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ chapterId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { chapterId } = await context.params;
    await assertChapterOwnership(chapterId, await getRequestActor(request));
    const body = await request.text();
    const input = endChapterSchema.parse(body ? JSON.parse(body) : {});
    return ok(await completeChapterAndStartNext(chapterId, input));
  } catch (error) {
    return apiError(error);
  }
}
