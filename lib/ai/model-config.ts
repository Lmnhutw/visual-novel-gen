export type ModelConfig = {
  baseUrl: string;
  generationModel: string;
  embeddingModel: string;
  generationDefaults: {
    temperature: number;
    topP: number;
    maxTokens: number;
  };
};

export function getModelConfig(): ModelConfig {
  return {
    baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    generationModel:
      process.env.OPENROUTER_GENERATION_MODEL ??
      "qwen/qwen-2.5-72b-instruct",
    embeddingModel:
      process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
    generationDefaults: {
      temperature: 0.75,
      topP: 0.9,
      maxTokens: 4000,
    },
  };
}

