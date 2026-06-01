import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { generateTextEmbedding } from "@/lib/embeddings/embedding-service";

export type VectorMemoryResult = {
  id: string;
  storyId: string;
  characterId: string | null;
  chapterId: string | null;
  sceneId: string | null;
  sourceType: string;
  sourceId: string | null;
  memoryType: string;
  content: string;
  summary: string | null;
  salience: number;
  emotionalWeight: number;
  entities: string;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  createdAt: Date;
  updatedAt: Date;
  similarity: number;
  finalScore: number;
};

export async function searchMemoryVectors(input: {
  storyId: string;
  query: string;
  memoryTypes?: string[];
  threshold?: number;
  limit?: number;
}): Promise<VectorMemoryResult[]> {
  const { vector } = await generateTextEmbedding({ text: input.query });
  const threshold = input.threshold ?? 0.7;
  const limit = input.limit ?? 12;
  const memoryTypeFilter = input.memoryTypes?.length
    ? Prisma.sql`AND "memory_type" IN (${Prisma.join(input.memoryTypes)})`
    : Prisma.empty;
  return prisma.$queryRaw<VectorMemoryResult[]>`
    SELECT
      "id",
      "story_id" AS "storyId",
      "character_id" AS "characterId",
      "chapter_id" AS "chapterId",
      "scene_id" AS "sceneId",
      "source_type" AS "sourceType",
      "source_id" AS "sourceId",
      "memory_type" AS "memoryType",
      "content",
      "summary",
      "salience",
      "emotional_weight" AS "emotionalWeight",
      "entities",
      "embedding_model" AS "embeddingModel",
      "embedding_dimensions" AS "embeddingDimensions",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt",
      (1 - ("embedding" <=> ${vector}::vector))::float AS "similarity",
      (
        ((1 - ("embedding" <=> ${vector}::vector)) * 0.72) +
        ("salience" * 0.18) +
        (LEAST(GREATEST("emotional_weight", 0), 1) * 0.10)
      )::float AS "finalScore"
    FROM "memories"
    WHERE "story_id" = ${input.storyId}
      AND "embedding" IS NOT NULL
      ${memoryTypeFilter}
      AND (1 - ("embedding" <=> ${vector}::vector)) >= ${threshold}
    ORDER BY "finalScore" DESC, "created_at" DESC
    LIMIT ${limit}
  `;
}
