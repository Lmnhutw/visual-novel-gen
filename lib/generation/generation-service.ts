import { generateText } from "@/lib/ai/provider";
import { getModelConfig } from "@/lib/ai/model-config";
import { checkContinuity } from "@/lib/continuity/continuity-service";
import { toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { createMemory } from "@/lib/memory/memory-service";
import { extractMemoriesFromDraft } from "@/lib/memory/memory-extractor";
import { buildGenerationPrompt } from "@/lib/prompts/prompt-builder";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";

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
  const modelConfig = getModelConfig();
  const context = await retrieveContext({
    storyId: input.storyId,
    query: input.goal,
    activeCharacterIds: input.activeCharacterIds,
    includeSecrets: true,
  });

  const prompt = buildGenerationPrompt({
    context,
    goal: input.goal,
    sceneGoal: input.sceneGoal,
    mode: input.mode ?? "scene",
    povCharacterId: input.povCharacterId,
    maturityMode: input.maturityMode,
  });

  if (input.previewOnly) {
    return {
      generationRunId: null,
      draft: null,
      prompt,
      contextPreview: context,
      continuityWarnings: [],
    };
  }

  const run = await prisma.generationRun.create({
    data: {
      storyId: input.storyId,
      type: input.mode ?? "scene",
      status: "RUNNING",
      input: toJsonString(input),
      prompt,
      model: modelConfig.generationModel,
    },
  });

  try {
    const generation = await generateText(prompt, {
      model: modelConfig.generationModel,
      maxTokens: input.maxTokens ?? modelConfig.generationDefaults.maxTokens,
    });
    const draft = generation.text;

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
        output: draft,
        status: "SUCCEEDED",
        model: generation.model,
        promptTokens: generation.usage?.promptTokens,
        completionTokens: generation.usage?.completionTokens,
        totalTokens: generation.usage?.totalTokens,
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
          storyId: input.storyId,
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

  const generation = await generateText(prompt);
  const draft = generation.text;
  const continuityWarnings = await checkContinuity({
    storyId: input.storyId,
    context,
    draft,
    chapterId: input.chapterId,
    maturityMode: input.maturityMode,
  });

  return {
    draft,
    prompt,
    contextPreview: context,
    continuityWarnings,
  };
}
