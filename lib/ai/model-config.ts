export type ModelConfig = {
  aiProvider: "openrouter";
  generationModel: string;
  freeGenerationModel: string;
  paidFallbackModel: string;
  enableEmbeddings: boolean;
  openRouterBaseUrl: string;
  generationDefaults: {
    temperature: number;
    topP: number;
    maxTokens: number;
    retries: number;
    timeoutMs: number;
  };
};

export function getModelConfig(): ModelConfig {
  const aiProvider = process.env.AI_PROVIDER ?? "openrouter";
  if (aiProvider !== "openrouter") {
    throw new Error(`Unsupported AI_PROVIDER: ${aiProvider}. Use openrouter.`);
  }

  return {
    aiProvider: "openrouter",
    generationModel:
      process.env.GENERATION_MODEL ?? "qwen/qwen-2.5-72b-instruct",
    freeGenerationModel: process.env.FREE_GENERATION_MODEL ?? "nvidia/nemotron-3-ultra-550b-a55b:free",
    paidFallbackModel: process.env.PAID_FALLBACK_MODEL ?? "qwen/qwen-2.5-72b-instruct",
    enableEmbeddings: process.env.ENABLE_EMBEDDINGS === "true",
    openRouterBaseUrl:
      process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    generationDefaults: {
      temperature: 0.75,
      topP: 0.9,
      maxTokens: 4000,
      retries: 2,
      timeoutMs: 60_000,
    },
  };
}
