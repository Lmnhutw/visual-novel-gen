import type { GenerationContext } from "@/lib/retrieval/types";

export type ContinuitySeverity = "P0" | "P1" | "P2" | "P3";

export type ContinuityWarning = {
  severity: ContinuitySeverity;
  category: string;
  description: string;
  evidence: Record<string, unknown>;
  confidence: number;
};

function containsName(text: string, name: string): boolean {
  return new RegExp(
    `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
    "i",
  ).test(text);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function runRuleBasedContinuityChecks(input: {
  context: GenerationContext;
  draft: string;
  maturityMode?: "safe" | "mature";
}): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];
  const draft = input.draft;

  for (const character of input.context.characters) {
    const profile = character.profile ?? {};
    const relationshipPreference = asRecord(profile.relationshipPreference);
    const appearance = asRecord(profile.appearance);

    if (
      ["DEAD", "UNCONSCIOUS", "ABSENT"].includes(character.status) &&
      containsName(draft, character.name)
    ) {
      warnings.push({
        severity: character.status === "DEAD" ? "P0" : "P1",
        category: "physical_state",
        description: `${character.name} appears in the draft but current status is ${character.status}.`,
        evidence: {
          characterId: character.id,
          status: character.status,
        },
        confidence: 0.75,
      });
    }

    if (appearance.femaleBody !== undefined && character.gender !== "female") {
      warnings.push({
        severity: "P1",
        category: "appearance",
        description: `${character.name} has female body details but gender is ${character.gender}.`,
        evidence: {
          characterId: character.id,
          gender: character.gender,
        },
        confidence: 0.9,
      });
    }

    if (appearance.maleBody !== undefined && character.gender !== "male") {
      warnings.push({
        severity: "P1",
        category: "appearance",
        description: `${character.name} has male body details but gender is ${character.gender}.`,
        evidence: {
          characterId: character.id,
          gender: character.gender,
        },
        confidence: 0.9,
      });
    }

    if (!containsName(draft, character.name)) {
      continue;
    }

    const draftImpliesNonExclusive = containsAny(draft, [
      /\b(open relationship|polyamorous|multiple partners|multiple lovers|shared partner)\b/i,
    ]);
    const draftFramesAsBetrayal = containsAny(draft, [
      /\b(cheat|cheated|cheating|betray|betrayed|betrayal|affair)\b/i,
    ]);
    const draftImpliesFullCommitment = containsAny(draft, [
      /\b(committed forever|fully committed|exclusive forever|marry|married|spouse)\b/i,
    ]);

    if (
      relationshipPreference.partner === "exclusive_only" &&
      draftImpliesNonExclusive
    ) {
      warnings.push({
        severity: "P1",
        category: "romantic_exclusivity",
        description: `${character.name} expects partner exclusivity, but the draft frames their relationship as non-exclusive without an explicit transition.`,
        evidence: {
          characterId: character.id,
          partnerPreference: relationshipPreference.partner,
        },
        confidence: 0.7,
      });
    }

    if (
      relationshipPreference.self === "not_ready_to_commit" &&
      draftImpliesFullCommitment
    ) {
      warnings.push({
        severity: "P2",
        category: "relationship_preference",
        description: `${character.name} is marked not ready to commit, but the draft presents them as fully committed without development.`,
        evidence: {
          characterId: character.id,
          selfPreference: relationshipPreference.self,
        },
        confidence: 0.65,
      });
    }

    if (
      relationshipPreference.partner === "okay_with_multiple" &&
      draftImpliesNonExclusive &&
      draftFramesAsBetrayal
    ) {
      warnings.push({
        severity: "P2",
        category: "romantic_exclusivity",
        description: `${character.name} accepts a partner having multiple romantic connections, but the draft frames that non-exclusive dynamic as betrayal without explicit conflict state.`,
        evidence: {
          characterId: character.id,
          partnerPreference: relationshipPreference.partner,
        },
        confidence: 0.65,
      });
    }
  }

  if (input.maturityMode === "mature") {
    const unconfirmed = input.context.characters.filter(
      (character) => !character.ageConfirmed,
    );

    if (unconfirmed.length > 0) {
      warnings.push({
        severity: "P0",
        category: "mature_content",
        description:
          "Mature mode requires all active scene characters to be confirmed adults.",
        evidence: {
          characters: unconfirmed.map((character) => ({
            id: character.id,
            name: character.name,
          })),
        },
        confidence: 1,
      });
    }
  }

  return warnings;
}
