import assert from "node:assert/strict";
import test from "node:test";

import { buildGenerationPrompt } from "@/lib/prompts/prompt-builder";
import type { GenerationContext } from "@/lib/retrieval/types";
import {
  getDefaultWritingHarness,
  parseWritingHarness,
  writingHarnessSchema,
} from "@/lib/writing-harness/config";
import {
  canAttemptWritingHarnessRepair,
  createWritingHarnessAudit,
  enforceWritingHarness,
  normalizeWritingHarnessOutput,
  validateWritingHarnessOutput,
  writingHarnessAuditSchema,
} from "@/lib/writing-harness/evaluation";

function context(): GenerationContext {
  return {
    story: { id: "story-1", title: "Harness story" },
    settings: {
      genre: ["drama"],
      tone: "restrained",
      pov: "third person limited",
      tense: "past",
      styleGuide: "Keep dialogue understated.",
      writingHarness: getDefaultWritingHarness(),
    },
    characters: [],
    relationships: [],
    recentEvents: [],
    lore: [],
    secrets: [],
    plotThreads: [],
    memories: [],
  };
}

test("default harness parsing supports empty persisted settings", () => {
  assert.deepEqual(parseWritingHarness("{}"), getDefaultWritingHarness());
  assert.deepEqual(parseWritingHarness(undefined), getDefaultWritingHarness());
});

test("custom harness parsing trims and deduplicates bounded lists", () => {
  const custom = {
    ...getDefaultWritingHarness(),
    styleGoals: ["  Quiet prose  ", "quiet prose", "Warm dialogue"],
    forbiddenPhrases: [" Basically ", "basically"],
  };
  const parsed = parseWritingHarness(JSON.stringify(custom));

  assert.deepEqual(parsed.styleGoals, ["Quiet prose", "Warm dialogue"]);
  assert.deepEqual(parsed.forbiddenPhrases, ["Basically"]);
});

test("unknown harness versions and empty forbidden entries are rejected", () => {
  assert.throws(() =>
    writingHarnessSchema.parse({ ...getDefaultWritingHarness(), version: 2 }),
  );
  assert.throws(() =>
    writingHarnessSchema.parse({
      ...getDefaultWritingHarness(),
      forbiddenCharacters: ["   "],
    }),
  );
});

test("generation prompt orders invariants, harness, canon, task, and output", () => {
  const prompt = buildGenerationPrompt({
    context: context(),
    goal: "Write a consequential scene.",
    mode: "scene",
  });

  const sections = [
    "# System",
    "# AI Writing Harness",
    "## Story",
    "# Task",
    "# Output",
  ].map((section) => prompt.indexOf(section));
  assert.ok(sections.every((index) => index >= 0));
  assert.deepEqual(sections, [...sections].sort((left, right) => left - right));
  assert.match(prompt, /## Mandatory Writing Rules/);
  assert.match(prompt, /## Deterministically Checked Rules/);
  assert.match(prompt, /## Preferred Style Goals/);
  assert.match(prompt, /Keep dialogue understated\./);
  assert.match(prompt, /not mechanically guaranteed/i);
});

test("hard validation detects forbidden characters and phrases", () => {
  const harness = {
    ...getDefaultWritingHarness(),
    forbiddenCharacters: ["—"],
    forbiddenPhrases: ["very unique"],
  };
  const findings = validateWritingHarnessOutput(
    "This—despite appearances—is VERY UNIQUE.",
    harness,
  );

  assert.equal(
    findings.find((finding) => finding.kind === "forbidden_character")
      ?.occurrences,
    2,
  );
  assert.equal(
    findings.find((finding) => finding.kind === "forbidden_phrase")
      ?.occurrences,
    1,
  );
});

test("hard validation detects Markdown while sentence length stays advisory", () => {
  const harness = { ...getDefaultWritingHarness(), maxSentenceWords: 5 };
  const findings = validateWritingHarnessOutput(
    "# Heading\nThis sentence is intentionally longer than five words.",
    harness,
  );

  assert.equal(
    findings.find((finding) => finding.kind === "markdown")?.severity,
    "error",
  );
  assert.equal(
    findings.find((finding) => finding.kind === "sentence_length")?.severity,
    "warning",
  );
});

test("safe normalization standardizes whitespace and bounds blank lines", () => {
  assert.equal(
    normalizeWritingHarnessOutput(
      "  First line.  \r\n\r\n\r\nSecond line. \r\n",
      getDefaultWritingHarness(),
    ),
    "First line.\n\nSecond line.",
  );
});

test("valid output never calls the repair function", async () => {
  let repairCalls = 0;
  const outcome = await enforceWritingHarness({
    draft: "A clean, concise paragraph.",
    harness: getDefaultWritingHarness(),
    repair: async () => {
      repairCalls += 1;
      return { text: "Unused.", model: "free-model" };
    },
  });

  assert.equal(outcome.status, "passed");
  assert.equal(repairCalls, 0);
});

test("repair is attempted at most once and successful output is revalidated", async () => {
  let repairCalls = 0;
  const outcome = await enforceWritingHarness({
    draft: "A line—with a violation.",
    harness: getDefaultWritingHarness(),
    repair: async () => {
      repairCalls += 1;
      return { text: "A line with no violation.", model: "free-model" };
    },
  });

  assert.equal(repairCalls, 1);
  assert.equal(outcome.status, "repaired_and_passed");
  assert.equal(outcome.repairModel, "free-model");
});

test("remaining violations after one repair require review", async () => {
  let repairCalls = 0;
  const outcome = await enforceWritingHarness({
    draft: "Still—invalid.",
    harness: getDefaultWritingHarness(),
    repair: async () => {
      repairCalls += 1;
      return { text: "Still—invalid.", model: "free-model" };
    },
  });

  assert.equal(repairCalls, 1);
  assert.equal(outcome.status, "needs_review");
  assert.ok(outcome.findingsAfterRepair.length > 0);
});

test("paid repair requires explicit approval", () => {
  const harness = getDefaultWritingHarness();
  assert.equal(
    canAttemptWritingHarnessRepair(harness, {
      usesPaidModel: true,
      paidApproved: false,
    }),
    false,
  );
  assert.equal(
    canAttemptWritingHarnessRepair(harness, {
      usesPaidModel: true,
      paidApproved: true,
    }),
    true,
  );
});

test("audit snapshot persists schema, prompt version, findings, and repair model", async () => {
  const harness = getDefaultWritingHarness();
  const outcome = await enforceWritingHarness({
    draft: "Draft—with a violation.",
    harness,
    repair: async () => ({
      text: "Draft without a violation.",
      model: "free-model",
    }),
  });
  const audit = createWritingHarnessAudit(harness, outcome);

  assert.equal(writingHarnessAuditSchema.parse(audit).schemaVersion, 1);
  assert.match(audit.promptVersion, /writing-harness-v1/);
  assert.equal(audit.evaluation.repairAttempted, true);
  assert.equal(audit.evaluation.repairModel, "free-model");
  assert.ok(audit.evaluation.findingsBeforeRepair.length > 0);
});
