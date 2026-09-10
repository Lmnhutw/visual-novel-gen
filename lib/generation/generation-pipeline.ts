import type { GenerateTextResult } from "@/lib/ai/types";
import { generateText } from "@/lib/ai/provider";
import { checkContinuity } from "@/lib/continuity/continuity-service";
import { evaluateDraft } from "@/lib/evaluation/generation-evaluator";
import {
  extractMemoriesFromDraft,
  type MemoryExtractionResult,
} from "@/lib/memory/memory-extractor";
import {
  buildGenerationPrompt,
  resolveChapterGenerationMode,
} from "@/lib/prompts/prompt-builder";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { WorkflowError } from "@/lib/http/api-response";
import type { ChapterGenerationMode } from "@/lib/chapters/chapter-lifecycle";
import { getDefaultWritingHarness } from "@/lib/writing-harness/config";
import {
  combineGenerationUsage,
  createWritingHarnessAudit,
  enforceWritingHarness,
} from "@/lib/writing-harness/evaluation";

export type RepairPolicy = "free-only" | "explicit-paid";

export type GenerationPipelineInput = {
  storyId: string;
  chapterId?: string;
  goal: string;
  sceneGoal?: string;
  povCharacterId?: string;
  activeCharacterIds?: string[];
  maturityMode?: "safe" | "mature";
  mode: "scene" | "chapter" | "revision";
  previousDraft?: string;
  includeSecrets?: boolean;
  contextTokenBudget?: number;
  model: string;
  freeModel: string;
  maxTokens: number;
  repairPolicy: RepairPolicy;
  chapterMode?: "auto" | "normal" | "closing";
};

export type GenerationPipelineStage =
  | "generating"
  | "validating_harness"
  | "repairing_harness"
  | "checking_continuity"
  | "extracting_proposals";

export type PreparedGenerationPipeline = {
  input: GenerationPipelineInput;
  context: Awaited<ReturnType<typeof retrieveContext>>;
  prompt: string;
  harness: ReturnType<typeof getDefaultWritingHarness>;
  effectiveChapterMode?: ChapterGenerationMode;
};

const MIN_GENERATION_OUTPUT_TOKENS = 128;
const TOKENS_PER_REMAINING_WORD = 2.5;

function effectiveGenerationMaxTokens(
  input: GenerationPipelineInput,
  context: PreparedGenerationPipeline["context"],
) {
  const remainingWords = context.chapter?.progress.remainingToHardLimit;
  if (input.mode === "revision" || remainingWords === undefined) {
    return input.maxTokens;
  }
  return Math.min(
    input.maxTokens,
    Math.max(
      MIN_GENERATION_OUTPUT_TOKENS,
      Math.ceil(remainingWords * TOKENS_PER_REMAINING_WORD),
    ),
  );
}

type Generate = (
  prompt: string,
  options: { model: string; maxTokens: number; retries?: number },
) => Promise<GenerateTextResult>;

function repairAllowed(input: GenerationPipelineInput) {
  if (input.model === input.freeModel) return true;
  return input.repairPolicy === "explicit-paid";
}

export async function prepareGenerationPipeline(
  input: GenerationPipelineInput,
): Promise<PreparedGenerationPipeline> {
  const context = await retrieveContext({
    storyId: input.storyId,
    query: input.goal,
    activeCharacterIds: input.activeCharacterIds,
    includeSecrets: input.includeSecrets ?? true,
    tokenBudget: input.contextTokenBudget,
    chapterId: input.chapterId,
  });
  const prompt = buildGenerationPrompt({
    context,
    goal: input.goal,
    sceneGoal: input.sceneGoal,
    mode: input.mode,
    povCharacterId: input.povCharacterId,
    maturityMode: input.maturityMode,
    previousDraft: input.previousDraft,
    chapterMode: input.chapterMode,
  });
  return {
    input,
    context,
    prompt,
    harness: context.settings?.writingHarness ?? getDefaultWritingHarness(),
    effectiveChapterMode: resolveChapterGenerationMode(
      context,
      input.chapterMode,
    ),
  };
}

export async function executePreparedGenerationPipeline(
  prepared: PreparedGenerationPipeline,
  options: {
    generationRunId?: string;
    generate?: Generate;
    checkpoint?: (stage: GenerationPipelineStage) => Promise<void>;
    check?: typeof checkContinuity;
    extract?: typeof extractMemoriesFromDraft;
  } = {},
) {
  const { input, context, prompt, harness } = prepared;
  const run = options.generate ?? ((text, generationOptions) => generateText(text, generationOptions));
  const checkpoint = options.checkpoint ?? (async () => undefined);
  const runContinuity = options.check ?? checkContinuity;
  const extract = options.extract ?? extractMemoriesFromDraft;
  const remainingWords = context.chapter?.progress.remainingToHardLimit;
  if (input.mode !== "revision" && remainingWords === 0) {
    throw new WorkflowError(
      "CHAPTER_HARD_LIMIT_REACHED",
      "This chapter has reached its hard word limit. End the chapter before generating more prose.",
      409,
      {
        chapterId: context.chapter?.id,
        currentWords: context.chapter?.wordCount,
        hardLimitWords: context.chapter?.progress.hardLimitWords,
      },
    );
  }
  const maxTokens = effectiveGenerationMaxTokens(input, context);

  await checkpoint("generating");
  const generation = await run(prompt, {
    model: input.model,
    maxTokens,
  });

  await checkpoint("validating_harness");
  const harnessOutcome = await enforceWritingHarness({
    draft: generation.text,
    harness,
    repair:
      harness.enabled && harness.repairOnViolation && repairAllowed(input)
        ? async (repairPrompt) => {
            await checkpoint("repairing_harness");
            return run(repairPrompt, {
              model: input.model,
              maxTokens,
              retries: 0,
            });
          }
        : undefined,
  });
  const draft = harnessOutcome.content;
  const writingHarness = createWritingHarnessAudit(harness, harnessOutcome);
  const usage = combineGenerationUsage(
    generation.usage,
    harnessOutcome.repairUsage,
  );

  await checkpoint("checking_continuity");
  const continuity = await runContinuity({
    storyId: input.storyId,
    context,
    draft,
    chapterId: input.chapterId,
    generationRunId: options.generationRunId,
    maturityMode: input.maturityMode,
    persist: false,
  });
  const evaluation = evaluateDraft(continuity);

  await checkpoint("extracting_proposals");
  let extraction: MemoryExtractionResult | null = null;
  let extractionError: string | null = null;
  try {
    extraction = await extract({
      draft,
      contextSummary: JSON.stringify({
        story: context.story,
        characters: context.characters,
      }),
    });
  } catch (error) {
    extractionError =
      error instanceof Error ? error.message : "Memory extraction failed.";
  }

  return {
    draft,
    generation,
    usage,
    prompt,
    context,
    harnessOutcome,
    writingHarness,
    continuity,
    evaluation,
    extraction,
    extractionError,
    effectiveMaxTokens: maxTokens,
  };
}

export async function runGenerationPipeline(
  input: GenerationPipelineInput,
  options: Parameters<typeof executePreparedGenerationPipeline>[1] = {},
) {
  return executePreparedGenerationPipeline(
    await prepareGenerationPipeline(input),
    options,
  );
}
