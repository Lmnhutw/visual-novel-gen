import { z } from "zod";
import {
  archetypes,
  bodyScales,
  bodyTypes,
  femaleBodyScales,
  genders,
  loveLanguages,
  relationshipPartnerPreferences,
  relationshipSelfPreferences,
} from "@/lib/types/character";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const requiredText = z.string().trim().min(1);

const stringArray = z.array(z.string().trim().min(1));
const defaultStringArray = stringArray.default([]);
const optionalStringArray = stringArray.optional();

const genderSchema = z.enum(genders);
const archetypeSchema = z.enum(archetypes);
const bodyTypeSchema = z.enum(bodyTypes);
const femaleBodyScaleSchema = z.enum(femaleBodyScales);
const bodyScaleSchema = z.enum(bodyScales);
const relationshipSelfPreferenceSchema = z.enum(relationshipSelfPreferences);
const relationshipPartnerPreferenceSchema = z.enum(relationshipPartnerPreferences);
const loveLanguageSchema = z.enum(loveLanguages);

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

function rejectDuplicateArchetypes(values: string[], ctx: z.RefinementCtx) {
  if (new Set(values).size !== values.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Duplicate archetypes are not allowed.",
      path: ["archetypes"],
    });
  }
}

const archetypesSchema = z
  .array(archetypeSchema)
  .default([])
  .superRefine(rejectDuplicateArchetypes);

const updateArchetypesSchema = z
  .array(archetypeSchema)
  .superRefine(rejectDuplicateArchetypes)
  .optional();

const createPersonalitySchema = z
  .object({
    summary: requiredText,
    traits: defaultStringArray,
    strengths: defaultStringArray,
    weaknesses: defaultStringArray,
    fears: defaultStringArray,
    desires: defaultStringArray,
    goals: defaultStringArray,
    values: defaultStringArray,
    habits: defaultStringArray,
    quirks: defaultStringArray,
  })
  .strict();

const updatePersonalitySchema = z
  .object({
    summary: optionalText,
    traits: optionalStringArray,
    strengths: optionalStringArray,
    weaknesses: optionalStringArray,
    fears: optionalStringArray,
    desires: optionalStringArray,
    goals: optionalStringArray,
    values: optionalStringArray,
    habits: optionalStringArray,
    quirks: optionalStringArray,
  })
  .strict();

const talentSchema = z
  .object({
    giftednessLevel: z
      .enum(["none", "talented", "gifted", "genius", "prodigy"])
      .default("none"),
    talents: defaultStringArray,
    limitations: defaultStringArray,
  })
  .strict();

const updateTalentSchema = z
  .object({
    giftednessLevel: z
      .enum(["none", "talented", "gifted", "genius", "prodigy"])
      .optional(),
    talents: optionalStringArray,
    limitations: optionalStringArray,
  })
  .strict();

const femaleBodySchema = z
  .object({
    chestSize: femaleBodyScaleSchema.optional(),
    waistSize: femaleBodyScaleSchema.optional(),
    hipSize: femaleBodyScaleSchema.optional(),
  })
  .strict();

const maleBodySchema = z
  .object({
    shoulderWidth: bodyScaleSchema.optional(),
    muscleMass: bodyScaleSchema.optional(),
  })
  .strict();

const appearanceSchema = z
  .object({
    heightCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    bodyType: bodyTypeSchema.optional(),
    faceDescription: optionalText,
    hairColor: optionalText,
    hairStyle: optionalText,
    eyeColor: optionalText,
    skinTone: optionalText,
    clothingStyle: optionalText,
    distinctiveFeatures: defaultStringArray,
    femaleBody: femaleBodySchema.optional(),
    maleBody: maleBodySchema.optional(),
  })
  .strict();

const updateAppearanceSchema = z
  .object({
    heightCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    bodyType: bodyTypeSchema.optional(),
    faceDescription: optionalText,
    hairColor: optionalText,
    hairStyle: optionalText,
    eyeColor: optionalText,
    skinTone: optionalText,
    clothingStyle: optionalText,
    distinctiveFeatures: optionalStringArray,
    femaleBody: femaleBodySchema.optional(),
    maleBody: maleBodySchema.optional(),
  })
  .strict();

const speechSchema = z
  .object({
    speakingStyle: optionalText,
    vocabularyLevel: z.enum(["simple", "normal", "educated", "academic"]).optional(),
    profanityLevel: z.enum(["none", "light", "medium", "heavy"]).optional(),
    catchphrases: defaultStringArray,
    dialogueNotes: optionalText,
  })
  .strict();

const updateSpeechSchema = z
  .object({
    speakingStyle: optionalText,
    vocabularyLevel: z.enum(["simple", "normal", "educated", "academic"]).optional(),
    profanityLevel: z.enum(["none", "light", "medium", "heavy"]).optional(),
    catchphrases: optionalStringArray,
    dialogueNotes: optionalText,
  })
  .strict();

const relationshipPreferenceSchema = z
  .object({
    attractedToGenders: z.array(genderSchema).optional(),
    self: relationshipSelfPreferenceSchema.optional(),
    partner: relationshipPartnerPreferenceSchema.optional(),
    loveLanguages: z.array(loveLanguageSchema).optional(),
    preferredTraits: defaultStringArray,
    turnOns: defaultStringArray,
    turnOffs: defaultStringArray,
    jealousyTolerance: z.number().int().min(0).max(100).optional(),
    possessiveness: z.number().int().min(0).max(100).optional(),
    notes: optionalText,
  })
  .strict();

const updateRelationshipPreferenceSchema = z
  .object({
    attractedToGenders: z.array(genderSchema).optional(),
    self: relationshipSelfPreferenceSchema.optional(),
    partner: relationshipPartnerPreferenceSchema.optional(),
    loveLanguages: z.array(loveLanguageSchema).optional(),
    preferredTraits: optionalStringArray,
    turnOns: optionalStringArray,
    turnOffs: optionalStringArray,
    jealousyTolerance: z.number().int().min(0).max(100).optional(),
    possessiveness: z.number().int().min(0).max(100).optional(),
    notes: optionalText,
  })
  .strict();

const backgroundSchema = z
  .object({
    birthplace: optionalText,
    family: optionalText,
    education: optionalText,
    socialClass: optionalText,
    majorLifeEvents: defaultStringArray,
    trauma: defaultStringArray,
    secrets: defaultStringArray,
  })
  .strict();

const updateBackgroundSchema = z
  .object({
    birthplace: optionalText,
    family: optionalText,
    education: optionalText,
    socialClass: optionalText,
    majorLifeEvents: optionalStringArray,
    trauma: optionalStringArray,
    secrets: optionalStringArray,
  })
  .strict();

const characterStateSchema = z
  .object({
    physicalState: optionalText,
    emotionalState: optionalText,
    mentalState: optionalText,
    currentGoals: defaultStringArray,
    currentConflicts: defaultStringArray,
    currentLocation: optionalText,
  })
  .strict();

const updateCharacterStateProfileSchema = z
  .object({
    physicalState: optionalText,
    emotionalState: optionalText,
    mentalState: optionalText,
    currentGoals: optionalStringArray,
    currentConflicts: optionalStringArray,
    currentLocation: optionalText,
  })
  .strict();

const characterArcSchema = z
  .object({
    initialState: optionalText,
    desiredGrowth: optionalText,
    internalConflict: optionalText,
    externalConflict: optionalText,
    completedMilestones: defaultStringArray,
  })
  .strict();

const updateCharacterArcSchema = z
  .object({
    initialState: optionalText,
    desiredGrowth: optionalText,
    internalConflict: optionalText,
    externalConflict: optionalText,
    completedMilestones: optionalStringArray,
  })
  .strict();

function validateGenderedBody(
  gender: z.infer<typeof genderSchema> | undefined,
  appearance:
    | { femaleBody?: unknown; maleBody?: unknown }
    | null
    | undefined,
  ctx: z.RefinementCtx,
) {
  if (!appearance || !gender) {
    return;
  }

  if (appearance.femaleBody !== undefined && gender !== "female") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "appearance.femaleBody is only valid for female characters.",
      path: ["appearance", "femaleBody"],
    });
  }

  if (appearance.maleBody !== undefined && gender !== "male") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "appearance.maleBody is only valid for male characters.",
      path: ["appearance", "maleBody"],
    });
  }
}

const createCharacterBaseSchema = z
  .object({
    storyId: z.string().min(1),
    name: requiredText,
    aliases: defaultStringArray,
    role: characterRoleSchema.optional(),
    status: characterStatusSchema.optional(),
    ageConfirmed: z.boolean().optional(),
    gender: genderSchema,
    age: z.number().int().positive().max(10_000),
    race: optionalText,
    occupation: optionalText,
    archetypes: archetypesSchema,
    personality: createPersonalitySchema,
    talents: talentSchema.optional(),
    appearance: appearanceSchema.optional(),
    speech: speechSchema.optional(),
    relationshipPreference: relationshipPreferenceSchema.optional(),
    background: backgroundSchema.optional(),
    currentState: characterStateSchema.optional(),
    characterArc: characterArcSchema.optional(),
  })
  .strict();

export const createCharacterSchema = createCharacterBaseSchema.superRefine(
  (value, ctx) => validateGenderedBody(value.gender, value.appearance, ctx),
);

export const createCharacterTemplateSchema = createCharacterBaseSchema
  .omit({ storyId: true, role: true, status: true, currentState: true })
  .superRefine((value, ctx) => validateGenderedBody(value.gender, value.appearance, ctx));

export const updateCharacterSchema = z
  .object({
    name: requiredText.optional(),
    aliases: optionalStringArray,
    role: characterRoleSchema.optional(),
    status: characterStatusSchema.optional(),
    ageConfirmed: z.boolean().optional(),
    gender: genderSchema.optional(),
    age: z.number().int().positive().max(10_000).optional(),
    race: optionalText,
    occupation: optionalText,
    archetypes: updateArchetypesSchema,
    personality: updatePersonalitySchema.optional(),
    talents: updateTalentSchema.optional(),
    appearance: updateAppearanceSchema.nullable().optional(),
    speech: updateSpeechSchema.optional(),
    relationshipPreference: updateRelationshipPreferenceSchema.nullable().optional(),
    background: updateBackgroundSchema.optional(),
    currentState: updateCharacterStateProfileSchema.optional(),
    characterArc: updateCharacterArcSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) =>
    validateGenderedBody(value.gender, value.appearance, ctx),
  );

export const characterResponseSchema = createCharacterBaseSchema
  .omit({ storyId: true })
  .extend({
    id: z.string().min(1),
    storyId: z.string().min(1),
    createdAt: z.date(),
    updatedAt: z.date(),
  });

export type CreateCharacterInput = z.input<typeof createCharacterSchema>;
export type CreateCharacterTemplateInput = z.input<typeof createCharacterTemplateSchema>;
export type UpdateCharacterInput = z.input<typeof updateCharacterSchema>;

export const randomizableCharacterSections = [
  "personality",
  "archetypes",
  "talents",
  "appearance",
  "speech",
  "relationshipPreference",
  "background",
  "currentState",
  "characterArc",
] as const;

export type RandomizableCharacterSection =
  (typeof randomizableCharacterSections)[number];

export const randomizedCharacterSectionSchema = z.discriminatedUnion(
  "section",
  [
    z.object({ section: z.literal("personality"), personality: createPersonalitySchema }).strict(),
    z.object({ section: z.literal("archetypes"), archetypes: archetypesSchema }).strict(),
    z.object({ section: z.literal("talents"), talents: talentSchema }).strict(),
    z.object({ section: z.literal("appearance"), appearance: appearanceSchema }).strict(),
    z.object({ section: z.literal("speech"), speech: speechSchema }).strict(),
    z.object({ section: z.literal("relationshipPreference"), relationshipPreference: relationshipPreferenceSchema }).strict(),
    z.object({ section: z.literal("background"), background: backgroundSchema }).strict(),
    z.object({ section: z.literal("currentState"), currentState: characterStateSchema }).strict(),
    z.object({ section: z.literal("characterArc"), characterArc: characterArcSchema }).strict(),
  ],
);

export type RandomizedCharacterSection = z.output<
  typeof randomizedCharacterSectionSchema
>;
