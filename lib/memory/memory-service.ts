import { randomUUID } from "node:crypto";

import { getModelConfig } from "@/lib/ai/model-config";
import { toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import {
  formatVectorLiteral,
  generateTextEmbedding,
} from "@/lib/embeddings/embedding-service";
import {
  estimateEmotionalWeight,
  estimateSalience,
  scoreMemory,
  scoreRecency,
} from "@/lib/memory/memory-ranking";
import { searchMemoryVectors } from "@/lib/retrieval/vector-search";

export type CreateMemoryInput = {
  storyId: string;
  characterId?: string;
  chapterId?: string;
  sceneId?: string;
  sourceType: string;
  sourceId?: string;
  memoryType: string;
  content: string;
  summary?: string;
  salience?: number;
  emotionalWeight?: number;
  entities?: unknown;
  generateEmbedding?: boolean;
};

export async function createMemory(input: CreateMemoryInput) {
  const config = getModelConfig();
  const memory = await prisma.memory.create({
    data: {
      storyId: input.storyId,
      characterId: input.characterId,
      chapterId: input.chapterId,
      sceneId: input.sceneId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      memoryType: input.memoryType,
      content: input.content,
      summary: input.summary,
      salience: input.salience ?? estimateSalience(input.content),
      emotionalWeight:
        input.emotionalWeight ?? estimateEmotionalWeight(input.content),
      entities: toJsonString(input.entities),
    },
  });

  if (input.generateEmbedding ?? config.enableEmbeddings) {
    await attachMemoryEmbedding({
      memoryId: memory.id,
      text: input.summary ?? input.content,
    });
  }

  return memory;
}

export async function searchMemories(input: {
  storyId: string;
  query?: string;
  memoryTypes?: string[];
  threshold?: number;
  limit?: number;
}) {
  const query = input.query?.trim();
  if (!query) {
    return findRankedMemoriesWithoutQuery(input);
  }

  if (getModelConfig().enableEmbeddings) {
    try {
      return await searchMemoryVectors({
        storyId: input.storyId,
        query,
        memoryTypes: input.memoryTypes,
        threshold: input.threshold,
        limit: input.limit,
      });
    } catch {
      return searchMemoriesByKeywords({ ...input, query });
    }
  }

  return searchMemoriesByKeywords({ ...input, query });
}

export async function attachMemoryEmbedding(input: {
  memoryId: string;
  text: string;
}) {
  const { embedding, model, dimensions } = await generateTextEmbedding({
    text: input.text,
  });

  await prisma.$executeRaw`
    UPDATE "memories"
    SET
      "embedding" = ${formatVectorLiteral(embedding)}::extensions.vector,
      "embedding_model" = ${model},
      "embedding_dimensions" = ${dimensions},
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "id" = ${input.memoryId}
  `;

  return { model, dimensions };
}

export async function findRankedMemoriesWithoutQuery(input: {
  storyId: string;
  memoryTypes?: string[];
  limit?: number;
}) {
  return prisma.memory.findMany({
    where: {
      storyId: input.storyId,
      memoryType: input.memoryTypes?.length
        ? { in: input.memoryTypes }
        : undefined,
    },
    orderBy: [{ salience: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 12,
  });
}

export async function generateEmbeddingForText(input: {
  storyId: string;
  ownerType: string;
  ownerId: string;
  text: string;
  metadata?: unknown;
}) {
  const { embedding, model } = await generateTextEmbedding({
    text: input.text,
  });
  const id = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "embeddings" (
      "id",
      "story_id",
      "owner_type",
      "owner_id",
      "model",
      "dimensions",
      "chunk_text",
      "embedding",
      "metadata",
      "created_at"
    )
    VALUES (
      ${id},
      ${input.storyId},
      ${input.ownerType},
      ${input.ownerId},
      ${model},
      ${embedding.length},
      ${input.text},
      ${formatVectorLiteral(embedding)}::extensions.vector,
      ${toJsonString(input.metadata)},
      CURRENT_TIMESTAMP
    )
  `;

  return {
    id,
    model,
    dimensions: embedding.length,
  };
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9_'-]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

async function searchMemoriesByKeywords(input: {
  storyId: string;
  query: string;
  memoryTypes?: string[];
  limit?: number;
}) {
  const limit = input.limit ?? 12;
  const terms = tokenizeQuery(input.query);
  const candidates = await prisma.memory.findMany({
    where: {
      storyId: input.storyId,
      memoryType: input.memoryTypes?.length ? { in: input.memoryTypes } : undefined,
    },
    orderBy: [{ salience: "desc" }, { createdAt: "desc" }],
    take: Math.max(limit * 5, 50),
  });

  return candidates
    .map((memory) => {
      const haystack = [
        memory.content,
        memory.summary,
        memory.entities,
        memory.memoryType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const hits = terms.filter((term) => haystack.includes(term)).length;
      const keywordScore =
        terms.length > 0 ? Math.min(1, hits / terms.length) : 0;

      return {
        ...memory,
        similarity: keywordScore,
        finalScore: scoreMemory({
          semanticSimilarity: keywordScore,
          salience: memory.salience,
          recency: scoreRecency(memory.createdAt),
          emotionalWeight: memory.emotionalWeight,
          entityMatch: keywordScore,
        }),
      };
    })
    .filter((memory) => memory.similarity > 0 || terms.length === 0)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}
