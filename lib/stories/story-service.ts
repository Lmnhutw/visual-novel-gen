import { prisma } from "@/lib/db/prisma";
import { optionalJsonString, toJsonString } from "@/lib/db/json";
import { WorkflowError } from "@/lib/http/api-response";
import type { WritingHarnessConfig } from "@/lib/writing-harness/config";

export type CreateStoryInput = {
  ownerId?: string;
  title: string;
  description?: string;
  genre?: string[];
  tone?: string;
  pov?: string;
  tense?: string;
  styleGuide?: string;
  writingHarness?: WritingHarnessConfig;
  nsfwPolicy?: Record<string, unknown>;
};

export async function createStory(input: CreateStoryInput) {
  return prisma.story.create({
    data: {
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      settings: {
        create: {
          genre: toJsonString(input.genre ?? []),
          tone: input.tone,
          pov: input.pov,
          tense: input.tense,
          styleGuide: input.styleGuide,
          writingHarness: input.writingHarness
            ? toJsonString(input.writingHarness)
            : undefined,
          nsfwPolicy: toJsonString(input.nsfwPolicy, {
            matureModeAllowed: true,
            requireAdultCharacters: true,
            requireConsentContinuity: true,
          }),
        },
      },
    },
    include: { settings: true },
  });
}

export async function listStories(ownerId?: string | null) {
  return prisma.story.findMany({
    where: ownerId ? { ownerId } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      settings: true,
      primaryProtagonist: true,
      _count: {
        select: {
          characters: true,
          chapters: true,
          memories: true,
          continuityIssues: true,
        },
      },
    },
  });
}

export async function getStory(storyId: string, ownerId?: string | null) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, ownerId: ownerId ?? undefined },
    include: {
      settings: true,
      characters: {
        include: { profile: true },
        orderBy: { name: "asc" },
      },
      chapters: {
        orderBy: { number: "asc" },
      },
      relationships: {
        include: {
          characterA: true,
          characterB: true,
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      },
      continuityIssues: {
        where: { status: "OPEN" },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 20,
      },
      _count: {
        select: {
          chapters: true,
          characters: true,
          memories: true,
          continuityIssues: true,
          generationRuns: true,
          retrievalLogs: true,
        },
      },
    },
  });

  if (!story) {
    throw new Error("Story not found.");
  }

  return story;
}

export async function getLibraryStory(storyId: string, ownerId?: string | null) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, ownerId: ownerId ?? undefined },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        include: {
          draftVersions: {
            where: { status: "ACCEPTED" },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
      _count: { select: { chapters: true, characters: true } },
    },
  });

  if (!story) throw new Error("Story not found.");
  return story;
}

export async function deleteStory(storyId: string, ownerId?: string | null) {
  await getStory(storyId, ownerId);
  return prisma.story.delete({ where: { id: storyId } });
}

export async function updateStory(
  storyId: string,
  input: Partial<CreateStoryInput> & {
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
    primaryProtagonistId?: string | null;
  },
  ownerId?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const story = await tx.story.findFirst({
      where: { id: storyId, ownerId: ownerId ?? undefined },
      select: { id: true },
    });
    if (!story) throw new Error("Story not found.");

    if (input.primaryProtagonistId) {
      const primary = await tx.character.findFirst({
        where: {
          id: input.primaryProtagonistId,
          storyId,
          role: "PROTAGONIST",
        },
        select: { id: true },
      });
      if (!primary) {
        throw new WorkflowError(
          "INVALID_PRIMARY_PROTAGONIST",
          "The primary protagonist must be a protagonist in this story.",
          409,
        );
      }
    }

    return tx.story.update({
      where: { id: storyId },
      data: {
        title: input.title,
        description: input.description,
        status: input.status,
        primaryProtagonistId: input.primaryProtagonistId,
        settings: {
          upsert: {
            create: {
              genre: toJsonString(input.genre ?? []),
              tone: input.tone,
              pov: input.pov,
              tense: input.tense,
              styleGuide: input.styleGuide,
              writingHarness: input.writingHarness
                ? toJsonString(input.writingHarness)
                : undefined,
              nsfwPolicy: toJsonString(input.nsfwPolicy),
            },
            update: {
              genre: optionalJsonString(input.genre),
              tone: input.tone,
              pov: input.pov,
              tense: input.tense,
              styleGuide: input.styleGuide,
              writingHarness: optionalJsonString(input.writingHarness),
              nsfwPolicy: optionalJsonString(input.nsfwPolicy),
            },
          },
        },
      },
      include: { settings: true, primaryProtagonist: true },
    });
  });
}
