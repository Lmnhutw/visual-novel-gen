import { getModelConfig } from "@/lib/ai/model-config";

type GenerateOptions = {
  model?: string;
  temperature?: number;
  topP?: number;
  repeatPenalty?: number;
  contextTokens?: number;
};

type OllamaGenerateResponse = {
  response?: string;
  error?: string;
};

type OllamaEmbedResponse = {
  embeddings?: number[][];
  error?: string;
};

function buildUrl(path: string): string {
  const config = getModelConfig();
  return `${config.baseUrl.replace(/\/$/, "")}${path}`;
}

export async function generateText(
  prompt: string,
  options: GenerateOptions = {},
): Promise<string> {
  const config = getModelConfig();
  const response = await fetch(buildUrl("/api/generate"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: options.model ?? config.generationModel,
      prompt,
      stream: false,
      options: {
        temperature:
          options.temperature ?? config.generationDefaults.temperature,
        top_p: options.topP ?? config.generationDefaults.topP,
        repeat_penalty:
          options.repeatPenalty ?? config.generationDefaults.repeatPenalty,
        num_ctx: options.contextTokens ?? config.generationDefaults.contextTokens,
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OllamaGenerateResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Ollama generation failed: ${response.status}`);
  }

  if (!data.response) {
    throw new Error("Ollama generation returned an empty response.");
  }

  return data.response;
}

export async function embedText(input: string): Promise<number[]> {
  const config = getModelConfig();
  const response = await fetch(buildUrl("/api/embed"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: config.embeddingModel,
      input,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OllamaEmbedResponse;

  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Ollama embedding failed: ${response.status}`);
  }

  const embedding = data.embeddings?.[0];
  if (!embedding?.length) {
    throw new Error("Ollama embedding returned no vector.");
  }

  return embedding;
}

