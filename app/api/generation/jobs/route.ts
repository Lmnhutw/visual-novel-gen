import {
  createGenerationJob,
  listGenerationJobs,
} from "@/lib/generation/generation-job-service";
import { apiError, created, ok, readJson } from "@/lib/http/api-response";
import { createGenerationJobSchema, uuidSchema } from "@/lib/validation/schemas";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";

export async function GET(request: Request) {
  try {
    const storyId = uuidSchema.parse(new URL(request.url).searchParams.get("storyId"));
    await assertStoryOwnership(storyId, await getRequestActor(request));
    return ok({ jobs: await listGenerationJobs(storyId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createGenerationJobSchema.parse(await readJson(request));
    await assertStoryOwnership(input.storyId, await getRequestActor(request));
    const result = await createGenerationJob(input);
    return created(result);
  } catch (error) {
    return apiError(error);
  }
}
