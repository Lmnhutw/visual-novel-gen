import { embedText } from "@/lib/ai/provider";
import { getModelConfig } from "@/lib/ai/model-config";

export function formatVectorLiteral(embedding: number[]): string {
  if (
    embedding.length === 0 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Embedding must be a non-empty finite number array.");
  }

  return `[${embedding.join(",")}]`;
}

export async function generateTextEmbedding(input: {
  text: string;
  model?: string;
}) {
  const config = getModelConfig();
  if (!config.enableEmbeddings) {
    throw new Error("Embeddings are disabled by ENABLE_EMBEDDINGS=false.");
  }

  const result = await embedText(input.text, {
    model: input.model,
  });

  return {
    embedding: result.embedding,
    vector: formatVectorLiteral(result.embedding),
    model: result.model,
    dimensions: result.embedding.length,
  };
}
