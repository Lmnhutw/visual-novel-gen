import { updateDraftVersion } from "@/lib/generation/generation-job-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertDraftVersionOwnership, getRequestActor } from "@/lib/security/ownership";
import { z } from "zod";

const updateDraftVersionSchema = z.object({
  content: z.string().min(1),
  title: z.string().min(1).max(160).optional(),
});

type Context = { params: Promise<{ draftVersionId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { draftVersionId } = await context.params;
    await assertDraftVersionOwnership(draftVersionId, await getRequestActor(request));
    const input = updateDraftVersionSchema.parse(await readJson(request));
    return ok({ draft: await updateDraftVersion(draftVersionId, input) });
  } catch (error) {
    return apiError(error);
  }
}
