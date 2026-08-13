export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateTextInput = {
  prompt: string;
  messages?: ChatMessage[];
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  responseFormat?: {
    type: "json_object" | "json_schema";
    json_schema?: unknown;
  };
};

export type GenerateTextResult = {
  text: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type EmbedTextInput = {
  text: string;
  model?: string;
};

export type EmbedTextResult = {
  embedding: number[];
  model: string;
};

export interface AIProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  embedText(input: EmbedTextInput): Promise<EmbedTextResult>;
}
