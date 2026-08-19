import test from "node:test";
import assert from "node:assert/strict";

import { runRuleBasedContinuityChecks } from "@/lib/continuity/rule-checks";
import {
  buildGenerationPrompt,
  formatCharacterPromptContext,
} from "@/lib/prompts/prompt-builder";
import type { GenerationContext } from "@/lib/retrieval/types";

const context: GenerationContext = {
  story: { id: "story_1", title: "Test Story" },
  settings: null,
  characters: [
    {
      id: "char_1",
      name: "Ari",
      aliases: [],
      role: "PROTAGONIST",
      status: "DEAD",
      ageConfirmed: true,
      gender: "female",
      age: 25,
      archetypes: ["guarded"],
      profile: {
        personality: {
          summary: "Ari is careful and guarded.",
          traits: ["careful", "guarded"],
        },
        relationshipPreference: {
          self: "multiple_people",
          partner: "okay_with_multiple",
          jealousyTolerance: 20,
        },
        motivations: { primary: "Protect the observatory" },
        voiceRules: "Short sentences under pressure.",
        boundaries: { hardLimits: ["coercion"] },
        characterArc: { currentPhase: "denial" },
      },
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
  assert.match(prompt, /Romance Continuity/);
});

test("deterministic continuity checks are authoritative for impossible presence", () => {
  const issues = runRuleBasedContinuityChecks({
    context,
    draft: "Ari entered the room and spoke.",
  });

  assert.equal(issues[0]?.severity, "P0");
  assert.equal(issues[0]?.category, "physical_state");
});

test("character prompt context keeps profiles compact", () => {
  const compact = formatCharacterPromptContext(context.characters);

  assert.equal(compact[0]?.name, "Ari");
  assert.equal(compact[0]?.personalitySummary, "Ari is careful and guarded.");
  assert.deepEqual(compact[0]?.keyTraits, ["careful", "guarded"]);
  assert.deepEqual(compact[0]?.relationshipPreference, {
    self: "multiple_people",
    partner: "okay_with_multiple",
    jealousyTolerance: 20,
  });
  assert.deepEqual(compact[0]?.motivations, {
    primary: "Protect the observatory",
  });
  assert.equal(compact[0]?.voiceRules, "Short sentences under pressure.");
  assert.deepEqual(compact[0]?.boundaries, { hardLimits: ["coercion"] });
  assert.deepEqual(compact[0]?.characterArc, { currentPhase: "denial" });
});

test("continuity flags accepted non-exclusive dynamics framed as betrayal", () => {
  const issues = runRuleBasedContinuityChecks({
    context: {
      ...context,
      characters: [{ ...context.characters[0]!, status: "ACTIVE" }],
    },
    draft:
      "Ari discussed their open relationship, but everyone called it cheating and betrayal.",
  });

  assert.equal(issues[0]?.category, "romantic_exclusivity");
});
