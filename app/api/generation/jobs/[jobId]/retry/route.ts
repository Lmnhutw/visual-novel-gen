import {
  getGenerationJob,
  retryGenerationJob,
} from "@/lib/generation/generation-job-service";
import { apiError, ok } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";

type Context = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { jobId } = await context.params;
    const job = await getGenerationJob(jobId);
    await assertStoryOwnership(job.storyId, await getRequestActor(request));
    return ok({ job: await retryGenerationJob(jobId) });
  } catch (error) {
    return apiError(error);
  }
}
