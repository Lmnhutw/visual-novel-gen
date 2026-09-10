import { getModelConfig } from "@/lib/ai/model-config";
import { ensureActiveChapter } from "@/lib/chapters/chapter-service";
import { toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import {
  executePreparedGenerationPipeline,
  prepareGenerationPipeline,
  type GenerationPipelineInput,
} from "@/lib/generation/generation-pipeline";
import { resolveNarrativeFocus } from "@/lib/generation/narrative-focus";
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
  chapterMode?: "auto" | "normal" | "closing";
};

async function prepareDirectGeneration(
  input: GenerateSceneInput & { previousDraft?: string },
  mode: GenerationPipelineInput["mode"],
) {
  const resolved = await resolveNarrativeFocus(input);
  const modelConfig = getModelConfig();
  const chapter = input.previewOnly
    ? null
    : await ensureActiveChapter(resolved.storyId, resolved.chapterId);
  return prepareGenerationPipeline({
    ...resolved,
    chapterId: chapter?.id ?? resolved.chapterId,
    mode,
    previousDraft: input.previousDraft,
    model: modelConfig.freeGenerationModel,
    freeModel: modelConfig.freeGenerationModel,
    maxTokens: input.maxTokens ?? modelConfig.generationDefaults.maxTokens,
    repairPolicy: "free-only",
    chapterMode: input.chapterMode,
  });
}

async function runDirectGeneration(
  input: GenerateSceneInput & { previousDraft?: string },
  mode: GenerationPipelineInput["mode"],
) {
  const prepared = await prepareDirectGeneration(input, mode);
  const { harness } = prepared;

  if (input.previewOnly) {
    return {
      generationRunId: null,
      draft: null,
      prompt: prepared.prompt,
      contextPreview: prepared.context,
      writingHarness: {
        schemaVersion: harness.version,
        promptVersion: GENERATION_PROMPT_VERSION,
        effectiveHarness: harness,
      },
      continuityWarnings: [],
      evaluation: null,
    };
  }

  const run = await prisma.generationRun.create({
    data: {
      storyId: prepared.input.storyId,
      type: mode,
      status: "RUNNING",
      input: toJsonString({
        ...prepared.input,
        writingHarness: {
          schemaVersion: harness.version,
          promptVersion: GENERATION_PROMPT_VERSION,
          effectiveHarness: harness,
        },
      }),
      prompt: prepared.prompt,
      model: prepared.input.model,
    },
  });

  try {
    const result = await executePreparedGenerationPipeline(prepared, {
      generationRunId: run.id,
    });
    await prisma.$transaction(async (tx) => {
      if (result.continuity.length) {
        await tx.continuityIssue.createMany({
          data: result.continuity.map((warning) => ({
            storyId: prepared.input.storyId,
            chapterId: prepared.input.chapterId,
            generationRunId: run.id,
            severity: warning.severity,
            category: warning.category,
            description: warning.description,
            evidence: toJsonString(warning.evidence),
            confidence: warning.confidence,
          })),
        });
      }
      await tx.generationRun.update({
        where: { id: run.id },
        data: {
          output: result.draft,
          status: "SUCCEEDED",
          input: toJsonString({
            ...prepared.input,
            effectiveMaxTokens: result.effectiveMaxTokens,
            writingHarness: result.writingHarness,
          }),
          model: result.generation.model,
          promptTokens: result.usage?.promptTokens,
          completionTokens: result.usage?.completionTokens,
          totalTokens: result.usage?.totalTokens,
        },
      });
    });

    return {
      generationRunId: run.id,
      draft: result.draft,
      prompt: result.prompt,
      contextPreview: result.context,
      writingHarness: result.writingHarness,
      continuityWarnings: result.continuity,
      evaluation: result.evaluation,
      extractionCandidates: result.extraction,
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

export async function generateScene(input: GenerateSceneInput) {
  return runDirectGeneration(input, input.mode ?? "scene");
}

export async function generateChapter(input: GenerateSceneInput) {
  return runDirectGeneration(
    { ...input, sceneGoal: input.sceneGoal ?? "Full chapter draft" },
    "chapter",
  );
}

export async function reviseDraft(
  input: GenerateSceneInput & { previousDraft: string },
) {
  return runDirectGeneration(input, "revision");
}
