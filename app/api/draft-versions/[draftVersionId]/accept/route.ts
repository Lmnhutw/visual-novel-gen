import { acceptDraftVersion } from "@/lib/generation/generation-job-service";
import { apiError, ok } from "@/lib/http/api-response";
import { assertDraftVersionOwnership, getRequestActor } from "@/lib/security/ownership";
import { commitDraftSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ draftVersionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { draftVersionId } = await context.params;
    await assertDraftVersionOwnership(draftVersionId, await getRequestActor(request));
    const body = await request.text();
    const input = commitDraftSchema.parse(body ? JSON.parse(body) : {});
    return ok(await acceptDraftVersion(draftVersionId, input));
  } catch (error) {
    return apiError(error);
  }
}
