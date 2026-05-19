import type { ContinuitySeverity } from "@prisma/client";

import type { GenerationContext } from "@/lib/retrieval/types";

export type ContinuityWarning = {
  severity: ContinuitySeverity;
  category: string;
  description: string;
  evidence: Record<string, unknown>;
  confidence: number;
};

function containsName(text: string, name: string): boolean {
  return new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

export function runRuleBasedContinuityChecks(input: {
  context: GenerationContext;
  draft: string;
  maturityMode?: "safe" | "mature";
}): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];
  const draft = input.draft;

  for (const character of input.context.characters) {
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

