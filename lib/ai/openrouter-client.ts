import { getModelConfig } from "@/lib/ai/model-config";
import {
  getOptionalServerEnv,
  getRequiredServerEnv,
} from "@/lib/security/env";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateOptions = {
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  responseFormat?: {
    type: "json_object" | "json_schema";
    json_schema?: unknown;
  };
};

export type GenerateResult = {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

type OpenRouterChatResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type OpenRouterEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  model?: string;
  error?: {
    message?: string;
  };
};

function buildUrl(path: string): string {
  const config = getModelConfig();
  return `${config.baseUrl.replace(/\/$/, "")}${path}`;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    authorization: `Bearer ${getRequiredServerEnv("OPENROUTER_API_KEY")}`,
    "content-type": "application/json",
  };

  const referer = getOptionalServerEnv("OPENROUTER_HTTP_REFERER");
  const title = getOptionalServerEnv("OPENROUTER_APP_TITLE");

  if (referer) {
    headers["HTTP-Referer"] = referer;
  }

  if (title) {
    headers["X-Title"] = title;
  }

  return headers;
}

export async function generateText(
  prompt: string,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const config = getModelConfig();
  const model = options.model ?? config.generationModel;

  const response = await fetch(buildUrl("/chat/completions"), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt } satisfies ChatMessage],
      temperature:
        options.temperature ?? config.generationDefaults.temperature,
      top_p: options.topP ?? config.generationDefaults.topP,
      max_tokens: options.maxTokens ?? config.generationDefaults.maxTokens,
      response_format: options.responseFormat,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OpenRouterChatResponse;

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message ?? `OpenRouter generation failed: ${response.status}`,
    );
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("OpenRouter generation returned an empty response.");
  }

  return {
    text,
    model: data.model ?? model,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

export async function embedText(input: string): Promise<{
  embedding: number[];
  model: string;
}> {
  const config = getModelConfig();
  const response = await fetch(buildUrl("/embeddings"), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model: config.embeddingModel,
      input,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as OpenRouterEmbeddingResponse;

  if (!response.ok || data.error) {
    throw new Error(
      data.error?.message ?? `OpenRouter embedding failed: ${response.status}`,
    );
  }

  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("OpenRouter embedding returned no vector.");
  }

  return {
    embedding,
    model: data.model ?? config.embeddingModel,
  };
}
