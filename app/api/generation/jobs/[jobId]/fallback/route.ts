import { decideFallback, getGenerationJob } from "@/lib/generation/generation-job-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { fallbackDecisionSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { jobId } = await context.params;
    const job = await getGenerationJob(jobId);
    await assertStoryOwnership(job.storyId, await getRequestActor(request));
    const { decision } = fallbackDecisionSchema.parse(await readJson(request));
    return ok({ job: await decideFallback(jobId, decision) });
  } catch (error) {
    return apiError(error);
  }
}
