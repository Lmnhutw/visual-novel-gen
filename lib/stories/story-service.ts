import { prisma } from "@/lib/db/prisma";
import { optionalJsonString, toJsonString } from "@/lib/db/json";

export type CreateStoryInput = {
  title: string;
  description?: string;
  genre?: string[];
  tone?: string;
  pov?: string;
  tense?: string;
  styleGuide?: string;
  nsfwPolicy?: Record<string, unknown>;
};

export async function createStory(input: CreateStoryInput) {
  return prisma.story.create({
    data: {
      title: input.title,
      description: input.description,
      settings: {
        create: {
          genre: toJsonString(input.genre ?? []),
          tone: input.tone,
          pov: input.pov,
          tense: input.tense,
          styleGuide: input.styleGuide,
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

export async function listStories() {
  return prisma.story.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      settings: true,
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

export async function getStory(storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
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

export async function updateStory(
  storyId: string,
  input: Partial<CreateStoryInput> & { status?: "DRAFT" | "ACTIVE" | "ARCHIVED" },
) {
  return prisma.story.update({
    where: { id: storyId },
    data: {
      title: input.title,
      description: input.description,
      status: input.status,
      settings: {
        upsert: {
          create: {
            genre: toJsonString(input.genre ?? []),
            tone: input.tone,
            pov: input.pov,
            tense: input.tense,
            styleGuide: input.styleGuide,
            nsfwPolicy: toJsonString(input.nsfwPolicy),
          },
          update: {
            genre: optionalJsonString(input.genre),
            tone: input.tone,
            pov: input.pov,
            tense: input.tense,
            styleGuide: input.styleGuide,
            nsfwPolicy: optionalJsonString(input.nsfwPolicy),
          },
        },
      },
    },
    include: { settings: true },
  });
}
