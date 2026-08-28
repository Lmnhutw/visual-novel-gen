import type { Prisma } from "@prisma/client";

import { WorkflowError } from "@/lib/http/api-response";
import { prisma } from "@/lib/db/prisma";
import type { CreateCharacterInput } from "@/lib/validators/character.schema";
import {
  createCharacterTemplateSchema,
  type CreateCharacterTemplateInput,
} from "@/lib/validators/character.schema";

const LOCAL_TEMPLATE_OWNER = "local-workspace";

type TemplateProfile = Record<string, unknown>;

function ownerIdFor(actorId: string | null) {
  return actorId ?? LOCAL_TEMPLATE_OWNER;
}

function snapshot<T>(value: T) {
  return value === undefined ? value : structuredClone(value);
}

export function profileForTemplate(input: CreateCharacterTemplateInput): TemplateProfile {
  const arc = input.characterArc
    ? { ...snapshot(input.characterArc), completedMilestones: [] }
    : undefined;

  return {
    personality: snapshot(input.personality),
    talents: snapshot(input.talents),
    appearance: snapshot(input.appearance),
    speech: snapshot(input.speech),
    relationshipPreference: snapshot(input.relationshipPreference),
    background: snapshot(input.background),
    characterArc: arc,
  };
}

function profileForStory(profile: TemplateProfile) {
  const profileSnapshot = snapshot(profile);
  const arc = profileSnapshot.characterArc;
  return {
    personality: (profileSnapshot.personality ?? {
      summary: "No personality summary has been recorded.",
    }) as Prisma.InputJsonValue,
    talents: profileSnapshot.talents as Prisma.InputJsonValue | undefined,
    appearance: profileSnapshot.appearance as Prisma.InputJsonValue | undefined,
    speech: profileSnapshot.speech as Prisma.InputJsonValue | undefined,
    relationshipPreference: profileSnapshot.relationshipPreference as
      | Prisma.InputJsonValue
      | undefined,
    background: profileSnapshot.background as Prisma.InputJsonValue | undefined,
    characterArc: arc
      ? ({ ...(arc as Record<string, unknown>), completedMilestones: [] } as Prisma.InputJsonValue)
      : undefined,
  };
}

function characterDataFromTemplate(input: {
  storyId: string;
  sourceTemplateId?: string;
  name: string;
  aliases: string[];
  ageConfirmed: boolean;
  gender: string;
  age: number;
  race: string | null;
  occupation: string | null;
  archetypes: string[];
  profile: TemplateProfile;
  role?: string;
}): Prisma.CharacterCreateArgs["data"] {
  return {
    storyId: input.storyId,
    sourceTemplateId: input.sourceTemplateId,
    name: input.name,
    aliases: input.aliases,
    role: input.role ?? "SUPPORTING",
    status: "ACTIVE",
    ageConfirmed: input.ageConfirmed,
    gender: input.gender,
    age: input.age,
    race: input.race,
    occupation: input.occupation,
    archetypes: input.archetypes,
    profile: { create: profileForStory(input.profile) },
  };
}

async function assertStoryAccess(
  tx: Prisma.TransactionClient,
  storyId: string,
  actorId: string | null,
) {
  const story = await tx.story.findFirst({
    where: actorId ? { id: storyId, ownerId: actorId } : { id: storyId },
    select: { id: true },
  });
  if (!story) {
    throw new WorkflowError("STORY_NOT_FOUND", "Story not found.", 404);
  }
}

async function getOwnedTemplate(
  tx: Prisma.TransactionClient,
  templateId: string,
  actorId: string | null,
) {
  const template = await tx.characterTemplate.findFirst({
    where: { id: templateId, ownerId: ownerIdFor(actorId) },
  });
  if (!template) {
    throw new WorkflowError(
      "CHARACTER_TEMPLATE_NOT_FOUND",
      "Character template not found.",
      404,
    );
  }
  return template;
}

export async function listCharacterTemplates(
  actorId: string | null,
  query?: string,
) {
  return prisma.characterTemplate.findMany({
    where: {
      ownerId: ownerIdFor(actorId),
      name: query?.trim() ? { contains: query.trim(), mode: "insensitive" } : undefined,
    },
    orderBy: { name: "asc" },
  });
}

export async function createCharacterTemplate(
  actorId: string | null,
  input: CreateCharacterTemplateInput,
) {
  const parsed = createCharacterTemplateSchema.parse(input);
  return prisma.characterTemplate.create({
    data: {
      ownerId: ownerIdFor(actorId),
      name: parsed.name,
      aliases: parsed.aliases,
      ageConfirmed: parsed.ageConfirmed ?? false,
      gender: parsed.gender,
      age: parsed.age,
      race: parsed.race,
      occupation: parsed.occupation,
      archetypes: parsed.archetypes,
      profile: profileForTemplate(parsed) as Prisma.InputJsonValue,
    },
  });
}

export async function updateCharacterTemplate(
  actorId: string | null,
  templateId: string,
  input: CreateCharacterTemplateInput,
) {
  const parsed = createCharacterTemplateSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    await getOwnedTemplate(tx, templateId, actorId);
    return tx.characterTemplate.update({
      where: { id: templateId },
      data: {
        name: parsed.name,
        aliases: parsed.aliases,
        ageConfirmed: parsed.ageConfirmed ?? false,
        gender: parsed.gender,
        age: parsed.age,
        race: parsed.race,
        occupation: parsed.occupation,
        archetypes: parsed.archetypes,
        profile: profileForTemplate(parsed) as Prisma.InputJsonValue,
      },
    });
  });
}

export async function deleteCharacterTemplate(
  actorId: string | null,
  templateId: string,
) {
  return prisma.$transaction(async (tx) => {
    await getOwnedTemplate(tx, templateId, actorId);
    await tx.characterTemplate.delete({ where: { id: templateId } });
    return { deleted: true };
  });
}

export async function copyCharacterTemplateToStory(input: {
  actorId: string | null;
  storyId: string;
  templateId: string;
  role?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await assertStoryAccess(tx, input.storyId, input.actorId);
    const template = await getOwnedTemplate(tx, input.templateId, input.actorId);
    const nameConflict = await tx.character.findFirst({
      where: { storyId: input.storyId, name: template.name },
      select: { id: true },
    });
    if (nameConflict) {
      throw new WorkflowError(
        "CHARACTER_NAME_CONFLICT",
        "This story already has a character with that name. Rename the Library item or create a manual copy.",
        409,
      );
    }
    return tx.character.create({
      data: characterDataFromTemplate({
        storyId: input.storyId,
        sourceTemplateId: template.id,
        name: template.name,
        aliases: template.aliases,
        ageConfirmed: template.ageConfirmed,
        gender: template.gender,
        age: template.age,
        race: template.race,
        occupation: template.occupation,
        archetypes: template.archetypes,
        profile: template.profile as TemplateProfile,
        role: input.role,
      }),
      include: { profile: true },
    });
  });
}

export async function duplicateCharacterForEdit(
  actorId: string | null,
  characterId: string,
): Promise<CreateCharacterInput> {
  return prisma.$transaction(async (tx) => {
    const character = await tx.character.findFirst({
      where: actorId
        ? { id: characterId, story: { ownerId: actorId } }
        : { id: characterId },
      include: { profile: true },
    });
    if (!character) {
      throw new WorkflowError("CHARACTER_NOT_FOUND", "Character not found.", 404);
    }

    const names = await tx.character.findMany({
      where: { storyId: character.storyId },
      select: { name: true },
    });
    const used = new Set(names.map((entry) => entry.name.toLocaleLowerCase()));
    const base = `${character.name} Copy`;
    let name = base;
    let suffix = 2;
    while (used.has(name.toLocaleLowerCase())) name = `${base} ${suffix++}`;

    const profile = (character.profile ?? {}) as unknown as TemplateProfile;
    return {
      storyId: character.storyId,
      name,
      aliases: character.aliases,
      role: "SUPPORTING",
      status: "ACTIVE",
      ageConfirmed: character.ageConfirmed,
      gender: character.gender as CreateCharacterInput["gender"],
      age: character.age,
      race: character.race ?? undefined,
      occupation: character.occupation ?? undefined,
      archetypes: character.archetypes as CreateCharacterInput["archetypes"],
      personality: profile.personality as CreateCharacterInput["personality"],
      talents: profile.talents as CreateCharacterInput["talents"],
      appearance: profile.appearance as CreateCharacterInput["appearance"],
      speech: profile.speech as CreateCharacterInput["speech"],
      relationshipPreference: profile.relationshipPreference as CreateCharacterInput["relationshipPreference"],
      background: profile.background as CreateCharacterInput["background"],
      characterArc: profile.characterArc
        ? ({ ...(profile.characterArc as object), completedMilestones: [] } as CreateCharacterInput["characterArc"])
        : undefined,
    };
  });
}
