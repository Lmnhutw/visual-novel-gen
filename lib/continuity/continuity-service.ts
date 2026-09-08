import { z } from "zod";

import { getModelForTask } from "@/lib/ai/model-routing";
import { generateStructuredObject } from "@/lib/ai/structured-output";
import { toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";
import { buildContinuityReviewPrompt } from "@/lib/prompts/prompt-builder";
import type { GenerationContext } from "@/lib/retrieval/types";
import {
  runRuleBasedContinuityChecks,
  type ContinuityWarning,
} from "@/lib/continuity/rule-checks";

const LlmContinuityIssueSchema = z.object({
  severity: z.enum(["P0", "P1", "P2", "P3"]),
  kind: z
    .enum(["CONTRADICTION", "NEW_FACT", "EDITORIAL_NOTE"])
    .default("CONTRADICTION"),
  category: z.string(),
  description: z.string(),
  evidence: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1).default(0.5),
});

const LlmContinuityResultSchema = z.object({
  issues: z.array(LlmContinuityIssueSchema).default([]),
});

export async function checkContinuity(input: {
  storyId: string;
  context: GenerationContext;
  draft: string;
  sceneId?: string;
  chapterId?: string;
  generationRunId?: string;
  maturityMode?: "safe" | "mature";
  useLlm?: boolean;
  persist?: boolean;
}): Promise<ContinuityWarning[]> {
  const warnings: ContinuityWarning[] = runRuleBasedContinuityChecks({
    context: input.context,
    draft: input.draft,
    maturityMode: input.maturityMode,
  }).map((warning) => ({
    ...warning,
    evidence: { ...warning.evidence, detector: "rule" },
  }));

  if (input.useLlm ?? true) {
    try {
      const result = await generateStructuredObject({
        prompt: buildContinuityReviewPrompt({
          context: input.context,
          draft: input.draft,
        }),
        schema: LlmContinuityResultSchema,
        options: {
          model: getModelForTask("evaluation"),
          temperature: 0.1,
          topP: 0.8,
        },
      });
      warnings.push(
        ...result.data.issues.map((issue) => ({
          severity: issue.severity,
          category: issue.category,
          description: issue.description,
          evidence: {
            ...issue.evidence,
            detector: "llm",
            kind: issue.kind,
          },
          confidence: issue.confidence,
        })),
      );
    } catch {
      warnings.push({
        severity: "P3",
        category: "checker",
        description:
          "LLM-assisted continuity review was unavailable; rule checks still ran.",
        evidence: {},
        confidence: 1,
      });
    }
  }

  if ((input.persist ?? true) && warnings.length > 0) {
    await prisma.continuityIssue.createMany({
      data: warnings.map((warning) => ({
        storyId: input.storyId,
        sceneId: input.sceneId,
        chapterId: input.chapterId,
        generationRunId: input.generationRunId,
        severity: warning.severity,
        category: warning.category,
        description: warning.description,
        evidence: toJsonString(warning.evidence),
        confidence: warning.confidence,
      })),
    });
  }

  return warnings;
}

export async function getContinuityIssue(issueId: string) {
  const issue = await prisma.continuityIssue.findUnique({
    where: { id: issueId },
    select: { id: true, storyId: true },
  });
  if (!issue) {
    throw new WorkflowError(
      "CONTINUITY_ISSUE_NOT_FOUND",
      "Continuity issue not found.",
      404,
    );
  }
  return issue;
}

export async function reviewContinuityIssue(
  issueId: string,
  decision: "resolve" | "dismiss",
) {
  const issue = await prisma.continuityIssue.findUnique({
    where: { id: issueId },
  });
  if (!issue) {
    throw new WorkflowError(
      "CONTINUITY_ISSUE_NOT_FOUND",
      "Continuity issue not found.",
      404,
    );
  }
  if (issue.status !== "OPEN") return issue;
  if (decision === "dismiss" && issue.category === "mature_content") {
    throw new WorkflowError(
      "CONTINUITY_ISSUE_REQUIRES_RESOLUTION",
      "Mature-content continuity issues must be resolved before accepting the draft.",
      409,
    );
  }

  const status = decision === "resolve" ? "RESOLVED" : "DISMISSED";
  return prisma.$transaction(async (tx) => {
    const reviewed = await tx.continuityIssue.update({
      where: { id: issueId },
      data: { status },
    });
    await tx.auditLog.create({
      data: {
        storyId: issue.storyId,
        action:
          decision === "resolve"
            ? "continuity.issue.resolved"
            : "continuity.issue.dismissed",
        entityType: "continuity_issue",
        entityId: issueId,
      },
    });
    return reviewed;
  });
}
