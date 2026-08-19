import test from "node:test";
import assert from "node:assert/strict";

import { applyContextBudget } from "@/lib/retrieval/context-budget";
import type { GenerationContext } from "@/lib/retrieval/types";

function baseContext(): Omit<GenerationContext, "budget"> {
  return {
    story: { id: "story_1", title: "Budgeted story" },
    settings: null,
    characters: [
      {
        id: "required",
        name: "Ari",
        aliases: [],
        role: "PROTAGONIST",
        status: "ACTIVE",
        ageConfirmed: true,
        gender: "female",
        age: 25,
        archetypes: [],
      },
    ],
    relationships: [],
    recentEvents: [],
    lore: Array.from({ length: 10 }, (_, index) => ({
      id: `lore_${index}`,
      category: "world",
      name: `Rule ${index}`,
      content: "x".repeat(800),
      canonLevel: 1,
    })),
    secrets: [],
    plotThreads: [],
    memories: [],
  };
}

test("context budget preserves explicitly selected characters and trims lower priority records", () => {
  const context = applyContextBudget(baseContext(), 1_000, ["required"]);

  assert.equal(context.characters[0]?.id, "required");
  assert.ok((context.budget?.omitted.lore ?? 0) > 0);
  assert.ok((context.budget?.estimatedTokens ?? Infinity) <= 1_000);
});

test("context budget reports unavoidable overage from required characters", () => {
  const source = baseContext();
  source.characters[0]!.profile = { backstory: "x".repeat(8_000) };
  const context = applyContextBudget(source, 1_000, ["required"]);

  assert.equal(context.characters.length, 1);
  assert.equal(context.budget?.overBudget, true);
});
