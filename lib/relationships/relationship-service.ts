import { optionalJsonString, toJsonString } from "@/lib/db/json";
import { prisma } from "@/lib/db/prisma";
import { WorkflowError } from "@/lib/http/api-response";
import { assertStoryReferences } from "@/lib/security/story-references";

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
  const ids = [...new Set([input.characterAId, input.characterBId])];
  const count = await prisma.character.count({ where: { id: { in: ids }, storyId: input.storyId } });
  if (count !== ids.length) {
    throw new WorkflowError("INVALID_STORY_REFERENCE", "Both characters must be in this story.", 404);
  }
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

    if (relationship.characterA.storyId !== relationship.storyId ||
      relationship.characterB.storyId !== relationship.storyId) {
      throw new WorkflowError("INVALID_STORY_REFERENCE", "Both characters must be in this story.", 404);
    }

    if (input.changeSummary) {
      await assertStoryReferences(relationship.storyId, input, tx);
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
