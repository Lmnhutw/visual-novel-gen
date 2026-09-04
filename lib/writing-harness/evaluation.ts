import { z } from "zod";

import {
  type WritingHarnessConfig,
  writingHarnessSchema,
} from "@/lib/writing-harness/config";
import {
  buildWritingHarnessRepairPrompt,
  GENERATION_PROMPT_VERSION,
} from "@/lib/writing-harness/prompt";

export const harnessViolationSchema = z
  .object({
    rule: z.string(),
    kind: z.enum([
      "forbidden_character",
      "forbidden_phrase",
      "markdown",
      "blank_lines",
      "prose_wrapper",
      "sentence_length",
    ]),
    severity: z.enum(["error", "warning"]),
    message: z.string(),
    occurrences: z.number().int().positive().optional(),
  })
  .strict();

export type HarnessViolation = z.infer<typeof harnessViolationSchema>;
export type HarnessStatus = "passed" | "repaired_and_passed" | "needs_review";

export type HarnessRepairResult = {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type GenerationUsage = NonNullable<HarnessRepairResult["usage"]>;

export type WritingHarnessOutcome = {
  content: string;
  status: HarnessStatus;
  findingsBeforeRepair: HarnessViolation[];
  findingsAfterRepair: HarnessViolation[];
  repairAttempted: boolean;
  repairModel?: string;
  repairError?: string;
  repairUsage?: HarnessRepairResult["usage"];
};

export function combineGenerationUsage(
  ...usages: Array<GenerationUsage | undefined>
): GenerationUsage | undefined {
  const present = usages.filter((usage): usage is GenerationUsage => Boolean(usage));
  if (!present.length) return undefined;

  return {
    promptTokens: present.reduce(
      (sum, usage) => sum + (usage.promptTokens ?? 0),
      0,
    ),
    completionTokens: present.reduce(
      (sum, usage) => sum + (usage.completionTokens ?? 0),
      0,
    ),
    totalTokens: present.reduce(
      (sum, usage) => sum + (usage.totalTokens ?? 0),
      0,
    ),
  };
}

const harnessEvaluationSchema = z
  .object({
    status: z.enum(["passed", "repaired_and_passed", "needs_review"]),
    findingsBeforeRepair: z.array(harnessViolationSchema),
    findingsAfterRepair: z.array(harnessViolationSchema),
    repairAttempted: z.boolean(),
    repairModel: z.string().optional(),
    repairError: z.string().optional(),
  })
  .strict();

export const writingHarnessAuditSchema = z
  .object({
    schemaVersion: z.literal(1),
    promptVersion: z.string().min(1),
    effectiveHarness: writingHarnessSchema,
    evaluation: harnessEvaluationSchema,
  })
  .strict();

export type WritingHarnessAudit = z.infer<typeof writingHarnessAuditSchema>;

function occurrences(haystack: string, needle: string, caseInsensitive = false) {
  const source = caseInsensitive ? haystack.toLocaleLowerCase() : haystack;
  const target = caseInsensitive ? needle.toLocaleLowerCase() : needle;
  let count = 0;
  let offset = 0;

  while (target && (offset = source.indexOf(target, offset)) >= 0) {
    count += 1;
    offset += target.length;
  }

  return count;
}

export function normalizeWritingHarnessOutput(
  draft: string,
  harness: WritingHarnessConfig,
): string {
  let normalized = draft
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();

  if (harness.enabled) {
    const maximumNewlines = harness.outputRules.maxConsecutiveBlankLines + 1;
    normalized = normalized.replace(
      new RegExp(`\\n{${maximumNewlines + 1},}`, "g"),
      "\n".repeat(maximumNewlines),
    );
  }

  return normalized;
}

export function validateWritingHarnessOutput(
  draft: string,
  harness: WritingHarnessConfig,
): HarnessViolation[] {
  if (!harness.enabled) return [];

  const findings: HarnessViolation[] = [];
  for (const character of harness.forbiddenCharacters) {
    const count = occurrences(draft, character);
    if (count) {
      findings.push({
        rule: `Do not use ${JSON.stringify(character)}.`,
        kind: "forbidden_character",
        severity: "error",
        message: `Found forbidden character ${JSON.stringify(character)}.`,
        occurrences: count,
      });
    }
  }

  for (const phrase of harness.forbiddenPhrases) {
    const count = occurrences(draft, phrase, true);
    if (count) {
      findings.push({
        rule: `Do not use ${JSON.stringify(phrase)}.`,
        kind: "forbidden_phrase",
        severity: "error",
        message: `Found forbidden word or phrase ${JSON.stringify(phrase)}.`,
        occurrences: count,
      });
    }
  }

  if (!harness.outputRules.allowMarkdown) {
    const headings = draft.match(/^ {0,3}#{1,6}[ \t]+.+$/gm)?.length ?? 0;
    const fences = draft.match(/^ {0,3}(?:```|~~~)/gm)?.length ?? 0;
    if (headings + fences) {
      findings.push({
        rule: "Do not use Markdown headings or fenced code.",
        kind: "markdown",
        severity: "error",
        message: "Found Markdown headings or fenced code.",
        occurrences: headings + fences,
      });
    }
  }

  const excessiveBlankLines =
    draft.match(
      new RegExp(
        `\\n{${harness.outputRules.maxConsecutiveBlankLines + 2},}`,
        "g",
      ),
    )?.length ?? 0;
  if (excessiveBlankLines) {
    findings.push({
      rule: `Use at most ${harness.outputRules.maxConsecutiveBlankLines} consecutive blank lines.`,
      kind: "blank_lines",
      severity: "error",
      message: "Found excessive consecutive blank lines.",
      occurrences: excessiveBlankLines,
    });
  }

  if (
    harness.outputRules.proseOnly &&
    /^(?:here(?:'s| is)\b|draft\s*:|response\s*:|certainly[,.!]|as requested[:,])/i.test(
      draft.trimStart(),
    )
  ) {
    findings.push({
      rule: "Return prose only without wrapper commentary.",
      kind: "prose_wrapper",
      severity: "error",
      message: "The draft begins with obvious response wrapper text.",
      occurrences: 1,
    });
  }

  if (harness.maxSentenceWords) {
    const longSentences = draft
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?…])\s+/u)
      .filter(
        (sentence) =>
          sentence.split(/\s+/).filter(Boolean).length >
          (harness.maxSentenceWords ?? Number.POSITIVE_INFINITY),
      ).length;
    if (longSentences) {
      findings.push({
        rule: `Prefer sentences with at most ${harness.maxSentenceWords} words.`,
        kind: "sentence_length",
        severity: "warning",
        message:
          "Some sentences exceed the preferred length. This is an advisory style signal, not a readability guarantee.",
        occurrences: longSentences,
      });
    }
  }

  return findings;
}

export function canAttemptWritingHarnessRepair(
  harness: WritingHarnessConfig,
  options: { usesPaidModel: boolean; paidApproved: boolean },
): boolean {
  return (
    harness.enabled &&
    harness.repairOnViolation &&
    (!options.usesPaidModel || options.paidApproved)
  );
}

export async function enforceWritingHarness(input: {
  draft: string;
  harness: WritingHarnessConfig;
  repair?: (prompt: string) => Promise<HarnessRepairResult>;
}): Promise<WritingHarnessOutcome> {
  const normalized = normalizeWritingHarnessOutput(input.draft, input.harness);
  const findingsBeforeRepair = validateWritingHarnessOutput(
    normalized,
    input.harness,
  );
  const hasHardViolation = findingsBeforeRepair.some(
    (finding) => finding.severity === "error",
  );

  if (!hasHardViolation) {
    return {
      content: normalized,
      status: "passed",
      findingsBeforeRepair,
      findingsAfterRepair: [],
      repairAttempted: false,
    };
  }

  if (!input.repair) {
    return {
      content: normalized,
      status: "needs_review",
      findingsBeforeRepair,
      findingsAfterRepair: [],
      repairAttempted: false,
    };
  }

  try {
    const repaired = await input.repair(
      buildWritingHarnessRepairPrompt(
        normalized,
        findingsBeforeRepair.filter((finding) => finding.severity === "error"),
      ),
    );
    const content = normalizeWritingHarnessOutput(repaired.text, input.harness);
    const findingsAfterRepair = validateWritingHarnessOutput(
      content,
      input.harness,
    );
    const stillInvalid = findingsAfterRepair.some(
      (finding) => finding.severity === "error",
    );

    return {
      content,
      status: stillInvalid ? "needs_review" : "repaired_and_passed",
      findingsBeforeRepair,
      findingsAfterRepair,
      repairAttempted: true,
      repairModel: repaired.model,
      repairUsage: repaired.usage,
    };
  } catch (error) {
    return {
      content: normalized,
      status: "needs_review",
      findingsBeforeRepair,
      findingsAfterRepair: [],
      repairAttempted: true,
      repairError:
        error instanceof Error ? error.message : "Writing harness repair failed.",
    };
  }
}

export function createWritingHarnessAudit(
  harness: WritingHarnessConfig,
  outcome: WritingHarnessOutcome,
): WritingHarnessAudit {
  return {
    schemaVersion: harness.version,
    promptVersion: GENERATION_PROMPT_VERSION,
    effectiveHarness: harness,
    evaluation: {
      status: outcome.status,
      findingsBeforeRepair: outcome.findingsBeforeRepair,
      findingsAfterRepair: outcome.findingsAfterRepair,
      repairAttempted: outcome.repairAttempted,
      repairModel: outcome.repairModel,
      repairError: outcome.repairError,
    },
  };
}

export function parseWritingHarnessAuditMetadata(
  metadata: unknown,
): WritingHarnessAudit | null {
  let candidate = metadata;
  try {
    if (typeof candidate === "string") candidate = JSON.parse(candidate) as unknown;
  } catch {
    return null;
  }

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const result = writingHarnessAuditSchema.safeParse(
    (candidate as Record<string, unknown>).writingHarness,
  );
  return result.success ? result.data : null;
}
