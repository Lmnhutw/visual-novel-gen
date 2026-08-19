import { z } from "zod";

import { generateText } from "@/lib/ai/provider";
import type { GenerateTextInput, GenerateTextResult } from "@/lib/ai/types";

export function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end <= start) {
    throw new Error("Model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export async function generateStructuredObject<TSchema extends z.ZodTypeAny>(input: {
  prompt: string;
  schema: TSchema;
  options?: Omit<GenerateTextInput, "prompt" | "responseFormat">;
  schemaRetries?: number;
}): Promise<{ data: z.output<TSchema>; response: GenerateTextResult }> {
  const schemaRetries = Math.max(0, Math.min(input.schemaRetries ?? 1, 2));
  let lastError: unknown;

  for (let attempt = 0; attempt <= schemaRetries; attempt += 1) {
    const response = await generateText(input.prompt, {
      ...input.options,
      responseFormat: { type: "json_object" },
    });

    try {
      return {
        data: input.schema.parse(parseJsonObject(response.text)),
        response,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Model returned invalid structured output.");
}
