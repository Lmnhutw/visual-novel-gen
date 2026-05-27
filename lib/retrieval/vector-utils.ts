import { clampScore, scoreMemory } from "@/lib/memory/memory-ranking";
import { parseJsonString } from "@/lib/db/json";

export type VectorRankInput<T> = {
  item: T;
  embedding: number[];
  salience: number;
  emotionalWeight: number;
  createdAt: Date;
  entityMatch?: number;
};

export type VectorRankResult<T> = {
  item: T;
  similarity: number;
  finalScore: number;
};

export function parseEmbedding(value: unknown): number[] | null {
  const candidate =
    typeof value === "string" ? parseJsonString<unknown>(value, null) : value;

  if (!Array.isArray(candidate)) {
    return null;
  }

  const vector = candidate.filter((entry): entry is number =>
    Number.isFinite(entry),
  );
  return vector.length === candidate.length && vector.length > 0 ? vector : null;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    aMagnitude += a[index] * a[index];
    bMagnitude += b[index] * b[index];
  }

  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }

  return clampScore(dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude)));
}

export function rankVectors<T>(
  queryEmbedding: number[],
  candidates: Array<VectorRankInput<T>>,
  options: {
    limit: number;
    threshold: number;
    now?: Date;
  },
): Array<VectorRankResult<T>> {
  const now = options.now ?? new Date();

  return candidates
    .map((candidate) => {
      const similarity = cosineSimilarity(queryEmbedding, candidate.embedding);
      const ageDays = Math.max(
        0,
        (now.getTime() - candidate.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const recency = clampScore(1 / (1 + ageDays / 30));

      return {
        item: candidate.item,
        similarity,
        finalScore: scoreMemory({
          semanticSimilarity: similarity,
          salience: candidate.salience,
          recency,
          emotionalWeight: candidate.emotionalWeight,
          entityMatch: candidate.entityMatch ?? 0,
        }),
      };
    })
    .filter((ranked) => ranked.similarity >= options.threshold)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, options.limit);
}
