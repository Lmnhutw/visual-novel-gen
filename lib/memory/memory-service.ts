import { embedText } from "@/lib/ai/openrouter-client";
import { getModelConfig } from "@/lib/ai/model-config";
import { toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import {
  estimateEmotionalWeight,
  estimateSalience,
} from "@/lib/memory/memory-ranking";
import { parseEmbedding, rankVectors } from "@/lib/retrieval/vector-utils";

export type CreateMemoryInput = {
  storyId: string;
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
  const memory = await prisma.memory.create({
    data: {
      storyId: input.storyId,
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

  if (input.generateEmbedding ?? true) {
    const { embedding, model } = await embedText(input.summary ?? input.content);
    await prisma.memory.update({
      where: { id: memory.id },
      data: {
        embedding: toJsonString(embedding),
        embeddingModel: model,
        embeddingDimensions: embedding.length,
      },
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
  if (!input.query?.trim()) {
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

  const { embedding } = await embedText(input.query);
  const candidates = await prisma.memory.findMany({
    where: {
      storyId: input.storyId,
      memoryType: input.memoryTypes?.length
        ? { in: input.memoryTypes }
        : undefined,
    },
    orderBy: [{ salience: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  return rankVectors(
    embedding,
    candidates.flatMap((memory) => {
      const memoryEmbedding = parseEmbedding(memory.embedding);
      return memoryEmbedding
        ? [
            {
              item: memory,
              embedding: memoryEmbedding,
              salience: memory.salience,
              emotionalWeight: memory.emotionalWeight,
              createdAt: memory.createdAt,
            },
          ]
        : [];
    }),
    {
      threshold: input.threshold ?? 0.7,
      limit: input.limit ?? 12,
    },
  ).map((result) => ({
    ...result.item,
    similarity: result.similarity,
    finalScore: result.finalScore,
  }));
}

export async function generateEmbeddingForText(input: {
  storyId: string;
  ownerType: string;
  ownerId: string;
  text: string;
  metadata?: unknown;
}) {
  const config = getModelConfig();
  const { embedding, model } = await embedText(input.text);

  await prisma.embedding.create({
    data: {
      storyId: input.storyId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      model,
      dimensions: embedding.length,
      chunkText: input.text,
      embedding: toJsonString(embedding),
      metadata: toJsonString(input.metadata),
    },
  });

  return {
    model: model ?? config.embeddingModel,
    dimensions: embedding.length,
  };
}
