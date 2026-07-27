import {
  getCanonChangeProposal,
  reviewCanonChangeProposal,
} from "@/lib/generation/generation-job-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { assertStoryOwnership, getRequestActor } from "@/lib/security/ownership";
import { reviewCanonChangeProposalSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ proposalId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { proposalId } = await context.params;
    const { decision } = reviewCanonChangeProposalSchema.parse(await readJson(request));
    const proposal = await getCanonChangeProposal(proposalId);
    await assertStoryOwnership(proposal.storyId, await getRequestActor(request));
    return ok({ proposal: await reviewCanonChangeProposal(proposalId, decision) });
  } catch (error) {
    return apiError(error);
  }
}
