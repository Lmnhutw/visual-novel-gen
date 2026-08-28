import assert from "node:assert/strict";
import test from "node:test";

import { formatCharacterPromptContext } from "@/lib/prompts/prompt-builder";
import type { GenerationContext } from "@/lib/retrieval/types";

test("compact character context retains playable profile data without background secrets", () => {
  const character: GenerationContext["characters"][number] = {
    id: "character-1",
    name: "Mira",
    aliases: [],
    role: "SUPPORTING",
    status: "ACTIVE",
    ageConfirmed: true,
    gender: "female",
    age: 750,
    race: "elf",
    occupation: "Detective",
    archetypes: ["intellectual"],
    profile: {
      personality: {
        summary: "Observant and guarded.",
        strengths: ["patient"],
        fears: ["abandonment"],
      },
      talents: { talents: ["deduction"], limitations: ["sleeplessness"] },
      appearance: { heightCm: 172, skinTone: "warm", hairColor: "black" },
      relationshipPreference: { preferredTraits: ["honesty"] },
      background: {
        birthplace: "Lunaris",
        secrets: ["private secret"],
      },
      currentState: {
        currentLocation: "Archive",
        currentConflicts: ["The case is closing in."],
      },
    },
  };

  const [compact] = formatCharacterPromptContext([character]);

  assert.equal(compact?.race, "elf");
  assert.equal(compact?.occupation, "Detective");
  assert.deepEqual(compact?.personality, {
    strengths: ["patient"],
    weaknesses: [],
    fears: ["abandonment"],
    desires: [],
    goals: [],
    values: [],
    habits: [],
    quirks: [],
  });
  assert.deepEqual(compact?.relationshipPreference, {
    preferredTraits: ["honesty"],
  });
  assert.equal(compact?.background?.birthplace, "Lunaris");
  assert.equal("secrets" in (compact?.background ?? {}), false);
  assert.equal(compact?.currentState?.currentLocation, "Archive");
});
