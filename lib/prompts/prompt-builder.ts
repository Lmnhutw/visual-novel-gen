import {
  GENERATION_SYSTEM_INSTRUCTIONS,
  JSON_ONLY_RULE,
  MATURE_CONTENT_RULES,
} from "@/lib/prompts/templates";
import type { GenerationContext } from "@/lib/retrieval/types";

export type BuildGenerationPromptInput = {
  context: GenerationContext;
  goal: string;
  mode: "scene" | "chapter" | "revision";
  chapterNumber?: number;
  sceneGoal?: string;
  povCharacterId?: string;
  maturityMode?: "safe" | "mature";
  previousDraft?: string;
};

function block(title: string, value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  if (!text || text === "[]" || text === "{}") {
    return "";
  }

  return `\n## ${title}\n${text}\n`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function compactAppearance(value: unknown): string | undefined {
  const appearance = asRecord(value);
  const distinctiveFeatures = stringArray(appearance.distinctiveFeatures);
  const femaleBody = asRecord(appearance.femaleBody);
  const maleBody = asRecord(appearance.maleBody);
  const parts = [
    appearance.heightCm ? `height: ${appearance.heightCm} cm` : undefined,
    appearance.weightKg ? `weight: ${appearance.weightKg} kg` : undefined,
    stringValue(appearance.faceDescription),
    stringValue(appearance.bodyType),
    stringValue(appearance.hairColor),
    stringValue(appearance.hairStyle),
    stringValue(appearance.eyeColor),
    stringValue(appearance.skinTone),
    stringValue(appearance.clothingStyle),
    distinctiveFeatures.length
      ? `distinctive features: ${distinctiveFeatures.join(", ")}`
      : undefined,
    Object.keys(femaleBody).length
      ? `female body details: ${JSON.stringify(femaleBody)}`
      : undefined,
    Object.keys(maleBody).length
      ? `male body details: ${JSON.stringify(maleBody)}`
      : undefined,
  ].filter(Boolean);

  return parts.length ? parts.join("; ") : undefined;
}

function compactRelationshipPreference(
  value: unknown,
): Record<string, unknown> | undefined {
  const preference = asRecord(value);
  const compact = {
    self: preference.self,
    partner: preference.partner,
    attractedToGenders: preference.attractedToGenders,
    loveLanguages: preference.loveLanguages,
    preferredTraits: preference.preferredTraits,
    turnOns: preference.turnOns,
    turnOffs: preference.turnOffs,
    jealousyTolerance: preference.jealousyTolerance,
    possessiveness: preference.possessiveness,
    notes: preference.notes,
  };
  const filled = Object.fromEntries(
    Object.entries(compact).filter(([, entry]) => entry !== undefined),
  );

  return Object.keys(filled).length ? filled : undefined;
}

export function formatCharacterPromptContext(
  characters: GenerationContext["characters"],
) {
  return characters.map((character) => {
    const profile = character.profile;
    const personality = asRecord(profile?.personality);
    const currentState = asRecord(profile?.currentState);
    const background = asRecord(profile?.background);
    const latestState = character.latestState ?? {};

    return {
      id: character.id,
      name: character.name,
      aliases: character.aliases,
      gender: character.gender,
      age: character.age,
      race: character.race,
      occupation: character.occupation,
      role: character.role,
      status: character.status,
      archetypes: character.archetypes,
      personalitySummary: personality.summary,
      keyTraits: stringArray(personality.traits),
      personality: {
        strengths: stringArray(personality.strengths),
        weaknesses: stringArray(personality.weaknesses),
        fears: stringArray(personality.fears),
        desires: stringArray(personality.desires),
        goals: stringArray(personality.goals),
        values: stringArray(personality.values),
        habits: stringArray(personality.habits),
        quirks: stringArray(personality.quirks),
      },
      talents: profile?.talents,
      appearanceSummary: compactAppearance(profile?.appearance),
      speech: profile?.speech,
      background: {
        birthplace: background.birthplace,
        family: background.family,
        education: background.education,
        socialClass: background.socialClass,
        majorLifeEvents: background.majorLifeEvents,
        trauma: background.trauma,
      },
      currentState: {
        emotionalState:
          currentState.emotionalState ?? latestState.emotionalState,
        physicalState: currentState.physicalState ?? latestState.physicalState,
        mentalState: currentState.mentalState,
        currentGoals: currentState.currentGoals ?? latestState.goals,
        currentConflicts: currentState.currentConflicts,
        currentLocation: currentState.currentLocation ?? latestState.location,
      },
      motivations: profile?.motivations,
      voiceRules: profile?.voiceRules,
      boundaries: profile?.boundaries,
      characterArc: profile?.characterArc,
      relationshipPreference: compactRelationshipPreference(
        profile?.relationshipPreference,
      ),
    };
  });
}

export function buildGenerationPrompt(
  input: BuildGenerationPromptInput,
): string {
  const { context } = input;

  return [
    `# System\n${GENERATION_SYSTEM_INSTRUCTIONS}`,
    input.maturityMode === "mature"
      ? `# Mature Content Rules\n${MATURE_CONTENT_RULES}`
      : "",
    block("Story", context.story),
    block("Story Settings", context.settings),
    block(
      "Active Characters",
      formatCharacterPromptContext(context.characters),
    ),
    block("Relationships", context.relationships),
    block("Recent Timeline Events", context.recentEvents),
    block("Lore", context.lore),
    block("Secrets And Knowledge Constraints", context.secrets),
    block("Unresolved Plot Threads", context.plotThreads),
    block("Retrieved Long-Term Memories", context.memories),
    input.previousDraft ? block("Previous Draft", input.previousDraft) : "",
    `# Task
Write a ${input.mode} for this story.
Goal: ${input.goal}
${input.chapterNumber ? `Chapter number: ${input.chapterNumber}` : ""}
${input.sceneGoal ? `Scene goal: ${input.sceneGoal}` : ""}
${input.povCharacterId ? `Preferred POV character id: ${input.povCharacterId}` : ""}

# Romance Continuity
Do not infer cheating solely from multiple_people, open_to_multiple, or okay_with_multiple preferences. Treat non-exclusive dynamics as valid when they are consensual, transparent, and emotionally respectful. Cheating, betrayal, secrecy, manipulation, coercion, and dishonesty require explicit support from profile, relationship, or story state.

# Output
Return polished prose only. Do not explain the context. Preserve canon and character voice.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMemoryExtractionPrompt(input: {
  draft: string;
  contextSummary?: string;
}): string {
  return `${JSON_ONLY_RULE}

Extract durable canon facts from this draft. Only include facts explicitly supported by the text.

Return this shape:
{
  "memories": [
    {
      "content": "short durable memory",
      "memoryType": "character|relationship|event|lore|secret|plot_thread|summary",
      "salience": 0.0,
      "emotionalWeight": 0.0,
      "entities": {}
    }
  ],
  "events": [
    {
      "summary": "event summary",
      "eventType": "scene_event",
      "salience": 0.0,
      "participants": []
    }
  ],
  "relationshipChanges": [],
  "characterStateChanges": [],
  "secretsRevealed": [],
  "loreUpdates": [],
  "unresolvedThreads": [],
  "continuityRisks": []
}

Context:
${input.contextSummary ?? "No compact context provided."}

Draft:
${input.draft}`;
}

export function buildContinuityReviewPrompt(input: {
  context: GenerationContext;
  draft: string;
}): string {
  return `${JSON_ONLY_RULE}

Compare the draft against canon context and identify continuity issues.
Relationship preference self and partner fields are independent. Do not flag consensual non-exclusive dynamics as cheating unless secrecy, betrayal, coercion, manipulation, or dishonesty is explicitly represented in canon or the draft.

Return:
{
  "issues": [
    {
      "severity": "P0|P1|P2|P3",
      "category": "timeline|personality|relationship|relationship_preference|romantic_exclusivity|secret|lore|appearance|speech|physical_state|emotional_state|plot_thread",
      "description": "specific issue",
      "evidence": {},
      "confidence": 0.0
    }
  ]
}

Canon context:
${JSON.stringify(input.context, null, 2)}

Draft:
${input.draft}`;
}
