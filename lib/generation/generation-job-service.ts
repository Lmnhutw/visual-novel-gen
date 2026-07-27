import { getModelConfig } from "@/lib/ai/model-config";
import { generateText } from "@/lib/ai/provider";
import { checkContinuity } from "@/lib/continuity/continuity-service";
import { parseJsonString, toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";
import {
  extractMemoriesFromDraft,
  type MemoryExtractionResult,
} from "@/lib/memory/memory-extractor";
import { buildGenerationPrompt } from "@/lib/prompts/prompt-builder";
import { retrieveContext } from "@/lib/retrieval/retrieval-service";

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
  idempotencyKey?: string;
  type?: "scene" | "chapter" | "revision";
};

const terminalStatuses = new Set(["READY_FOR_REVIEW", "FAILED", "CANCELLED"]);

function proposalTitle(type: string, value: Record<string, unknown>) {
  if (type === "memory") {
    return typeof value.content === "string" ? value.content.slice(0, 96) : "New memory";
  }

  if (type === "event") {
    return typeof value.summary === "string" ? value.summary.slice(0, 96) : "New timeline event";
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
      throw new WorkflowError("CHAPTER_NOT_FOUND", "Chapter does not belong to this story.", 404);
    }
  }

  const activeIds = input.activeCharacterIds ?? [];
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

      const unconfirmed = activeCharacters.filter((character) => !character.ageConfirmed);
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

  if (job?.status === "CANCELLED") {
    throw new WorkflowError("GENERATION_CANCELLED", "Generation was cancelled.", 409);
  }
}

async function setStage(
  jobId: string,
  stage: string,
  progress: number,
  data: Record<string, unknown> = {},
) {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { stage, progress, ...data },
  });
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
  await assertPreflight(input);

  if (input.idempotencyKey) {
    const existing = await prisma.generationJob.findFirst({
      where: { storyId: input.storyId, idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return { job: existing, reused: true };
    }
  }

  const job = await prisma.generationJob.create({
    data: {
      storyId: input.storyId,
      chapterId: input.chapterId,
      type: input.type ?? "scene",
      idempotencyKey: input.idempotencyKey,
      input: toJsonString(input),
    },
  });

  await prisma.auditLog.create({
    data: {
      storyId: input.storyId,
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
    throw new WorkflowError("GENERATION_JOB_NOT_FOUND", "Generation job not found.", 404);
  }

  return job;
}

export async function listGenerationJobs(storyId: string) {
  return prisma.generationJob.findMany({
    where: { storyId },
    include: { draftVersion: true, _count: { select: { proposals: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function cancelGenerationJob(jobId: string) {
  const job = await getGenerationJob(jobId);
  if (terminalStatuses.has(job.status)) {
    return job;
  }

  return prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "CANCELLED", stage: "CANCELLED", completedAt: new Date() },
  });
}

export async function executeGenerationJob(jobId: string) {
  const claim = await prisma.generationJob.updateMany({
    where: { id: jobId, status: { in: ["QUEUED", "RETRYING"] } },
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
  const input = parseJsonString<GenerationJobInput>(job.input, {} as GenerationJobInput);
  const modelConfig = getModelConfig();

  try {
    await ensureNotCancelled(jobId);
    const context = await retrieveContext({
      storyId: input.storyId,
      query: input.goal,
      activeCharacterIds: input.activeCharacterIds,
      includeSecrets: input.includeSecrets ?? false,
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
    const run = await prisma.generationRun.create({
      data: {
        storyId: input.storyId,
        type: input.type ?? "scene",
        status: "RUNNING",
        input: toJsonString(input),
        prompt,
        model: modelConfig.generationModel,
      },
    });
    await setStage(jobId, "GENERATING", 35, { prompt, generationRunId: run.id });

    await ensureNotCancelled(jobId);
    const generation = await generateText(prompt, {
      model: modelConfig.generationModel,
      maxTokens: input.maxTokens ?? modelConfig.generationDefaults.maxTokens,
    });
    const draft = generation.text;

    await setStage(jobId, "SAVING_DRAFT", 62);
    const previous = await prisma.draftVersion.aggregate({
      where: { storyId: input.storyId, chapterId: input.chapterId },
      _max: { versionNumber: true },
    });
    const draftVersion = await prisma.draftVersion.create({
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
    await setStage(jobId, "CHECKING_CONTINUITY", 75, { draftVersionId: draftVersion.id });

    await ensureNotCancelled(jobId);
    const continuityWarnings = await checkContinuity({
      storyId: input.storyId,
      context,
      draft,
      chapterId: input.chapterId,
      generationRunId: run.id,
      maturityMode: input.maturityMode,
      persist: true,
    });

    await setStage(jobId, "EXTRACTING_CANON_PROPOSALS", 88);
    let extraction: MemoryExtractionResult | null = null;
    try {
      extraction = await extractMemoriesFromDraft({
        draft,
        contextSummary: JSON.stringify({ story: context.story, characters: context.characters }),
      });
    } catch (error) {
      await prisma.auditLog.create({
        data: {
          storyId: input.storyId,
          action: "generation.extraction.failed",
          entityType: "generation_job",
          entityId: jobId,
          metadata: toJsonString({ message: error instanceof Error ? error.message : "Unknown error" }),
        },
      });
    }

    if (extraction) {
      const proposals = proposalsFromExtraction(extraction);
      if (proposals.length) {
        await prisma.canonChangeProposal.createMany({
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
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "READY_FOR_REVIEW",
        stage: "READY_FOR_REVIEW",
        progress: 100,
        completedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        storyId: input.storyId,
        action: "generation.job.ready_for_review",
        entityType: "generation_job",
        entityId: jobId,
        metadata: toJsonString({ continuityWarningCount: continuityWarnings.length }),
      },
    });

    return getGenerationJob(jobId);
  } catch (error) {
    if (error instanceof WorkflowError && error.code === "GENERATION_CANCELLED") {
      return cancelGenerationJob(jobId);
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        stage: "FAILED",
        errorCode: error instanceof WorkflowError ? error.code : "GENERATION_FAILED",
        error: error instanceof Error ? error.message : "Unknown generation error",
        completedAt: new Date(),
      },
    });

    const jobAfterFailure = await getGenerationJob(jobId);
    if (jobAfterFailure.generationRunId) {
      await prisma.generationRun.update({
        where: { id: jobAfterFailure.generationRunId },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown generation error",
        },
      });
    }
    throw error;
  }
}

export async function executeQueuedGenerationJobs(limit = 1) {
  const jobs = await prisma.generationJob.findMany({
    where: { status: { in: ["QUEUED", "RETRYING"] } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 10)),
  });

  const results = await Promise.allSettled(jobs.map((job) => executeGenerationJob(job.id)));
  return {
    attempted: jobs.length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
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
    throw new WorkflowError("CANON_PROPOSAL_NOT_FOUND", "Canon proposal not found.", 404);
  }
  if (proposal.status !== "PENDING") {
    return proposal;
  }

  if (decision === "reject") {
    return prisma.canonChangeProposal.update({
      where: { id: proposalId },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });
  }

  const proposedAfter = parseJsonString<Record<string, unknown>>(proposal.proposedAfter, {});
  if (proposal.actionability !== "AUTO_APPLY") {
    return prisma.canonChangeProposal.update({
      where: { id: proposalId },
      data: { status: "NEEDS_MANUAL_APPLICATION", reviewedAt: new Date() },
    });
  }

  return prisma.$transaction(async (tx) => {
    if (proposal.type === "memory") {
      await tx.memory.create({
        data: {
          storyId: proposal.storyId,
          sourceType: "generation_job",
          sourceId: proposal.job.id,
          memoryType: typeof proposedAfter.memoryType === "string" ? proposedAfter.memoryType : "event",
          content: typeof proposedAfter.content === "string" ? proposedAfter.content : proposal.title,
          salience: typeof proposedAfter.salience === "number" ? proposedAfter.salience : 0.5,
          emotionalWeight:
            typeof proposedAfter.emotionalWeight === "number" ? proposedAfter.emotionalWeight : 0,
          entities: toJsonString(proposedAfter.entities),
        },
      });
    }

    if (proposal.type === "event") {
      await tx.event.create({
        data: {
          storyId: proposal.storyId,
          chapterId: proposal.job.chapterId,
          summary: typeof proposedAfter.summary === "string" ? proposedAfter.summary : proposal.title,
          eventType: typeof proposedAfter.eventType === "string" ? proposedAfter.eventType : "scene_event",
          salience: typeof proposedAfter.salience === "number" ? proposedAfter.salience : 0.5,
          participants: toJsonString(proposedAfter.participants),
        },
      });
    }

    return tx.canonChangeProposal.update({
      where: { id: proposalId },
      data: { status: "ACCEPTED", reviewedAt: new Date() },
    });
  });
}

export async function getCanonChangeProposal(proposalId: string) {
  const proposal = await prisma.canonChangeProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, storyId: true },
  });
  if (!proposal) {
    throw new WorkflowError("CANON_PROPOSAL_NOT_FOUND", "Canon proposal not found.", 404);
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
