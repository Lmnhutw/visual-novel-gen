import { optionalJsonString, toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";

type RelationshipStatus =
  | "NEUTRAL"
  | "ALLIED"
  | "ROMANTIC"
  | "CONFLICTED"
  | "ESTRANGED"
  | "HOSTILE"
  | "UNKNOWN";

export type CreateRelationshipInput = {
  storyId: string;
  characterAId: string;
  characterBId: string;
  type: string;
  trust?: number;
  intimacy?: number;
  conflict?: number;
  status?: RelationshipStatus;
  boundaries?: Record<string, unknown>;
  notes?: string;
};

export async function createRelationship(input: CreateRelationshipInput) {
  return prisma.relationship.create({
    data: {
      storyId: input.storyId,
      characterAId: input.characterAId,
      characterBId: input.characterBId,
      type: input.type,
      trust: input.trust ?? 0,
      intimacy: input.intimacy ?? 0,
      conflict: input.conflict ?? 0,
      status: input.status,
      boundaries: toJsonString(input.boundaries),
      notes: input.notes,
    },
    include: {
      characterA: true,
      characterB: true,
    },
  });
}

export async function updateRelationship(
  relationshipId: string,
  input: Partial<
    Omit<CreateRelationshipInput, "storyId" | "characterAId" | "characterBId">
  > & {
    changeSummary?: string;
    sceneId?: string;
    eventId?: string;
    emotionalWeight?: number;
  },
) {
  return prisma.$transaction(async (tx) => {
    const relationship = await tx.relationship.update({
      where: { id: relationshipId },
      data: {
        type: input.type,
        trust: input.trust,
        intimacy: input.intimacy,
        conflict: input.conflict,
        status: input.status,
        boundaries: optionalJsonString(input.boundaries),
        notes: input.notes,
      },
      include: {
        characterA: true,
        characterB: true,
      },
    });

    if (input.changeSummary) {
      const delta = Object.fromEntries(
        Object.entries({
          trust: input.trust,
          intimacy: input.intimacy,
          conflict: input.conflict,
          status: input.status,
        }).filter(([, value]) => value !== undefined),
      );

      await tx.relationshipHistory.create({
        data: {
          relationshipId,
          sceneId: input.sceneId,
          eventId: input.eventId,
          changeSummary: input.changeSummary,
          emotionalWeight: input.emotionalWeight ?? 0,
          delta: toJsonString(delta),
        },
      });
    }

    return relationship;
  });
}
