import { prisma } from "@/lib/db/prisma";
import { parseJsonString, parseStringArray } from "@/lib/db/json";
import { searchMemories } from "@/lib/memory/memory-service";
import {
  applyContextBudget,
  DEFAULT_CONTEXT_TOKEN_BUDGET,
} from "@/lib/retrieval/context-budget";
import type { GenerationContext, RetrievedMemory } from "@/lib/retrieval/types";

export type RetrieveContextInput = {
  storyId: string;
  query?: string;
  activeCharacterIds?: string[];
  memoryTypes?: string[];
  maxMemories?: number;
  includeSecrets?: boolean;
  tokenBudget?: number;
};

export async function retrieveContext(
  input: RetrieveContextInput,
): Promise<GenerationContext> {
  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    include: { settings: true },
  });

  if (!story) {
    throw new Error("Story not found.");
  }

  const characterWhere = input.activeCharacterIds?.length
    ? { id: { in: input.activeCharacterIds }, storyId: input.storyId }
    : { storyId: input.storyId };

  const [characters, relationships, recentEvents, lore, secrets, plotThreads] =
    await Promise.all([
      prisma.character.findMany({
        where: characterWhere,
        include: {
          profile: true,
          states: {
            orderBy: { validFrom: "desc" },
            take: 1,
          },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        take: 20,
      }),
      prisma.relationship.findMany({
        where: {
          storyId: input.storyId,
          OR: input.activeCharacterIds?.length
            ? [
                { characterAId: { in: input.activeCharacterIds } },
                { characterBId: { in: input.activeCharacterIds } },
              ]
            : undefined,
        },
        include: {
          characterA: true,
          characterB: true,
          history: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
      prisma.event.findMany({
        where: { storyId: input.storyId },
        orderBy: [{ eventTime: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
      prisma.loreEntry.findMany({
        where: { storyId: input.storyId },
        orderBy: [{ canonLevel: "desc" }, { updatedAt: "desc" }],
        take: 20,
      }),
      input.includeSecrets === false
        ? Promise.resolve([])
        : prisma.secret.findMany({
            where: { storyId: input.storyId },
            include: { knowledgeTracking: true },
            orderBy: [{ salience: "desc" }, { updatedAt: "desc" }],
            take: 20,
          }),
      prisma.plotThread.findMany({
        where: {
          storyId: input.storyId,
          status: { not: "RESOLVED" },
        },
        orderBy: [{ salience: "desc" }, { updatedAt: "desc" }],
        take: 20,
      }),
    ]);

  let memories: RetrievedMemory[] = [];
  if (input.query?.trim()) {
    try {
      const rows = await searchMemories({
        storyId: input.storyId,
        query: input.query,
        memoryTypes: input.memoryTypes,
        limit: input.maxMemories ?? 12,
      });
      memories = rows.map((memory) => ({
        id: memory.id,
        memoryType: memory.memoryType,
        content: memory.content,
        summary: memory.summary,
        salience: memory.salience,
        emotionalWeight: memory.emotionalWeight,
        similarity:
          "similarity" in memory && typeof memory.similarity === "number"
            ? memory.similarity
            : undefined,
        finalScore:
          "finalScore" in memory && typeof memory.finalScore === "number"
            ? memory.finalScore
            : undefined,
      }));
    } catch {
      const fallback = await prisma.memory.findMany({
        where: { storyId: input.storyId },
        orderBy: [{ salience: "desc" }, { createdAt: "desc" }],
        take: input.maxMemories ?? 12,
      });
      memories = fallback.map((memory) => ({
        id: memory.id,
        memoryType: memory.memoryType,
        content: memory.content,
        summary: memory.summary,
        salience: memory.salience,
        emotionalWeight: memory.emotionalWeight,
      }));
    }
  }

  const context: Omit<GenerationContext, "budget"> = {
    story: {
      id: story.id,
      title: story.title,
      description: story.description,
    },
    settings: story.settings
      ? {
          genre: parseStringArray(story.settings.genre),
          tone: story.settings.tone,
          pov: story.settings.pov,
          tense: story.settings.tense,
          styleGuide: story.settings.styleGuide,
          nsfwPolicy: parseJsonString(story.settings.nsfwPolicy, {}),
          modelConfig: parseJsonString(story.settings.modelConfig, {}),
        }
      : null,
    characters: characters.map((character) => ({
      id: character.id,
      name: character.name,
      aliases: character.aliases,
      role: character.role,
      status: character.status,
      ageConfirmed: character.ageConfirmed,
      gender: character.gender,
      age: character.age,
      race: character.race,
      species: character.species,
      occupation: character.occupation,
      archetypes: character.archetypes,
      profile: character.profile
        ? {
            personality: parseJsonString(character.profile.personality, {}),
            voiceRules: character.profile.voiceRules,
            backstory: character.profile.backstory,
            appearance: parseJsonString(character.profile.appearance, {}),
            boundaries: parseJsonString(character.profile.boundaries, {}),
            motivations: parseJsonString(character.profile.motivations, {}),
            talents: parseJsonString(character.profile.talents, {}),
            speech: parseJsonString(character.profile.speech, {}),
            relationshipPreference: parseJsonString(
              character.profile.relationshipPreference,
              {},
            ),
            background: parseJsonString(character.profile.background, {}),
            currentState: parseJsonString(character.profile.currentState, {}),
            characterArc: parseJsonString(character.profile.characterArc, {}),
          }
        : null,
      latestState: character.states[0]
        ? {
            location: character.states[0].location,
            emotionalState: parseJsonString(
              character.states[0].emotionalState,
              {},
            ),
            physicalState: parseJsonString(
              character.states[0].physicalState,
              {},
            ),
            goals: parseJsonString(character.states[0].goals, {}),
          }
        : undefined,
    })),
    relationships: relationships.map((relationship) => ({
      id: relationship.id,
      type: relationship.type,
      status: relationship.status,
      trust: relationship.trust,
      intimacy: relationship.intimacy,
      conflict: relationship.conflict,
      characterA: relationship.characterA.name,
      characterB: relationship.characterB.name,
      notes: relationship.notes,
      boundaries: parseJsonString(relationship.boundaries, {}),
      recentHistory: relationship.history.map((history) => history.changeSummary),
    })),
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      summary: event.summary,
      eventType: event.eventType,
      salience: event.salience,
    })),
    lore: lore.map((entry) => ({
      id: entry.id,
      category: entry.category,
      name: entry.name,
      content: entry.content,
      canonLevel: entry.canonLevel,
    })),
    secrets: secrets.map((secret) => ({
      id: secret.id,
      name: secret.name,
      truthStatus: secret.truthStatus,
      holderCharacterId: secret.holderCharacterId,
      knownBy: secret.knowledgeTracking.map((record) => record.characterId),
    })),
    plotThreads: plotThreads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      description: thread.description,
      status: thread.status,
      commitments: parseJsonString(thread.commitments, []),
      foreshadowing: parseJsonString(thread.foreshadowing, []),
      salience: thread.salience,
    })),
    memories,
  };

  return applyContextBudget(
    context,
    input.tokenBudget ?? DEFAULT_CONTEXT_TOKEN_BUDGET,
    input.activeCharacterIds,
  );
}
