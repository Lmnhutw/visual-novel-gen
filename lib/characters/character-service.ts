import { optionalJsonString, toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";

type CharacterRole =
  | "PROTAGONIST"
  | "ANTAGONIST"
  | "SUPPORTING"
  | "BACKGROUND";

type CharacterStatus =
  | "ACTIVE"
  | "ABSENT"
  | "INJURED"
  | "UNCONSCIOUS"
  | "DEAD"
  | "UNKNOWN";

export type CreateCharacterInput = {
  storyId: string;
  name: string;
  role?: CharacterRole;
  status?: CharacterStatus;
  ageConfirmed?: boolean;
  personality?: Record<string, unknown>;
  voiceRules?: string;
  backstory?: string;
  appearance?: Record<string, unknown>;
  boundaries?: Record<string, unknown>;
  motivations?: Record<string, unknown>;
};

export async function createCharacter(input: CreateCharacterInput) {
  return prisma.character.create({
    data: {
      storyId: input.storyId,
      name: input.name,
      role: input.role,
      status: input.status,
      ageConfirmed: input.ageConfirmed ?? false,
      profile: {
        create: {
          personality: toJsonString(input.personality),
          voiceRules: input.voiceRules,
          backstory: input.backstory,
          appearance: toJsonString(input.appearance),
          boundaries: toJsonString(input.boundaries),
          motivations: toJsonString(input.motivations),
        },
      },
    },
    include: { profile: true },
  });
}

export async function updateCharacter(
  characterId: string,
  input: Partial<CreateCharacterInput>,
) {
  return prisma.character.update({
    where: { id: characterId },
    data: {
      name: input.name,
      role: input.role,
      status: input.status,
      ageConfirmed: input.ageConfirmed,
      profile: {
        upsert: {
          create: {
            personality: toJsonString(input.personality),
            voiceRules: input.voiceRules,
            backstory: input.backstory,
            appearance: toJsonString(input.appearance),
            boundaries: toJsonString(input.boundaries),
            motivations: toJsonString(input.motivations),
          },
          update: {
            personality: optionalJsonString(input.personality),
            voiceRules: input.voiceRules,
            backstory: input.backstory,
            appearance: optionalJsonString(input.appearance),
            boundaries: optionalJsonString(input.boundaries),
            motivations: optionalJsonString(input.motivations),
          },
        },
      },
    },
    include: { profile: true },
  });
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
  return prisma.characterState.create({
    data: {
      characterId: input.characterId,
      chapterId: input.chapterId,
      sceneId: input.sceneId,
      location: input.location,
      emotionalState: toJsonString(input.emotionalState),
      physicalState: toJsonString(input.physicalState),
      goals: toJsonString(input.goals),
    },
  });
}
