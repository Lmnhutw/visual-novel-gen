import { z } from "zod";

import { getModelForTask } from "@/lib/ai/model-routing";
import { generateStructuredObject } from "@/lib/ai/structured-output";
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

export async function extractMemoriesFromDraft(input: {
  draft: string;
  contextSummary?: string;
}): Promise<MemoryExtractionResult> {
  const prompt = buildMemoryExtractionPrompt(input);
  const result = await generateStructuredObject({
    prompt,
    schema: MemoryExtractionResultSchema,
    options: {
      model: getModelForTask("extraction"),
      temperature: 0.1,
      topP: 0.8,
    },
  });
  return result.data;
}
