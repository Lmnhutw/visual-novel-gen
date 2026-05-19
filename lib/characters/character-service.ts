import type { CharacterRole, CharacterStatus } from "@prisma/client";

import { optionalPrismaJson, toPrismaJson } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";

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
          personality: toPrismaJson(input.personality),
          voiceRules: input.voiceRules,
          backstory: input.backstory,
          appearance: toPrismaJson(input.appearance),
          boundaries: toPrismaJson(input.boundaries),
          motivations: toPrismaJson(input.motivations),
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
            personality: toPrismaJson(input.personality),
            voiceRules: input.voiceRules,
            backstory: input.backstory,
            appearance: toPrismaJson(input.appearance),
            boundaries: toPrismaJson(input.boundaries),
            motivations: toPrismaJson(input.motivations),
          },
          update: {
            personality: optionalPrismaJson(input.personality),
            voiceRules: input.voiceRules,
            backstory: input.backstory,
            appearance: optionalPrismaJson(input.appearance),
            boundaries: optionalPrismaJson(input.boundaries),
            motivations: optionalPrismaJson(input.motivations),
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
      emotionalState: toPrismaJson(input.emotionalState),
      physicalState: toPrismaJson(input.physicalState),
      goals: toPrismaJson(input.goals),
    },
  });
}
