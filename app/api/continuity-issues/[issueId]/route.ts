import {
  getContinuityIssue,
  reviewContinuityIssue,
} from "@/lib/continuity/continuity-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { reviewContinuityIssueSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ issueId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { issueId } = await context.params;
    const { decision } = reviewContinuityIssueSchema.parse(await readJson(request));
    const issue = await getContinuityIssue(issueId);
    await assertStoryOwnership(issue.storyId, await getRequestActor(request));
    return ok({ issue: await reviewContinuityIssue(issueId, decision) });
  } catch (error) {
    return apiError(error);
  }
}
