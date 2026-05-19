import { z } from "zod";

import { generateText } from "@/lib/ai/ollama-client";
import { buildMemoryExtractionPrompt } from "@/lib/prompts/prompt-builder";

export const ExtractedMemorySchema = z.object({
  content: z.string().min(1),
  memoryType: z.string().min(1).default("event"),
  salience: z.number().min(0).max(1).default(0.5),
  emotionalWeight: z.number().min(0).max(1).default(0),
  entities: z.record(z.unknown()).default({}),
});

export const MemoryExtractionResultSchema = z.object({
  memories: z.array(ExtractedMemorySchema).default([]),
  events: z
    .array(
      z.object({
        summary: z.string().min(1),
        eventType: z.string().min(1).default("scene_event"),
        salience: z.number().min(0).max(1).default(0.5),
        participants: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  relationshipChanges: z.array(z.record(z.unknown())).default([]),
  characterStateChanges: z.array(z.record(z.unknown())).default([]),
  secretsRevealed: z.array(z.record(z.unknown())).default([]),
  loreUpdates: z.array(z.record(z.unknown())).default([]),
  unresolvedThreads: z.array(z.record(z.unknown())).default([]),
  continuityRisks: z.array(z.record(z.unknown())).default([]),
});

export type MemoryExtractionResult = z.infer<
  typeof MemoryExtractionResultSchema
>;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

export async function extractMemoriesFromDraft(input: {
  draft: string;
  contextSummary?: string;
}): Promise<MemoryExtractionResult> {
  const prompt = buildMemoryExtractionPrompt(input);
  const output = await generateText(prompt, { temperature: 0.1, topP: 0.8 });
  return MemoryExtractionResultSchema.parse(extractJson(output));
}

