import { z } from "zod";

import { generateText } from "@/lib/ai/openrouter-client";
import { toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { buildContinuityReviewPrompt } from "@/lib/prompts/prompt-builder";
import type { GenerationContext } from "@/lib/retrieval/types";
import {
  runRuleBasedContinuityChecks,
  type ContinuityWarning,
} from "@/lib/continuity/rule-checks";

const LlmContinuityIssueSchema = z.object({
  severity: z.enum(["P0", "P1", "P2", "P3"]),
  category: z.string(),
  description: z.string(),
  evidence: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1).default(0.5),
});

const LlmContinuityResultSchema = z.object({
  issues: z.array(LlmContinuityIssueSchema).default([]),
});

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Continuity checker returned no JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

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
  const warnings = runRuleBasedContinuityChecks({
    context: input.context,
    draft: input.draft,
    maturityMode: input.maturityMode,
  });

  if (input.useLlm ?? true) {
    try {
      const output = await generateText(
        buildContinuityReviewPrompt({
          context: input.context,
          draft: input.draft,
        }),
        {
          temperature: 0.1,
          topP: 0.8,
          responseFormat: { type: "json_object" },
        },
      );
      const parsed = LlmContinuityResultSchema.parse(extractJson(output.text));
      warnings.push(
        ...parsed.issues.map((issue) => ({
          severity: issue.severity,
          category: issue.category,
          description: issue.description,
          evidence: issue.evidence,
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
