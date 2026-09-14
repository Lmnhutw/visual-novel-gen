import { z } from "zod";

const briefItemSchema = z.string().trim().min(1).max(320);

export const chapterBriefSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  originalIntent: z.string().trim().min(1).max(2_000),
  progress: z.array(briefItemSchema).max(16).default([]),
  completedBeats: z.array(briefItemSchema).max(24).default([]),
  characterChanges: z.array(briefItemSchema).max(24).default([]),
  facts: z.array(briefItemSchema).max(24).default([]),
  openThreads: z.array(briefItemSchema).max(24).default([]),
  suggestedNextDirection: z.string().trim().max(600).default(""),
});

export const chapterBriefUpdateSchema = z.object({
  summary: z.string().trim().min(1).max(1_200),
  completedBeats: z.array(briefItemSchema).max(8).default([]),
  characterChanges: z.array(briefItemSchema).max(8).default([]),
  newFacts: z.array(briefItemSchema).max(8).default([]),
  openThreadsAdded: z.array(briefItemSchema).max(8).default([]),
  openThreadsResolved: z.array(briefItemSchema).max(8).default([]),
  suggestedNextDirection: z.string().trim().max(600).default(""),
});

export const chapterBriefReviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    update: chapterBriefUpdateSchema,
  }),
  z.object({ decision: z.literal("discard") }),
]);

export type ChapterBrief = z.infer<typeof chapterBriefSchema>;
export type ChapterBriefUpdate = z.infer<typeof chapterBriefUpdateSchema>;
export type ChapterBriefReview = z.infer<typeof chapterBriefReviewSchema>;

export function createInitialChapterBrief(intent: string): ChapterBrief {
  return chapterBriefSchema.parse({ originalIntent: intent });
}

export function parseChapterBrief(value: unknown): ChapterBrief | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = chapterBriefSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parseChapterBriefUpdate(value: unknown): ChapterBriefUpdate | null {
  const parsed = chapterBriefUpdateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseChapterBriefProposalMetadata(
  metadata: unknown,
): ChapterBriefUpdate | null {
  if (typeof metadata !== "string" || !metadata.trim()) return null;

  try {
    const parsed = JSON.parse(metadata) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parseChapterBriefUpdate(
      (parsed as Record<string, unknown>).chapterBriefProposal,
    );
  } catch {
    return null;
  }
}

function normalizeItem(value: string) {
  return value.trim().toLocaleLowerCase();
}

function appendUnique(
  current: string[],
  additions: string[],
  limit: number,
): string[] {
  const seen = new Set(current.map(normalizeItem));
  const merged = [...current];
  for (const item of additions) {
    const key = normalizeItem(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item.trim());
  }
  return merged.slice(-limit);
}

export function mergeChapterBrief(
  current: ChapterBrief,
  update: ChapterBriefUpdate,
): ChapterBrief {
  const resolved = new Set(update.openThreadsResolved.map(normalizeItem));
  const remainingThreads = current.openThreads.filter(
    (thread) => !resolved.has(normalizeItem(thread)),
  );

  return chapterBriefSchema.parse({
    ...current,
    progress: appendUnique(current.progress, [update.summary], 16),
    completedBeats: appendUnique(
      current.completedBeats,
      update.completedBeats,
      24,
    ),
    characterChanges: appendUnique(
      current.characterChanges,
      update.characterChanges,
      24,
    ),
    facts: appendUnique(current.facts, update.newFacts, 24),
    openThreads: appendUnique(remainingThreads, update.openThreadsAdded, 24),
    suggestedNextDirection:
      update.suggestedNextDirection || current.suggestedNextDirection,
  });
}

