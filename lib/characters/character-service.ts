import { ZodError, type ZodIssue } from "zod";
import type { Prisma } from "@prisma/client";
import { parseJsonString, toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";
import {
  deleteCharacterById,
  findCharacterById,
  findCharactersByStory,
  insertCharacter,
  insertCharacterState,
  updateCharacterById,
  type CharacterProfilePersistence,
  type CharacterRecord,
} from "@/lib/repositories/character-repository";
import {
  archetypes as approvedArchetypes,
  genders,
  type AppearanceProfile,
  type Archetype,
  type BackgroundProfile,
  type Character,
  type CharacterArc,
  type CharacterState,
  type Gender,
  type PersonalityProfile,
  type RelationshipPreferenceProfile,
  type SpeechProfile,
  type TalentProfile,
} from "@/lib/types/character";
import {
  createCharacterSchema,
  updateCharacterSchema,
  type CreateCharacterInput,
  type UpdateCharacterInput,
} from "@/lib/validators/character.schema";

const approvedArchetypeSet = new Set<string>(approvedArchetypes);
const genderSet = new Set<string>(genders);

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function optionalProfile<T>(value: unknown): T | undefined {
  const object = asObject(value);
  return Object.keys(object).length > 0 ? (object as T) : undefined;
}

function normalizePersonality(value: unknown): PersonalityProfile {
  const object = asObject(value);
  const summary =
    typeof object.summary === "string" && object.summary.trim()
      ? object.summary.trim()
      : "No personality summary has been recorded.";

  return {
    summary,
    traits: stringArray(object.traits),
    strengths: stringArray(object.strengths),
    weaknesses: stringArray(object.weaknesses),
    fears: stringArray(object.fears),
    desires: stringArray(object.desires),
    goals: stringArray(object.goals),
    values: stringArray(object.values),
    habits: stringArray(object.habits),
    quirks: stringArray(object.quirks),
  };
}

function removeUndefined(value: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function mergeProfile<T>(
  current: T | undefined,
  patch: Partial<T> | undefined,
): T | undefined {
  if (!patch) {
    return current;
  }

  return {
    ...((current ?? {}) as JsonObject),
    ...removeUndefined(patch as JsonObject),
  } as T;
}

function assertGenderedBody(gender: Gender, appearance?: AppearanceProfile) {
  const issues: ZodIssue[] = [];

  if (appearance?.femaleBody !== undefined && gender !== "female") {
    issues.push({
      code: "custom",
      message: "appearance.femaleBody is only valid for female characters.",
      path: ["appearance", "femaleBody"],
    });
  }

  if (appearance?.maleBody !== undefined && gender !== "male") {
    issues.push({
      code: "custom",
      message: "appearance.maleBody is only valid for male characters.",
      path: ["appearance", "maleBody"],
    });
  }

  if (issues.length > 0) {
    throw new ZodError(issues);
  }
}

function toGender(value: string): Gender {
  return genderSet.has(value) ? (value as Gender) : "other";
}

function toArchetypes(values: string[]): Archetype[] {
  return values.filter((value): value is Archetype =>
    approvedArchetypeSet.has(value),
  );
}

function profilePersistence(input: {
  personality: PersonalityProfile;
  appearance?: AppearanceProfile;
  talents?: TalentProfile;
  speech?: SpeechProfile;
  relationshipPreference?: RelationshipPreferenceProfile;
  background?: BackgroundProfile;
  currentState?: CharacterState;
  characterArc?: CharacterArc;
}): CharacterProfilePersistence {
  const json = (value: unknown): Prisma.InputJsonValue | undefined =>
    value === undefined
      ? undefined
      : (value as unknown as Prisma.InputJsonValue);

  return {
    personality: json(input.personality) ?? {},
    appearance: json(input.appearance),
    talents: json(input.talents),
    speech: json(input.speech),
    relationshipPreference: json(input.relationshipPreference),
    background: json(input.background),
    currentState: json(input.currentState),
    characterArc: json(input.characterArc),
  };
}

export function toCharacterDomain(record: CharacterRecord): Character {
  const profile = record.profile;
  const personality = normalizePersonality(
    parseJsonString(profile?.personality, {}),
  );

  return {
    id: record.id,
    storyId: record.storyId,
    name: record.name,
    aliases: record.aliases,
    gender: toGender(record.gender),
    age: record.age,
    race: record.race ?? undefined,
    species: record.species ?? undefined,
    occupation: record.occupation ?? undefined,
    personality,
    archetypes: toArchetypes(record.archetypes),
    talents: optionalProfile<TalentProfile>(parseJsonString(profile?.talents, {})),
    appearance: optionalProfile<AppearanceProfile>(
      parseJsonString(profile?.appearance, {}),
    ),
    speech: optionalProfile<SpeechProfile>(parseJsonString(profile?.speech, {})),
    relationshipPreference: optionalProfile<RelationshipPreferenceProfile>(
      parseJsonString(profile?.relationshipPreference, {}),
    ),
    background: optionalProfile<BackgroundProfile>(
      parseJsonString(profile?.background, {}),
    ),
    currentState: optionalProfile<CharacterState>(
      parseJsonString(profile?.currentState, {}),
    ),
    characterArc: optionalProfile<CharacterArc>(
      parseJsonString(profile?.characterArc, {}),
    ),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function createCharacter(input: CreateCharacterInput) {
  const parsed = createCharacterSchema.parse(input);
  assertGenderedBody(parsed.gender, parsed.appearance);

  const record = await insertCharacter({
    storyId: parsed.storyId,
    name: parsed.name,
    aliases: parsed.aliases,
    role: parsed.role,
    status: parsed.status,
    ageConfirmed: parsed.ageConfirmed,
    gender: parsed.gender,
    age: parsed.age,
    race: parsed.race,
    species: parsed.species,
    occupation: parsed.occupation,
    archetypes: parsed.archetypes,
    profile: profilePersistence({
      personality: parsed.personality,
      appearance: parsed.appearance,
      talents: parsed.talents,
      speech: parsed.speech,
      relationshipPreference: parsed.relationshipPreference,
      background: parsed.background,
      currentState: parsed.currentState,
      characterArc: parsed.characterArc,
    }),
  });

  return toCharacterDomain(record);
}

export async function updateCharacter(
  characterId: string,
  input: UpdateCharacterInput,
) {
  const parsed = updateCharacterSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const existing = await findCharacterById(characterId, tx);
    if (!existing) throw new Error("Character not found.");

    if (parsed.role && parsed.role !== "PROTAGONIST") {
      const story = await tx.story.findFirst({
        where: { id: existing.storyId, primaryProtagonistId: characterId },
        select: { id: true },
      });
      if (story) {
        throw new WorkflowError(
          "PRIMARY_PROTAGONIST_ROLE_CONFLICT",
          "Clear or replace this story's primary protagonist before changing their role.",
          409,
        );
      }
    }

    const current = toCharacterDomain(existing);
    const gender = parsed.gender ?? current.gender;
    const personality = mergeProfile(current.personality, parsed.personality);
    const appearance = mergeProfile(current.appearance, parsed.appearance);
    const talents = mergeProfile(current.talents, parsed.talents);
    const speech = mergeProfile(current.speech, parsed.speech);
    const relationshipPreference = mergeProfile(current.relationshipPreference, parsed.relationshipPreference);
    const background = mergeProfile(current.background, parsed.background);
    const currentState = mergeProfile(current.currentState, parsed.currentState);
    const characterArc = mergeProfile(current.characterArc, parsed.characterArc);
    assertGenderedBody(gender, appearance);

    const record = await updateCharacterById(characterId, {
      name: parsed.name,
      aliases: parsed.aliases,
      role: parsed.role,
      status: parsed.status,
      ageConfirmed: parsed.ageConfirmed,
      gender: parsed.gender,
      age: parsed.age,
      race: parsed.race,
      species: parsed.species,
      occupation: parsed.occupation,
      archetypes: parsed.archetypes,
      profile: profilePersistence({
        personality: normalizePersonality(personality),
        appearance,
        talents,
        speech,
        relationshipPreference,
        background,
        currentState,
        characterArc,
      }),
    }, tx);
    return toCharacterDomain(record);
  });
}

export async function getCharacterById(characterId: string) {
  const record = await findCharacterById(characterId);
  return record ? toCharacterDomain(record) : null;
}

export async function listCharactersByStory(storyId: string) {
  const records = await findCharactersByStory(storyId);
  return records.map(toCharacterDomain);
}

export async function deleteCharacter(characterId: string) {
  await deleteCharacterById(characterId);
  return { deleted: true };
}

export async function updateCharacterState(input: {
  characterId: string;
  chapterId?: string;
  sceneId?: string;
  location?: string;
  emotionalState?: Record<string, unknown>;
  physicalState?: Record<string, unknown>;
  goals?: Record<string, unknown>;
}) {
  return insertCharacterState({
    characterId: input.characterId,
    chapterId: input.chapterId,
    sceneId: input.sceneId,
    location: input.location,
    emotionalState: toJsonString(input.emotionalState),
    physicalState: toJsonString(input.physicalState),
    goals: toJsonString(input.goals),
  });
}

export type { CreateCharacterInput, UpdateCharacterInput };
