import { z } from "zod";

const deduplicatedList = (itemMaxLength: number, maxItems: number) =>
  z
    .array(z.string().trim().min(1).max(itemMaxLength))
    .max(maxItems)
    .transform((entries) => {
      const seen = new Set<string>();
      return entries.filter((entry) => {
        const key = entry.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

export const writingHarnessSchema = z
  .object({
    version: z.literal(1),
    enabled: z.boolean(),
    language: z.enum(["vi", "en"]),
    readability: z.enum(["simple", "balanced", "literary"]),
    styleGoals: deduplicatedList(200, 24),
    requiredRules: deduplicatedList(200, 24),
    forbiddenCharacters: deduplicatedList(8, 24),
    forbiddenPhrases: deduplicatedList(120, 48),
    maxSentenceWords: z.number().int().min(5).max(80).optional(),
    outputRules: z
      .object({
        proseOnly: z.boolean(),
        allowMarkdown: z.boolean(),
        maxConsecutiveBlankLines: z.number().int().min(0).max(3),
      })
      .strict(),
    repairOnViolation: z.boolean(),
  })
  .strict();

export type WritingHarnessConfig = z.infer<typeof writingHarnessSchema>;

export const DEFAULT_WRITING_HARNESS: WritingHarnessConfig = {
  version: 1,
  enabled: true,
  language: "en",
  readability: "balanced",
  styleGoals: [
    "Use clear, easy-to-understand language.",
    "Prefer direct sentences and purposeful paragraph breaks.",
  ],
  requiredRules: [
    "Do not invent lore or override established character behavior.",
  ],
  forbiddenCharacters: ["—"],
  forbiddenPhrases: [],
  maxSentenceWords: 24,
  outputRules: {
    proseOnly: true,
    allowMarkdown: false,
    maxConsecutiveBlankLines: 1,
  },
  repairOnViolation: true,
};

export function getDefaultWritingHarness(): WritingHarnessConfig {
  return writingHarnessSchema.parse(DEFAULT_WRITING_HARNESS);
}

export function parseWritingHarness(value: unknown): WritingHarnessConfig {
  let candidate = value;

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!trimmed || trimmed === "{}") return getDefaultWritingHarness();
    candidate = JSON.parse(trimmed) as unknown;
  }

  if (
    candidate === undefined ||
    candidate === null ||
    (typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      Object.keys(candidate).length === 0)
  ) {
    return getDefaultWritingHarness();
  }

  return writingHarnessSchema.parse(candidate);
}
