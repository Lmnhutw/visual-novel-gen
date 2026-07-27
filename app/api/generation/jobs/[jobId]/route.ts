import { getGenerationJob } from "@/lib/generation/generation-job-service";
import { apiError, ok } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";

type Context = { params: Promise<{ jobId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { jobId } = await context.params;
    const job = await getGenerationJob(jobId);
    await assertStoryOwnership(job.storyId, await getRequestActor(_request));
    return ok({ job });
  } catch (error) {
    return apiError(error);
  }
}
