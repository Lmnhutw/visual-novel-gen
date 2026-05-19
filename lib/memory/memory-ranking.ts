export type MemoryRankInput = {
  semanticSimilarity: number;
  salience: number;
  recency: number;
  emotionalWeight: number;
  entityMatch: number;
  contradictionRisk?: number;
};

export function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function scoreMemory(input: MemoryRankInput): number {
  return clampScore(
    input.semanticSimilarity * 0.45 +
      input.salience * 0.2 +
      input.recency * 0.15 +
      input.emotionalWeight * 0.1 +
      input.entityMatch * 0.1 -
      (input.contradictionRisk ?? 0),
  );
}

export function scoreRecency(createdAt: Date, now = new Date()): number {
  const ageDays = Math.max(
    0,
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return clampScore(1 / (1 + ageDays / 30));
}

export function estimateSalience(text: string): number {
  const lower = text.toLowerCase();
  const strongSignals = [
    "death",
    "dead",
    "killed",
    "betray",
    "confess",
    "secret",
    "promise",
    "vow",
    "kiss",
    "injury",
    "wound",
    "reveal",
    "breakup",
    "marry",
  ];

  const hits = strongSignals.filter((signal) => lower.includes(signal)).length;
  return clampScore(0.35 + hits * 0.12);
}

export function estimateEmotionalWeight(text: string): number {
  const lower = text.toLowerCase();
  const signals = [
    "love",
    "hate",
    "fear",
    "grief",
    "shame",
    "desire",
    "anger",
    "jealous",
    "trust",
    "betray",
    "lonely",
    "relief",
  ];

  const hits = signals.filter((signal) => lower.includes(signal)).length;
  return clampScore(0.2 + hits * 0.1);
}

