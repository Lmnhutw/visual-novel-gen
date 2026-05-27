import { z } from "zod";

export const uuidSchema = z.string().min(1);

export const storyStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const characterRoleSchema = z.enum([
  "PROTAGONIST",
  "ANTAGONIST",
  "SUPPORTING",
  "BACKGROUND",
]);
export const characterStatusSchema = z.enum([
  "ACTIVE",
  "ABSENT",
  "INJURED",
  "UNCONSCIOUS",
  "DEAD",
  "UNKNOWN",
]);
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
  nsfwPolicy: z.record(z.unknown()).optional(),
});

export const updateStorySchema = createStorySchema
  .partial()
  .extend({ status: storyStatusSchema.optional() });

export const createCharacterSchema = z.object({
  storyId: uuidSchema,
  name: z.string().min(1),
  role: characterRoleSchema.optional(),
  status: characterStatusSchema.optional(),
  ageConfirmed: z.boolean().optional(),
  personality: z.record(z.unknown()).optional(),
  voiceRules: z.string().optional(),
  backstory: z.string().optional(),
  appearance: z.record(z.unknown()).optional(),
  boundaries: z.record(z.unknown()).optional(),
  motivations: z.record(z.unknown()).optional(),
});

export const updateCharacterSchema = createCharacterSchema
  .omit({ storyId: true })
  .partial();

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
  activeCharacterIds: z.array(uuidSchema).default([]),
  maturityMode: z.enum(["safe", "mature"]).default("safe"),
  maxTokens: z.number().int().min(500).max(12000).default(2500),
  previewOnly: z.boolean().default(false),
});

export const reviseChapterSchema = generateSceneSchema.extend({
  previousDraft: z.string().min(1),
});

export const retrieveContextSchema = z.object({
  storyId: uuidSchema,
  query: z.string().optional(),
  activeCharacterIds: z.array(uuidSchema).default([]),
  memoryTypes: z.array(z.string()).optional(),
  maxMemories: z.number().int().min(1).max(50).default(12),
  includeSecrets: z.boolean().default(true),
});

export const createMemorySchema = z.object({
  storyId: uuidSchema,
  sourceType: z.string().min(1),
  sourceId: uuidSchema.optional(),
  memoryType: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().optional(),
  salience: z.number().min(0).max(1).optional(),
  emotionalWeight: z.number().min(0).max(1).optional(),
  entities: z.record(z.unknown()).optional(),
  generateEmbedding: z.boolean().default(true),
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
