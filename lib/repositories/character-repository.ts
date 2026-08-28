import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type DbClient = typeof prisma | Prisma.TransactionClient;

const characterInclude = {
  profile: true,
  states: {
    orderBy: { validFrom: "desc" as const },
    take: 1,
  },
} satisfies Prisma.CharacterInclude;

export type CharacterRecord = Prisma.CharacterGetPayload<{
  include: typeof characterInclude;
}>;

export type CharacterProfilePersistence = {
  personality: Prisma.InputJsonValue;
  appearance?: Prisma.InputJsonValue | null;
  boundaries?: Prisma.InputJsonValue;
  motivations?: Prisma.InputJsonValue;
  talents?: Prisma.InputJsonValue;
  speech?: Prisma.InputJsonValue;
  relationshipPreference?: Prisma.InputJsonValue | null;
  background?: Prisma.InputJsonValue;
  currentState?: Prisma.InputJsonValue;
  characterArc?: Prisma.InputJsonValue;
  voiceRules?: string;
  backstory?: string;
};

export type CreateCharacterPersistenceInput = {
  storyId: string;
  name: string;
  aliases: string[];
  role?: string;
  status?: string;
  ageConfirmed?: boolean;
  gender: string;
  age: number;
  race?: string;
  occupation?: string;
  archetypes: string[];
  profile: CharacterProfilePersistence;
};

export type UpdateCharacterPersistenceInput = Partial<
  Omit<CreateCharacterPersistenceInput, "storyId" | "profile">
> & {
  profile?: CharacterProfilePersistence;
};

function profileCreateData(
  profile: CharacterProfilePersistence,
): Prisma.CharacterProfileCreateWithoutCharacterInput {
  return {
    personality: profile.personality,
    appearance:
      profile.appearance === null ? Prisma.DbNull : profile.appearance,
    boundaries: profile.boundaries,
    motivations: profile.motivations,
    talents: profile.talents,
    speech: profile.speech,
    relationshipPreference:
      profile.relationshipPreference === null
        ? Prisma.DbNull
        : profile.relationshipPreference,
    background: profile.background,
    currentState: profile.currentState,
    characterArc: profile.characterArc,
    voiceRules: profile.voiceRules,
    backstory: profile.backstory,
  };
}

function profileUpdateData(
  profile: CharacterProfilePersistence,
): Prisma.CharacterProfileUpdateOneWithoutCharacterNestedInput {
  return {
    upsert: {
      create: profileCreateData(profile),
      update: profileCreateData(profile),
    },
  };
}

export async function insertCharacter(
  input: CreateCharacterPersistenceInput,
): Promise<CharacterRecord> {
  return prisma.character.create({
    data: {
      storyId: input.storyId,
      name: input.name,
      aliases: input.aliases,
      role: input.role,
      status: input.status,
      ageConfirmed: input.ageConfirmed ?? false,
      gender: input.gender,
      age: input.age,
      race: input.race,
      occupation: input.occupation,
      archetypes: input.archetypes,
      profile: {
        create: profileCreateData(input.profile),
      },
    },
    include: characterInclude,
  });
}

export async function updateCharacterById(
  characterId: string,
  input: UpdateCharacterPersistenceInput,
  db: DbClient = prisma,
): Promise<CharacterRecord> {
  return db.character.update({
    where: { id: characterId },
    data: {
      name: input.name,
      aliases: input.aliases,
      role: input.role,
      status: input.status,
      ageConfirmed: input.ageConfirmed,
      gender: input.gender,
      age: input.age,
      race: input.race,
      occupation: input.occupation,
      archetypes: input.archetypes,
      profile: input.profile ? profileUpdateData(input.profile) : undefined,
    },
    include: characterInclude,
  });
}

export async function findCharacterById(
  characterId: string,
  db: DbClient = prisma,
): Promise<CharacterRecord | null> {
  return db.character.findUnique({
    where: { id: characterId },
    include: characterInclude,
  });
}

export async function findCharactersByStory(
  storyId: string,
): Promise<CharacterRecord[]> {
  return prisma.character.findMany({
    where: { storyId },
    include: characterInclude,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function deleteCharacterById(characterId: string) {
  return prisma.character.delete({
    where: { id: characterId },
  });
}

export async function insertCharacterState(input: {
  characterId: string;
  chapterId?: string;
  sceneId?: string;
  location?: string;
  emotionalState: string;
  physicalState: string;
  goals: string;
}) {
  return prisma.characterState.create({
    data: input,
  });
}
