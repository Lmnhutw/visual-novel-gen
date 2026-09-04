import { Prisma } from "@prisma/client";

import { getModelConfig } from "@/lib/ai/model-config";
import { OpenRouterRequestError } from "@/lib/ai/openrouter";
import { generateText } from "@/lib/ai/provider";
import { checkContinuity } from "@/lib/continuity/continuity-service";
import { parseJsonString, toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { evaluateDraft } from "@/lib/evaluation/generation-evaluator";
import { WorkflowError } from "@/lib/http/api-response";
import {
  isRetryableGenerationStatus,
  isTerminalGenerationStatus,
} from "@/lib/generation/job-state";
import {
  extractMemoriesFromDraft,
  type MemoryExtractionResult,
} from "@/lib/memory/memory-extractor";
import { buildGenerationPrompt } from "@/lib/prompts/prompt-builder";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";
import { resolveNarrativeFocus } from "@/lib/generation/narrative-focus";

export type GenerationJobInput = {
  storyId: string;
  chapterId?: string;
  goal: string;
  sceneGoal?: string;
  povCharacterId?: string;
  activeCharacterIds?: string[];
  maturityMode?: "safe" | "mature";
  maxTokens?: number;
  includeSecrets?: boolean;
  contextTokenBudget?: number;
  idempotencyKey?: string;
  type?: "scene" | "chapter" | "revision";
  primaryProtagonistIdUsed?: string;
};

function proposalTitle(type: string, value: Record<string, unknown>) {
  if (type === "memory") {
    return typeof value.content === "string"
      ? value.content.slice(0, 96)
      : "New memory";
  }

  if (type === "event") {
    return typeof value.summary === "string"
      ? value.summary.slice(0, 96)
      : "New timeline event";
  }

  return `Review ${type.replaceAll("_", " ")}`;
}

async function assertPreflight(input: GenerationJobInput) {
  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    include: { settings: true },
  });

  if (!story) {
    throw new WorkflowError("STORY_NOT_FOUND", "Story not found.", 404);
  }

  if (input.chapterId) {
    const chapter = await prisma.chapter.findFirst({
      where: { id: input.chapterId, storyId: input.storyId },
      select: { id: true },
    });
    if (!chapter) {
      throw new WorkflowError(
        "CHAPTER_NOT_FOUND",
        "Chapter does not belong to this story.",
        404,
      );
    }
  }

  const activeIds = input.activeCharacterIds ?? [];
  if (input.maturityMode === "mature" && activeIds.length === 0) {
    throw new WorkflowError(
      "ACTIVE_CHARACTERS_REQUIRED",
      "Select every character participating in a mature scene before generation.",
      422,
    );
  }

  if (activeIds.length) {
    const activeCharacters = await prisma.character.findMany({
      where: { storyId: input.storyId, id: { in: activeIds } },
      select: { id: true, name: true, ageConfirmed: true },
    });

    if (activeCharacters.length !== new Set(activeIds).size) {
      throw new WorkflowError(
        "INVALID_CHARACTER_SCOPE",
        "Every selected character must belong to this story.",
        400,
      );
    }

    if (input.maturityMode === "mature") {
      const policy = parseJsonString<Record<string, unknown>>(
        story.settings?.nsfwPolicy,
        {},
      );
      if (policy.matureModeAllowed === false) {
        throw new WorkflowError(
          "MATURE_MODE_DISABLED",
          "This story does not allow mature generation.",
          422,
        );
      }

      const unconfirmed = activeCharacters.filter(
        (character) => !character.ageConfirmed,
      );
      if (unconfirmed.length) {
        throw new WorkflowError(
          "ADULT_CONFIRMATION_REQUIRED",
          "Mature generation requires every selected character to be confirmed as an adult.",
          422,
          { characters: unconfirmed.map((character) => character.name) },
        );
      }
    }
  }
}

async function ensureNotCancelled(jobId: string) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });

  if (!job) {
    throw new WorkflowError(
      "GENERATION_JOB_NOT_FOUND",
      "Generation job not found.",
      404,
    );
  }

  if (job.status === "CANCELLED") {
    throw new WorkflowError(
      "GENERATION_CANCELLED",
      "Generation was cancelled.",
      409,
    );
  }
}

async function setStage(
  jobId: string,
  stage: string,
  progress: number,
  data: Record<string, unknown> = {},
) {
  const updated = await prisma.generationJob.updateMany({
    where: { id: jobId, status: "RUNNING" },
    data: { stage, progress, ...data },
  });

  if (updated.count === 0) {
    await ensureNotCancelled(jobId);
    throw new WorkflowError(
      "INVALID_GENERATION_STATE",
      "Generation is no longer running.",
      409,
    );
  }
}

async function generateTextForJob(
  jobId: string,
  prompt: string,
  options: { model: string; maxTokens: number },
) {
  const controller = new AbortController();
  let pollInFlight = false;
  const pollCancellation = async () => {
    if (pollInFlight || controller.signal.aborted) return;
    pollInFlight = true;
    try {
      const job = await prisma.generationJob.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (job?.status === "CANCELLED") {
        controller.abort(
          new WorkflowError(
            "GENERATION_CANCELLED",
            "Generation was cancelled.",
            409,
          ),
        );
      }
    } catch {
      // Cancellation polling is best-effort; the normal stage guards still
      // prevent terminal jobs from being revived if a poll query fails.
    } finally {
      pollInFlight = false;
    }
  };
  const interval = setInterval(() => void pollCancellation(), 750);

  try {
    return await generateText(prompt, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearInterval(interval);
  }
}

function proposalsFromExtraction(extraction: MemoryExtractionResult) {
  return [
    ...extraction.memories.slice(0, 12).map((memory) => ({
      type: "memory",
      targetType: "memory",
      value: memory,
      confidence: 0.8,
      actionability: "AUTO_APPLY",
    })),
    ...extraction.events.map((event) => ({
      type: "event",
      targetType: "event",
      value: event,
      confidence: 0.76,
      actionability: "AUTO_APPLY",
    })),
    ...extraction.relationshipChanges.map((value) => ({
      type: "relationship_change",
      targetType: "relationship",
      value,
      confidence: 0.55,
      actionability: "MANUAL_REVIEW",
    })),
    ...extraction.characterStateChanges.map((value) => ({
      type: "character_state_change",
      targetType: "character_state",
      value,
      confidence: 0.55,
      actionability: "MANUAL_REVIEW",
    })),
    ...extraction.secretsRevealed.map((value) => ({
      type: "secret_reveal",
      targetType: "secret",
      value,
      confidence: 0.55,
      actionability: "MANUAL_REVIEW",
    })),
    ...extraction.loreUpdates.map((value) => ({
      type: "lore_update",
      targetType: "lore",
      value,
      confidence: 0.55,
      actionability: "MANUAL_REVIEW",
    })),
    ...extraction.unresolvedThreads.map((value) => ({
      type: "plot_thread",
      targetType: "plot_thread",
      value,
      confidence: 0.55,
      actionability: "MANUAL_REVIEW",
    })),
  ];
}

export async function createGenerationJob(input: GenerationJobInput) {
  const resolved = await resolveNarrativeFocus(input);
  await assertPreflight(resolved);

  if (resolved.idempotencyKey) {
    const existing = await prisma.generationJob.findFirst({
      where: { storyId: resolved.storyId, idempotencyKey: resolved.idempotencyKey },
    });
    if (existing) {
      return { job: existing, reused: true };
    }
  }

  let job;
  try {
    job = await prisma.generationJob.create({
      data: {
        storyId: resolved.storyId,
        chapterId: resolved.chapterId,
        type: resolved.type ?? "scene",
        idempotencyKey: resolved.idempotencyKey,
        input: toJsonString(resolved),
      },
    });
  } catch (error) {
    if (
      resolved.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.generationJob.findFirst({
        where: { storyId: resolved.storyId, idempotencyKey: resolved.idempotencyKey },
      });
      if (existing) {
        return { job: existing, reused: true };
      }
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      storyId: resolved.storyId,
      action: "generation.job.created",
      entityType: "generation_job",
      entityId: job.id,
      metadata: toJsonString({ type: job.type }),
    },
  });

  return { job, reused: false };
}

export async function getGenerationJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      generationRun: true,
      draftVersion: true,
      proposals: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!job) {
    throw new WorkflowError(
      "GENERATION_JOB_NOT_FOUND",
      "Generation job not found.",
      404,
    );
  }

  return job;
}

export async function listGenerationJobs(storyId: string) {
  return prisma.generationJob.findMany({
    where: { storyId },
    include: {
      draftVersion: true,
      proposals: { orderBy: { createdAt: "asc" } },
      generationRun: {
        select: {
          model: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
        },
      },
      _count: { select: { proposals: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function cancelGenerationJob(jobId: string) {
  const job = await getGenerationJob(jobId);
  if (isTerminalGenerationStatus(job.status)) {
    return job;
  }

  await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      status: { notIn: ["READY_FOR_REVIEW", "FAILED", "CANCELLED"] },
    },
    data: { status: "CANCELLED", stage: "CANCELLED", completedAt: new Date() },
  });
  return getGenerationJob(jobId);
}

export async function retryGenerationJob(jobId: string) {
  const job = await getGenerationJob(jobId);
  if (!isRetryableGenerationStatus(job.status)) {
    throw new WorkflowError(
      "GENERATION_NOT_RETRYABLE",
      "Only failed or cancelled generation jobs can be retried.",
      409,
    );
  }

  const retried = await prisma.$transaction(async (tx) => {
    const reset = await tx.generationJob.updateMany({
      where: { id: jobId, status: job.status },
      data: {
        status: "RETRYING",
        stage: "QUEUED",
        progress: 0,
        contextSnapshot: null,
        prompt: null,
        errorCode: null,
        error: null,
        generationRunId: null,
        draftVersionId: null,
        startedAt: null,
        completedAt: null,
        fallbackModel: null,
        fallbackExpiresAt: null,
      },
    });
    if (reset.count === 0) {
      throw new WorkflowError(
        "GENERATION_STATE_CHANGED",
        "Generation status changed before it could be retried.",
        409,
      );
    }

    await tx.auditLog.create({
      data: {
        storyId: job.storyId,
        action: "generation.job.retry_requested",
        entityType: "generation_job",
        entityId: jobId,
        metadata: toJsonString({
          previousStatus: job.status,
          attemptCount: job.attemptCount,
        }),
      },
    });
    return tx.generationJob.findUnique({ where: { id: jobId } });
  });

  if (!retried) {
    throw new WorkflowError(
      "GENERATION_JOB_NOT_FOUND",
      "Generation job not found.",
      404,
    );
  }
  return retried;
}

export async function executeGenerationJob(jobId: string) {
  const initialJob = await getGenerationJob(jobId);
  const modelConfig = getModelConfig();
  const paidAttempt =
    initialJob.status === "RETRYING" &&
    initialJob.stage === "FALLBACK_CONFIRMED" &&
    initialJob.fallbackModel === modelConfig.paidFallbackModel;
  const claim = await prisma.generationJob.updateMany({
    where: paidAttempt
      ? {
          id: jobId,
          status: "RETRYING",
          stage: "FALLBACK_CONFIRMED",
          fallbackModel: modelConfig.paidFallbackModel,
        }
      : {
          id: jobId,
          OR: [
            { status: "QUEUED" },
            { status: "RETRYING", stage: { not: "FALLBACK_CONFIRMED" } },
          ],
        },
    data: {
      status: "RUNNING",
      stage: "RETRIEVING_CONTEXT",
      progress: 8,
      startedAt: new Date(),
      attemptCount: { increment: 1 },
    },
  });

  if (claim.count === 0) {
    return getGenerationJob(jobId);
  }

  const job = await getGenerationJob(jobId);
  const input = parseJsonString<GenerationJobInput>(
    job.input,
    {} as GenerationJobInput,
  );
  const generationModel = paidAttempt
    ? modelConfig.paidFallbackModel
    : modelConfig.freeGenerationModel;

  try {
    await ensureNotCancelled(jobId);
    const context = await retrieveContext({
      storyId: input.storyId,
      query: input.goal,
      activeCharacterIds: input.activeCharacterIds,
      includeSecrets: input.includeSecrets ?? false,
      tokenBudget: input.contextTokenBudget,
    });
    await setStage(jobId, "BUILDING_PROMPT", 22, {
      contextSnapshot: toJsonString(context),
    });

    const prompt = buildGenerationPrompt({
      context,
      goal: input.goal,
      sceneGoal: input.sceneGoal,
      mode: input.type ?? "scene",
      povCharacterId: input.povCharacterId,
      maturityMode: input.maturityMode,
    });
    const run = await prisma.$transaction(async (tx) => {
      const createdRun = await tx.generationRun.create({
        data: {
          storyId: input.storyId,
          type: input.type ?? "scene",
          status: "RUNNING",
          input: toJsonString(input),
          prompt,
          model: generationModel,
        },
      });
      const staged = await tx.generationJob.updateMany({
        where: { id: jobId, status: "RUNNING" },
        data: {
          stage: "GENERATING",
          progress: 35,
          prompt,
          generationRunId: createdRun.id,
        },
      });
      if (staged.count === 0) {
        throw new WorkflowError(
          "GENERATION_CANCELLED",
          "Generation was cancelled.",
          409,
        );
      }
      return createdRun;
    });
    await prisma.retrievalLog.create({
      data: {
        storyId: input.storyId,
        generationRunId: run.id,
        query: input.goal,
        filters: toJsonString({
          activeCharacterIds: input.activeCharacterIds,
          primaryProtagonistIdUsed: input.primaryProtagonistIdUsed,
          includeSecrets: input.includeSecrets ?? false,
        }),
        results: toJsonString({
          budget: context.budget,
          characterIds: context.characters.map((character) => character.id),
          memoryIds: context.memories.map((memory) => memory.id),
        }),
      tokenBudget: context.budget?.maxTokens ?? input.contextTokenBudget ?? 0,
      },
    });

    await ensureNotCancelled(jobId);
    const generation = await generateTextForJob(jobId, prompt, {
      model: generationModel,
      maxTokens: input.maxTokens ?? modelConfig.generationDefaults.maxTokens,
    });
    const draft = generation.text;

    await ensureNotCancelled(jobId);
    await setStage(jobId, "SAVING_DRAFT", 62);
    const draftVersion = await prisma.$transaction(async (tx) => {
      const previous = await tx.draftVersion.aggregate({
        where: { storyId: input.storyId, chapterId: input.chapterId },
        _max: { versionNumber: true },
      });
      const persistedDraft = await tx.draftVersion.create({
        data: {
          storyId: input.storyId,
          chapterId: input.chapterId,
          generationRunId: run.id,
          versionNumber: (previous._max.versionNumber ?? 0) + 1,
          title: input.sceneGoal ?? input.goal.slice(0, 80),
          content: draft,
          metadata: toJsonString({ generationJobId: jobId }),
        },
      });
      await tx.generationRun.update({
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
      const staged = await tx.generationJob.updateMany({
        where: { id: jobId, status: "RUNNING" },
        data: {
          stage: "CHECKING_CONTINUITY",
          progress: 75,
          draftVersionId: persistedDraft.id,
        },
      });
      if (staged.count === 0) {
        throw new WorkflowError(
          "GENERATION_CANCELLED",
          "Generation was cancelled.",
          409,
        );
      }
      return persistedDraft;
    });

    await ensureNotCancelled(jobId);
    const continuityWarnings = await checkContinuity({
      storyId: input.storyId,
      context,
      draft,
      chapterId: input.chapterId,
      generationRunId: run.id,
      maturityMode: input.maturityMode,
      persist: false,
    });
    await ensureNotCancelled(jobId);
    await prisma.$transaction(async (tx) => {
      if (continuityWarnings.length) {
        await tx.continuityIssue.createMany({
          data: continuityWarnings.map((warning) => ({
            storyId: input.storyId,
            chapterId: input.chapterId,
            generationRunId: run.id,
            severity: warning.severity,
            category: warning.category,
            description: warning.description,
            evidence: toJsonString(warning.evidence),
            confidence: warning.confidence,
          })),
        });
      }
      const staged = await tx.generationJob.updateMany({
        where: { id: jobId, status: "RUNNING" },
        data: { stage: "EXTRACTING_CANON_PROPOSALS", progress: 88 },
      });
      if (staged.count === 0) {
        throw new WorkflowError(
          "GENERATION_CANCELLED",
          "Generation was cancelled.",
          409,
        );
      }
    });
    const evaluation = evaluateDraft(continuityWarnings);
    await prisma.draftVersion.update({
      where: { id: draftVersion.id },
      data: {
        metadata: toJsonString({ generationJobId: jobId, evaluation }),
      },
    });

    let extraction: MemoryExtractionResult | null = null;
    try {
      extraction = await extractMemoriesFromDraft({
        draft,
        contextSummary: JSON.stringify({
          story: context.story,
          characters: context.characters,
        }),
      });
    } catch (error) {
      await ensureNotCancelled(jobId);
      await prisma.auditLog.create({
        data: {
          storyId: input.storyId,
          action: "generation.extraction.failed",
          entityType: "generation_job",
          entityId: jobId,
          metadata: toJsonString({
            message: error instanceof Error ? error.message : "Unknown error",
          }),
        },
      });
    }

    await ensureNotCancelled(jobId);
    const proposals = extraction ? proposalsFromExtraction(extraction) : [];
    await prisma.$transaction(async (tx) => {
      const completed = await tx.generationJob.updateMany({
        where: { id: jobId, status: "RUNNING" },
        data: {
          status: "READY_FOR_REVIEW",
          stage:
            evaluation.decision === "pass"
              ? "READY_FOR_REVIEW"
              : "CONTINUITY_REVIEW_REQUIRED",
          progress: 100,
          completedAt: new Date(),
        },
      });
      if (completed.count === 0) {
        throw new WorkflowError(
          "GENERATION_CANCELLED",
          "Generation was cancelled.",
          409,
        );
      }
      if (proposals.length) {
        await tx.canonChangeProposal.createMany({
          data: proposals.map((proposal) => ({
            storyId: input.storyId,
            generationJobId: jobId,
            type: proposal.type,
            targetType: proposal.targetType,
            title: proposalTitle(proposal.type, proposal.value),
            proposedAfter: toJsonString(proposal.value),
            confidence: proposal.confidence,
            actionability: proposal.actionability,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          storyId: input.storyId,
          action: "generation.job.ready_for_review",
          entityType: "generation_job",
          entityId: jobId,
          metadata: toJsonString({
            continuityWarningCount: continuityWarnings.length,
            evaluation,
          }),
        },
      });
    });

    return getGenerationJob(jobId);
  } catch (error) {
    const current = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (
      current?.status === "CANCELLED" ||
      (error instanceof WorkflowError && error.code === "GENERATION_CANCELLED")
    ) {
      return getGenerationJob(jobId);
    }

    if (!paidAttempt && error instanceof OpenRouterRequestError && error.fallbackEligible) {
      const failedRun = await prisma.generationJob.findUnique({ where: { id: jobId }, select: { generationRunId: true } });
      if (failedRun?.generationRunId) await prisma.generationRun.update({ where: { id: failedRun.generationRunId }, data: { status: "FAILED", error: error.message } });
      await prisma.generationJob.updateMany({ where: { id: jobId, status: "RUNNING" }, data: {
        status: "AWAITING_FALLBACK_CONFIRMATION", stage: "FALLBACK_CONFIRMATION_REQUIRED", fallbackModel: modelConfig.paidFallbackModel,
        fallbackExpiresAt: new Date(Date.now() + 5 * 60 * 1000), errorCode: "FREE_MODEL_FAILED",
        error: "The free model failed. Generation is paused; paid fallback requires your confirmation.",
      }});
      return getGenerationJob(jobId);
    }
    const failed = await prisma.generationJob.updateMany({
      where: { id: jobId, status: "RUNNING" },
      data: {
        status: "FAILED",
        stage: "FAILED",
        errorCode:
          error instanceof WorkflowError ? error.code : "GENERATION_FAILED",
        error:
          error instanceof Error ? error.message : "Unknown generation error",
        completedAt: new Date(),
      },
    });
    if (failed.count === 0) {
      return getGenerationJob(jobId);
    }

    const jobAfterFailure = await getGenerationJob(jobId);
    if (jobAfterFailure.generationRunId) {
      await prisma.generationRun.update({
        where: { id: jobAfterFailure.generationRunId },
        data: {
          status: "FAILED",
          error:
            error instanceof Error ? error.message : "Unknown generation error",
        },
      });
    }
    throw error;
  }
}

export async function executeQueuedGenerationJobs(limit = 1) {
  await prisma.generationJob.updateMany({ where: { status: "AWAITING_FALLBACK_CONFIRMATION", fallbackExpiresAt: { lt: new Date() } }, data: { status: "CANCELLED", stage: "FALLBACK_CONFIRMATION_EXPIRED", completedAt: new Date(), error: "Fallback confirmation expired." } });
  const jobs = await prisma.generationJob.findMany({
    where: { status: { in: ["QUEUED", "RETRYING"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 10)),
  });

  const results = await Promise.allSettled(
    jobs.map((job) => executeGenerationJob(job.id)),
  );
  return {
    attempted: jobs.length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

export async function decideFallback(jobId: string, decision: "approve" | "decline") {
  const now = new Date();
  const job = await getGenerationJob(jobId);
  if (job.status !== "AWAITING_FALLBACK_CONFIRMATION") throw new WorkflowError("FALLBACK_NOT_AVAILABLE", "Fallback confirmation is no longer available.", 409);
  if (decision === "approve" && (!job.fallbackExpiresAt || job.fallbackExpiresAt <= now)) throw new WorkflowError("FALLBACK_EXPIRED", "Fallback confirmation has expired.", 409);
  const updated = await prisma.generationJob.updateMany({ where: { id: jobId, status: "AWAITING_FALLBACK_CONFIRMATION", ...(decision === "approve" ? { fallbackExpiresAt: { gt: now } } : {}) }, data: decision === "approve" ? { status: "RETRYING", stage: "FALLBACK_CONFIRMED", generationRunId: null, error: null, errorCode: null } : { status: "CANCELLED", stage: "FALLBACK_DECLINED", completedAt: now, error: "Generation stopped by the user." } });
  if (!updated.count) throw new WorkflowError("FALLBACK_STATE_CHANGED", "Fallback confirmation was already handled.", 409);
  return getGenerationJob(jobId);
}

export async function reviewCanonChangeProposal(
  proposalId: string,
  decision: "accept" | "reject",
) {
  const proposal = await prisma.canonChangeProposal.findUnique({
    where: { id: proposalId },
    include: { job: true },
  });
  if (!proposal) {
    throw new WorkflowError(
      "CANON_PROPOSAL_NOT_FOUND",
      "Canon proposal not found.",
      404,
    );
  }
  if (proposal.status !== "PENDING") {
    return proposal;
  }

  if (decision === "reject") {
    return prisma.$transaction(async (tx) => {
      const reviewed = await tx.canonChangeProposal.update({
        where: { id: proposalId },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          storyId: proposal.storyId,
          action: "canon.proposal.rejected",
          entityType: "canon_change_proposal",
          entityId: proposalId,
        },
      });
      return reviewed;
    });
  }

  const proposedAfter = parseJsonString<Record<string, unknown>>(
    proposal.proposedAfter,
    {},
  );
  if (proposal.actionability !== "AUTO_APPLY") {
    return prisma.$transaction(async (tx) => {
      const reviewed = await tx.canonChangeProposal.update({
        where: { id: proposalId },
        data: { status: "NEEDS_MANUAL_APPLICATION", reviewedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          storyId: proposal.storyId,
          action: "canon.proposal.manual_application_requested",
          entityType: "canon_change_proposal",
          entityId: proposalId,
          metadata: toJsonString({ type: proposal.type }),
        },
      });
      return reviewed;
    });
  }

  return prisma.$transaction(async (tx) => {
    if (proposal.type === "memory") {
      await tx.memory.create({
        data: {
          storyId: proposal.storyId,
          sourceType: "generation_job",
          sourceId: proposal.job.id,
          memoryType:
            typeof proposedAfter.memoryType === "string"
              ? proposedAfter.memoryType
              : "event",
          content:
            typeof proposedAfter.content === "string"
              ? proposedAfter.content
              : proposal.title,
          salience:
            typeof proposedAfter.salience === "number"
              ? proposedAfter.salience
              : 0.5,
          emotionalWeight:
            typeof proposedAfter.emotionalWeight === "number"
              ? proposedAfter.emotionalWeight
              : 0,
          entities: toJsonString(proposedAfter.entities),
        },
      });
    }

    if (proposal.type === "event") {
      await tx.event.create({
        data: {
          storyId: proposal.storyId,
          chapterId: proposal.job.chapterId,
          summary:
            typeof proposedAfter.summary === "string"
              ? proposedAfter.summary
              : proposal.title,
          eventType:
            typeof proposedAfter.eventType === "string"
              ? proposedAfter.eventType
              : "scene_event",
          salience:
            typeof proposedAfter.salience === "number"
              ? proposedAfter.salience
              : 0.5,
          participants: toJsonString(proposedAfter.participants),
        },
      });
    }

    const reviewed = await tx.canonChangeProposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED", reviewedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        storyId: proposal.storyId,
        action: "canon.proposal.accepted",
        entityType: "canon_change_proposal",
        entityId: proposalId,
        metadata: toJsonString({
          type: proposal.type,
          actionability: proposal.actionability,
        }),
      },
    });
    return reviewed;
  });
}

export async function getCanonChangeProposal(proposalId: string) {
  const proposal = await prisma.canonChangeProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, storyId: true },
  });
  if (!proposal) {
    throw new WorkflowError(
      "CANON_PROPOSAL_NOT_FOUND",
      "Canon proposal not found.",
      404,
    );
  }
  return proposal;
}

export async function updateDraftVersion(
  draftVersionId: string,
  input: { content: string; title?: string },
) {
  const draft = await prisma.draftVersion.update({
    where: { id: draftVersionId },
    data: { content: input.content, title: input.title },
  });

  await prisma.auditLog.create({
    data: {
      storyId: draft.storyId,
      action: "draft.version.saved",
      entityType: "draft_version",
      entityId: draft.id,
      metadata: toJsonString({ versionNumber: draft.versionNumber }),
    },
  });
  return draft;
}

export async function acceptDraftVersion(draftVersionId: string) {
  const draft = await prisma.draftVersion.update({
    where: { id: draftVersionId },
    data: { status: "ACCEPTED" },
  });

  await prisma.auditLog.create({
    data: {
      storyId: draft.storyId,
      action: "draft.version.accepted",
      entityType: "draft_version",
      entityId: draft.id,
      metadata: toJsonString({ versionNumber: draft.versionNumber }),
    },
  });
  return draft;
}
