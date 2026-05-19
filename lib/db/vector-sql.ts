import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type MemorySearchRow = {
  id: string;
  story_id: string;
  source_type: string;
  source_id: string | null;
  memory_type: string;
  content: string;
  summary: string | null;
  salience: number;
  emotional_weight: number;
  entities: unknown;
  similarity: number;
  final_score: number;
  created_at: Date;
};

export function toVectorLiteral(values: number[]): string {
  if (values.length === 0) {
    throw new Error("Embedding vector cannot be empty.");
  }

  return `[${values
    .map((value) => {
      if (!Number.isFinite(value)) {
        throw new Error("Embedding vector contains a non-finite value.");
      }

      return Number(value).toFixed(8);
    })
    .join(",")}]`;
}

export async function updateMemoryEmbedding(
  memoryId: string,
  embedding: number[],
): Promise<void> {
  const vector = toVectorLiteral(embedding);

  await prisma.$executeRaw`
    update memories
    set embedding = ${vector}::extensions.vector
    where id = ${memoryId}::uuid
  `;
}

export async function insertEmbeddingRow(input: {
  storyId: string;
  ownerType: string;
  ownerId: string;
  model: string;
  dimensions: number;
  chunkText: string;
  embedding: number[];
  metadata?: unknown;
}): Promise<void> {
  const vector = toVectorLiteral(input.embedding);
  const metadata = JSON.stringify(input.metadata ?? {});

  await prisma.$executeRaw`
    insert into embeddings (
      story_id,
      owner_type,
      owner_id,
      model,
      dimensions,
      chunk_text,
      embedding,
      metadata
    )
    values (
      ${input.storyId}::uuid,
      ${input.ownerType},
      ${input.ownerId}::uuid,
      ${input.model},
      ${input.dimensions},
      ${input.chunkText},
      ${vector}::extensions.vector,
      ${metadata}::jsonb
    )
  `;
}

export async function searchMemoryVectors(input: {
  storyId: string;
  embedding: number[];
  memoryTypes?: string[];
  threshold?: number;
  limit?: number;
}): Promise<MemorySearchRow[]> {
  const vector = toVectorLiteral(input.embedding);
  const threshold = input.threshold ?? 0.7;
  const limit = input.limit ?? 12;
  const memoryTypes = input.memoryTypes?.length ? input.memoryTypes : null;

  return prisma.$queryRaw<MemorySearchRow[]>(Prisma.sql`
    select
      id,
      story_id,
      source_type,
      source_id,
      memory_type,
      content,
      summary,
      salience,
      emotional_weight,
      entities,
      1 - (embedding <=> ${vector}::extensions.vector) as similarity,
      (
        (1 - (embedding <=> ${vector}::extensions.vector)) * 0.45 +
        salience * 0.20 +
        emotional_weight * 0.10
      ) as final_score,
      created_at
    from memories
    where story_id = ${input.storyId}::uuid
      and embedding is not null
      and (${memoryTypes}::text[] is null or memory_type = any(${memoryTypes}::text[]))
      and 1 - (embedding <=> ${vector}::extensions.vector) >= ${threshold}
    order by final_score desc, created_at desc
    limit ${limit}
  `);
}
