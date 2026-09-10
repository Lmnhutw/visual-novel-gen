import { z } from "zod";
import { writingHarnessSchema } from "@/lib/writing-harness/config";
export {
  characterRoleSchema,
  characterStatusSchema,
  createCharacterSchema,
  updateCharacterSchema,
} from "@/lib/validators/character.schema";

export const uuidSchema = z.string().min(1);

export const storyStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const chapterLengthSchema = z
  .object({
    targetWords: z.number().int().positive().default(5000),
    softLimitWords: z.number().int().positive().default(5500),
    hardLimitWords: z.number().int().positive().default(6000),
    autoAdvance: z.boolean().default(true),
  })
  .refine(
    (value) =>
      value.targetWords <= value.softLimitWords &&
      value.softLimitWords <= value.hardLimitWords,
    { message: "Chapter word limits must satisfy target <= soft <= hard." },
  );
export const relationshipStatusSchema = z.enum([
  "NEUTRAL",
  "ALLIED",
  "ROMANTIC",
  "CONFLICTED",
  "ESTRANGED",
  "HOSTILE",
  "UNKNOWN",
]);

export const createStorySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  genre: z.array(z.string()).default([]),
  tone: z.string().optional(),
  pov: z.string().optional(),
  tense: z.string().optional(),
  styleGuide: z.string().optional(),
  writingHarness: writingHarnessSchema.optional(),
  nsfwPolicy: z.record(z.unknown()).optional(),
  chapterLength: chapterLengthSchema.optional(),
});

export const updateStorySchema = createStorySchema
  .partial()
  .extend({
    status: storyStatusSchema.optional(),
    primaryProtagonistId: uuidSchema.nullable().optional(),
  });

export { createCharacterTemplateSchema } from "@/lib/validators/character.schema";

export const updateCharacterStateSchema = z.object({
  characterId: uuidSchema.optional(),
  chapterId: uuidSchema.optional(),
  sceneId: uuidSchema.optional(),
  location: z.string().optional(),
  emotionalState: z.record(z.unknown()).optional(),
  physicalState: z.record(z.unknown()).optional(),
  goals: z.record(z.unknown()).optional(),
});

export const createRelationshipSchema = z.object({
  storyId: uuidSchema,
  characterAId: uuidSchema,
  characterBId: uuidSchema,
  type: z.string().min(1),
  trust: z.number().int().min(-100).max(100).optional(),
  intimacy: z.number().int().min(0).max(100).optional(),
  conflict: z.number().int().min(0).max(100).optional(),
  status: relationshipStatusSchema.optional(),
  boundaries: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export const updateRelationshipSchema = createRelationshipSchema
  .omit({ storyId: true, characterAId: true, characterBId: true })
  .partial()
  .extend({
    changeSummary: z.string().optional(),
    sceneId: uuidSchema.optional(),
    eventId: uuidSchema.optional(),
    emotionalWeight: z.number().min(0).max(1).optional(),
  });

export const generateSceneSchema = z.object({
  storyId: uuidSchema,
  chapterId: uuidSchema.optional(),
  goal: z.string().min(10),
  sceneGoal: z.string().optional(),
  povCharacterId: uuidSchema.optional(),
  activeCharacterIds: z.array(uuidSchema).optional(),
  maturityMode: z.enum(["safe", "mature"]).default("safe"),
  maxTokens: z.number().int().min(500).max(12000).default(2500),
  previewOnly: z.boolean().default(false),
  chapterMode: z.enum(["auto", "normal", "closing"]).default("auto"),
});

export const createGenerationJobSchema = generateSceneSchema.extend({
  includeSecrets: z.boolean().default(false),
  contextTokenBudget: z.number().int().min(1000).max(20000).default(6000),
  idempotencyKey: z.string().min(8).max(200).optional(),
  type: z.enum(["scene", "chapter", "revision"]).default("scene"),
});

export const reviewCanonChangeProposalSchema = z.object({
  decision: z.enum(["accept", "reject"]),
});

export const reviewContinuityIssueSchema = z.object({
  decision: z.enum(["resolve", "dismiss"]),
});

export const commitDraftSchema = z.object({
  content: z.string().min(1).optional(),
  action: z.enum(["continue", "end_chapter"]).default("continue"),
  allowContinuityReview: z.boolean().default(false),
});

export const fallbackDecisionSchema = z.object({
  decision: z.enum(["approve", "decline"]),
});

export const reviseChapterSchema = generateSceneSchema.extend({
  previousDraft: z.string().min(1),
});

export const createChapterSchema = z.object({
  storyId: uuidSchema,
  number: z.number().int().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(["OUTLINE", "DRAFT", "COMPLETE", "ARCHIVED"]).default("OUTLINE"),
});

export const retrieveContextSchema = z.object({
  storyId: uuidSchema,
  chapterId: uuidSchema.optional(),
  query: z.string().optional(),
  activeCharacterIds: z.array(uuidSchema).optional(),
  memoryTypes: z.array(z.string()).optional(),
  maxMemories: z.number().int().min(1).max(50).default(12),
  includeSecrets: z.boolean().default(true),
  tokenBudget: z.number().int().min(1000).max(20000).default(6000),
});

export const createMemorySchema = z.object({
  storyId: uuidSchema,
  characterId: uuidSchema.optional(),
  chapterId: uuidSchema.optional(),
  sceneId: uuidSchema.optional(),
  sourceType: z.string().min(1),
  sourceId: uuidSchema.optional(),
  memoryType: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().optional(),
  salience: z.number().min(0).max(1).optional(),
  emotionalWeight: z.number().min(0).max(1).optional(),
  entities: z.record(z.unknown()).optional(),
  generateEmbedding: z.boolean().default(false),
});

export const searchMemoriesSchema = z.object({
  storyId: uuidSchema,
  query: z.string().optional(),
  memoryTypes: z.array(z.string()).optional(),
  threshold: z.number().min(0).max(1).optional(),
  limit: z.number().int().min(1).max(50).default(12),
});

export const extractMemoriesSchema = z.object({
  storyId: uuidSchema,
  draft: z.string().min(1),
  contextSummary: z.string().optional(),
  persist: z.boolean().default(false),
});

export const checkContinuitySchema = z.object({
  storyId: uuidSchema,
  draft: z.string().min(1),
  query: z.string().optional(),
  activeCharacterIds: z.array(uuidSchema).default([]),
  sceneId: uuidSchema.optional(),
  chapterId: uuidSchema.optional(),
  generationRunId: uuidSchema.optional(),
  maturityMode: z.enum(["safe", "mature"]).default("safe"),
  useLlm: z.boolean().default(true),
  persist: z.boolean().default(true),
});

export const generateEmbeddingSchema = z.object({
  storyId: uuidSchema,
  ownerType: z.string().min(1),
  ownerId: uuidSchema,
  text: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});
