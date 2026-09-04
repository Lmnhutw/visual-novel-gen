import { generateText } from "@/lib/ai/provider";
import { getModelConfig } from "@/lib/ai/model-config";
import { checkContinuity } from "@/lib/continuity/continuity-service";
import { toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { createMemory } from "@/lib/memory/memory-service";
import { extractMemoriesFromDraft } from "@/lib/memory/memory-extractor";
import { buildGenerationPrompt } from "@/lib/prompts/prompt-builder";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { resolveNarrativeFocus } from "@/lib/generation/narrative-focus";
import { getDefaultWritingHarness } from "@/lib/writing-harness/config";
import {
  canAttemptWritingHarnessRepair,
  combineGenerationUsage,
  createWritingHarnessAudit,
  enforceWritingHarness,
} from "@/lib/writing-harness/evaluation";
import { GENERATION_PROMPT_VERSION } from "@/lib/writing-harness/prompt";

export type GenerateSceneInput = {
  storyId: string;
  chapterId?: string;
  goal: string;
  sceneGoal?: string;
  povCharacterId?: string;
  activeCharacterIds?: string[];
  maturityMode?: "safe" | "mature";
  maxTokens?: number;
  previewOnly?: boolean;
  mode?: "scene" | "chapter";
};

export async function generateScene(input: GenerateSceneInput) {
  const resolved = await resolveNarrativeFocus(input);
  const modelConfig = getModelConfig();
  const generationModel = modelConfig.freeGenerationModel;
  const context = await retrieveContext({
    storyId: resolved.storyId,
    query: resolved.goal,
    activeCharacterIds: resolved.activeCharacterIds,
    includeSecrets: true,
  });

  const prompt = buildGenerationPrompt({
    context,
    goal: resolved.goal,
    sceneGoal: resolved.sceneGoal,
    mode: resolved.mode ?? "scene",
    povCharacterId: resolved.povCharacterId,
    maturityMode: resolved.maturityMode,
  });
  const harness = context.settings?.writingHarness ?? getDefaultWritingHarness();

  if (input.previewOnly) {
    return {
      generationRunId: null,
      draft: null,
      prompt,
      contextPreview: context,
      writingHarness: {
        schemaVersion: harness.version,
        promptVersion: GENERATION_PROMPT_VERSION,
        effectiveHarness: harness,
      },
      continuityWarnings: [],
    };
  }

  const run = await prisma.generationRun.create({
    data: {
      storyId: resolved.storyId,
      type: resolved.mode ?? "scene",
      status: "RUNNING",
      input: toJsonString({
        ...resolved,
        writingHarness: {
          schemaVersion: harness.version,
          promptVersion: GENERATION_PROMPT_VERSION,
          effectiveHarness: harness,
        },
      }),
      prompt,
      model: generationModel,
    },
  });

  try {
    const generation = await generateText(prompt, {
      model: generationModel,
      maxTokens: input.maxTokens ?? modelConfig.generationDefaults.maxTokens,
    });
    const harnessOutcome = await enforceWritingHarness({
      draft: generation.text,
      harness,
      repair: canAttemptWritingHarnessRepair(harness, {
        usesPaidModel: generationModel !== modelConfig.freeGenerationModel,
        paidApproved: false,
      })
        ? (repairPrompt) =>
            generateText(repairPrompt, {
              model: generationModel,
              maxTokens:
                input.maxTokens ?? modelConfig.generationDefaults.maxTokens,
              retries: 0,
            })
        : undefined,
    });
    const draft = harnessOutcome.content;
    const writingHarness = createWritingHarnessAudit(harness, harnessOutcome);
    const usage = combineGenerationUsage(
      generation.usage,
      harnessOutcome.repairUsage,
    );

    const continuityWarnings = await checkContinuity({
      storyId: resolved.storyId,
      context,
      draft,
      chapterId: resolved.chapterId,
      generationRunId: run.id,
      maturityMode: resolved.maturityMode,
    });

    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        output: draft,
        status: "SUCCEEDED",
        input: toJsonString({ ...resolved, writingHarness }),
        model: generation.model,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens,
      },
    });

    try {
      const extraction = await extractMemoriesFromDraft({
        draft,
        contextSummary: JSON.stringify({
          story: context.story,
          characters: context.characters.map((character) => character.name),
        }),
      });

      for (const memory of extraction.memories.slice(0, 12)) {
        await createMemory({
          storyId: resolved.storyId,
          sourceType: "generation_run",
          sourceId: run.id,
          memoryType: memory.memoryType,
          content: memory.content,
          salience: memory.salience,
          emotionalWeight: memory.emotionalWeight,
          entities: memory.entities,
        });
      }
    } catch {
      // Extraction failures should not discard a usable draft.
    }

    return {
      generationRunId: run.id,
      draft,
      prompt,
      contextPreview: context,
      writingHarness,
      continuityWarnings,
    };
  } catch (error) {
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error:
          error instanceof Error ? error.message : "Unknown generation error",
      },
    });

    throw error;
  }
}

export async function generateChapter(input: GenerateSceneInput) {
  return generateScene({
    ...input,
    mode: "chapter",
    sceneGoal: input.sceneGoal ?? "Full chapter draft",
  });
}

export async function reviseDraft(
  input: GenerateSceneInput & { previousDraft: string },
) {
  const modelConfig = getModelConfig();
  const generationModel = modelConfig.generationModel;
  const context = await retrieveContext({
    storyId: input.storyId,
    query: input.goal,
    activeCharacterIds: input.activeCharacterIds,
    includeSecrets: true,
  });

  const prompt = buildGenerationPrompt({
    context,
    goal: input.goal,
    mode: "revision",
    previousDraft: input.previousDraft,
    maturityMode: input.maturityMode,
  });
  const harness = context.settings?.writingHarness ?? getDefaultWritingHarness();
  const run = await prisma.generationRun.create({
    data: {
      storyId: input.storyId,
      type: "revision",
      status: "RUNNING",
      input: toJsonString({
        ...input,
        writingHarness: {
          schemaVersion: harness.version,
          promptVersion: GENERATION_PROMPT_VERSION,
          effectiveHarness: harness,
        },
      }),
      prompt,
      model: generationModel,
    },
  });

  try {
    const generation = await generateText(prompt, { model: generationModel });
    const harnessOutcome = await enforceWritingHarness({
      draft: generation.text,
      harness,
      repair: canAttemptWritingHarnessRepair(harness, {
        usesPaidModel: generationModel !== modelConfig.freeGenerationModel,
        paidApproved: false,
      })
        ? (repairPrompt) =>
            generateText(repairPrompt, {
              model: generationModel,
              maxTokens: input.maxTokens ?? modelConfig.generationDefaults.maxTokens,
              retries: 0,
            })
        : undefined,
    });
    const draft = harnessOutcome.content;
    const writingHarness = createWritingHarnessAudit(harness, harnessOutcome);
    const usage = combineGenerationUsage(
      generation.usage,
      harnessOutcome.repairUsage,
    );
    const continuityWarnings = await checkContinuity({
      storyId: input.storyId,
      context,
      draft,
      chapterId: input.chapterId,
      generationRunId: run.id,
      maturityMode: input.maturityMode,
    });

    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCEEDED",
        input: toJsonString({ ...input, writingHarness }),
        output: draft,
        model: generation.model,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens,
      },
    });

    return {
      generationRunId: run.id,
      draft,
      prompt,
      contextPreview: context,
      writingHarness,
      continuityWarnings,
    };
  } catch (error) {
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown generation error",
      },
    });
    throw error;
  }
}
