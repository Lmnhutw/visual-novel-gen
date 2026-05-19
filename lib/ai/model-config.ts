export type ModelConfig = {
  baseUrl: string;
  generationModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
  generationDefaults: {
    temperature: number;
    topP: number;
    repeatPenalty: number;
    contextTokens: number;
  };
};

export function getModelConfig(): ModelConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    generationModel:
      process.env.OLLAMA_GENERATION_MODEL ?? "qwen2.5:7b-instruct",
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? "embeddinggemma",
    embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 768),
    generationDefaults: {
      temperature: 0.75,
      topP: 0.9,
      repeatPenalty: 1.08,
      contextTokens: 32768,
    },
  };
}

