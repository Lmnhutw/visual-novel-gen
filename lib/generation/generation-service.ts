import { GenerationStatus } from "@prisma/client";

import { generateText } from "@/lib/ai/ollama-client";
import { getModelConfig } from "@/lib/ai/model-config";
import { checkContinuity } from "@/lib/continuity/continuity-service";
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
      status: GenerationStatus.RUNNING,
      input: JSON.parse(JSON.stringify(input)),
      prompt,
      model: modelConfig.generationModel,
    },
  });

  try {
    const draft = await generateText(prompt, {
      model: modelConfig.generationModel,
      contextTokens: modelConfig.generationDefaults.contextTokens,
    });

    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        output: draft,
        status: GenerationStatus.SUCCEEDED,
      },
    });

    const continuityWarnings = await checkContinuity({
      storyId: input.storyId,
      context,
      draft,
      chapterId: input.chapterId,
      generationRunId: run.id,
      maturityMode: input.maturityMode,
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
          generateEmbedding: true,
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
        status: GenerationStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown generation error",
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

export async function reviseDraft(input: GenerateSceneInput & { previousDraft: string }) {
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

  const draft = await generateText(prompt);
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
