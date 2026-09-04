import type {
  AIProvider,
  EmbedTextResult,
  GenerateTextInput,
  GenerateTextResult,
} from "@/lib/ai/types";
import { getModelConfig } from "@/lib/ai/model-config";
import { getRequiredServerEnv } from "@/lib/security/env";

type OpenRouterChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

export class OpenRouterRequestError extends Error {
  constructor(
    message: string,
    public readonly httpStatus?: number,
    public readonly fallbackEligible = false,
  ) { super(message); this.name = "OpenRouterRequestError"; }
}

function isFallbackEligible(status?: number) {
  return status === 408 || status === 429 || (status !== undefined && status >= 500);
}

function buildUrl(path: string): string {
  const config = getModelConfig();
  return `${config.openRouterBaseUrl.replace(/\/$/, "")}${path}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) {
    abortFromParent();
  } else {
    parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  }
  const timeout = setTimeout(
    () => controller.abort(new DOMException("OpenRouter request timed out.", "TimeoutError")),
    timeoutMs,
  );

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

export class OpenRouterProvider implements AIProvider {
  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const config = getModelConfig();
    const model = input.model ?? config.generationModel;
    const retries = input.retries ?? config.generationDefaults.retries;
    const timeoutMs = input.timeoutMs ?? config.generationDefaults.timeoutMs;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await fetchWithTimeout(
          buildUrl("/chat/completions"),
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getRequiredServerEnv("OPENROUTER_API_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: input.messages ?? [
                { role: "user", content: input.prompt },
              ],
              temperature:
                input.temperature ?? config.generationDefaults.temperature,
              top_p: input.topP ?? config.generationDefaults.topP,
              max_tokens:
                input.maxTokens ?? config.generationDefaults.maxTokens,
              response_format: input.responseFormat,
            }),
          },
          timeoutMs,
          input.signal,
        );
        const data = (await response
          .json()
          .catch(() => ({}))) as OpenRouterChatResponse;

        if (!response.ok || data.error) {
          throw new OpenRouterRequestError(
            data.error?.message ?? `OpenRouter generation failed: ${response.status}`,
            response.status,
            isFallbackEligible(response.status),
          );
        }

        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          throw new OpenRouterRequestError("OpenRouter generation returned an empty response.", undefined, true);
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
      } catch (error) {
        if (input.signal?.aborted) {
          throw input.signal.reason instanceof Error
            ? input.signal.reason
            : new Error("OpenRouter generation was cancelled.");
        }
        lastError = error;
        if (attempt === retries) {
          break;
        }
      }
    }

    if (lastError instanceof OpenRouterRequestError) throw lastError;
    if (lastError instanceof DOMException && lastError.name === "AbortError") {
      throw lastError;
    }
    if (
      lastError instanceof TypeError ||
      (lastError instanceof DOMException && lastError.name === "TimeoutError")
    ) {
      throw new OpenRouterRequestError(
        lastError instanceof DOMException
          ? "OpenRouter request timed out."
          : "OpenRouter connection failed.",
        undefined,
        true,
      );
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("OpenRouter generation failed.");
  }

  async embedText(): Promise<EmbedTextResult> {
    throw new Error(
      "Embeddings are disabled for this local-first MVP. Use relational, keyword, recency, and salience retrieval.",
    );
  }
}
