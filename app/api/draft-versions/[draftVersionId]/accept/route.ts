import { acceptDraftVersion } from "@/lib/generation/generation-job-service";
import { apiError, ok } from "@/lib/http/api-response";
import { assertDraftVersionOwnership, getRequestActor } from "@/lib/security/ownership";

type Context = { params: Promise<{ draftVersionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { draftVersionId } = await context.params;
    await assertDraftVersionOwnership(draftVersionId, await getRequestActor(request));
    return ok({ draft: await acceptDraftVersion(draftVersionId) });
  } catch (error) {
    return apiError(error);
  }
}
