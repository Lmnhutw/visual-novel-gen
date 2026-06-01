import type { AIProvider, EmbedTextInput, GenerateTextInput } from "@/lib/ai/types";
import { OpenRouterProvider } from "@/lib/ai/openrouter";

const provider: AIProvider = new OpenRouterProvider();

export function getGenerationProvider() {
  return provider;
}

export function getEmbeddingProvider() {
  return provider;
}

export async function generateText(
  prompt: string,
  options: Omit<GenerateTextInput, "prompt"> = {},
) {
  return getGenerationProvider().generateText({ ...options, prompt });
}

export async function embedText(
  text: string,
  options: Omit<EmbedTextInput, "text"> = {},
) {
  return getEmbeddingProvider().embedText({ ...options, text });
}
