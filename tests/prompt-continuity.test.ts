import test from "node:test";
import assert from "node:assert/strict";

import { runRuleBasedContinuityChecks } from "@/lib/continuity/rule-checks";
import { buildGenerationPrompt } from "@/lib/prompts/prompt-builder";
import type { GenerationContext } from "@/lib/retrieval/types";

const context: GenerationContext = {
  story: { id: "story_1", title: "Test Story" },
  settings: null,
  characters: [
    {
      id: "char_1",
      name: "Ari",
      role: "PROTAGONIST",
      status: "DEAD",
      ageConfirmed: true,
    },
  ],
  relationships: [],
  recentEvents: [],
  lore: [],
  secrets: [],
  plotThreads: [
    {
      id: "thread_1",
      title: "Find the missing key",
      status: "OPEN",
      commitments: ["The key opens the observatory."],
      foreshadowing: [],
      salience: 0.8,
    },
  ],
  memories: [],
};

test("prompt assembly includes retrieval context without querying the database", () => {
  const prompt = buildGenerationPrompt({
    context,
    goal: "Write the next investigative scene.",
    mode: "scene",
  });

  assert.match(prompt, /Test Story/);
  assert.match(prompt, /Unresolved Plot Threads/);
  assert.match(prompt, /Find the missing key/);
});

test("deterministic continuity checks are authoritative for impossible presence", () => {
  const issues = runRuleBasedContinuityChecks({
    context,
    draft: "Ari entered the room and spoke.",
  });

  assert.equal(issues[0]?.severity, "P0");
  assert.equal(issues[0]?.category, "physical_state");
});
