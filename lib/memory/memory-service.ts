import { embedText } from "@/lib/ai/ollama-client";
import { getModelConfig } from "@/lib/ai/model-config";
import { toPrismaJson } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import {
  insertEmbeddingRow,
  searchMemoryVectors,
  updateMemoryEmbedding,
} from "@/lib/db/vector-sql";
import {
  estimateEmotionalWeight,
  estimateSalience,
} from "@/lib/memory/memory-ranking";

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
      entities: toPrismaJson(input.entities),
    },
  });

  if (input.generateEmbedding ?? true) {
    const embedding = await embedText(input.summary ?? input.content);
    await updateMemoryEmbedding(memory.id, embedding);
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

  const embedding = await embedText(input.query);
  return searchMemoryVectors({
    storyId: input.storyId,
    embedding,
    memoryTypes: input.memoryTypes,
    threshold: input.threshold,
    limit: input.limit,
  });
}

export async function generateEmbeddingForText(input: {
  storyId: string;
  ownerType: string;
  ownerId: string;
  text: string;
  metadata?: unknown;
}) {
  const config = getModelConfig();
  const embedding = await embedText(input.text);

  await insertEmbeddingRow({
    storyId: input.storyId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    model: config.embeddingModel,
    dimensions: embedding.length,
    chunkText: input.text,
    embedding,
    metadata: toPrismaJson(input.metadata),
  });

  return {
    model: config.embeddingModel,
    dimensions: embedding.length,
  };
}
