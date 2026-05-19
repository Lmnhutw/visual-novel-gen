import { checkContinuity } from "@/lib/continuity/continuity-service";
import { apiError, ok, readJson } from "@/lib/http/api-response";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { checkContinuitySchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  try {
    const input = checkContinuitySchema.parse(await readJson(request));
    const context = await retrieveContext({
      storyId: input.storyId,
      query: input.query ?? input.draft.slice(0, 500),
      activeCharacterIds: input.activeCharacterIds,
      includeSecrets: true,
    });

    return ok({
      issues: await checkContinuity({
        storyId: input.storyId,
        context,
        draft: input.draft,
        sceneId: input.sceneId,
        chapterId: input.chapterId,
        generationRunId: input.generationRunId,
        maturityMode: input.maturityMode,
        useLlm: input.useLlm,
        persist: input.persist,
      }),
    });
  } catch (error) {
    return apiError(error);
  }
}

