import assert from "node:assert/strict";
import test from "node:test";

import {
  executePreparedGenerationPipeline,
  type PreparedGenerationPipeline,
} from "@/lib/generation/generation-pipeline";
import { getDefaultWritingHarness } from "@/lib/writing-harness/config";

const emptyExtraction = {
  memories: [],
  events: [],
  relationshipChanges: [],
  characterStateChanges: [],
  secretsRevealed: [],
  loreUpdates: [],
  unresolvedThreads: [],
  continuityRisks: [],
};

test("shared pipeline performs at most one repair and preserves stage order", async () => {
  const harness = getDefaultWritingHarness();
  const prepared: PreparedGenerationPipeline = {
    input: {
      storyId: "story-1",
      chapterId: "chapter-1",
      goal: "Write a consequential scene.",
      mode: "scene",
      model: "free-model",
      freeModel: "free-model",
      maxTokens: 1000,
      repairPolicy: "free-only",
    },
    prompt: "prompt",
    harness,
    context: {
      story: { id: "story-1", title: "Story" },
      settings: { genre: [], writingHarness: harness },
      characters: [],
      relationships: [],
      recentEvents: [],
      lore: [],
      secrets: [],
      plotThreads: [],
      memories: [],
    },
  };
  const stages: string[] = [];
  let calls = 0;
  const result = await executePreparedGenerationPipeline(prepared, {
    checkpoint: async (stage) => {
      stages.push(stage);
    },
    generate: async () => {
      calls += 1;
      return {
        text: calls === 1 ? "A bad — draft." : "A repaired draft.",
        model: "free-model",
      };
    },
    check: async () => [],
    extract: async () => emptyExtraction,
  });

  assert.equal(calls, 2);
  assert.equal(result.harnessOutcome.status, "repaired_and_passed");
  assert.deepEqual(stages, [
    "generating",
    "validating_harness",
    "repairing_harness",
    "checking_continuity",
    "extracting_proposals",
  ]);
});

test("paid pipeline repair remains disabled without explicit consent", async () => {
  const harness = getDefaultWritingHarness();
  let calls = 0;
  const result = await executePreparedGenerationPipeline(
    {
      input: {
        storyId: "story-1",
        goal: "Write a scene.",
        mode: "scene",
        model: "paid-model",
        freeModel: "free-model",
        maxTokens: 1000,
        repairPolicy: "free-only",
      },
      prompt: "prompt",
      harness,
      context: {
        story: { id: "story-1", title: "Story" },
        characters: [],
        relationships: [],
        recentEvents: [],
        lore: [],
        secrets: [],
        plotThreads: [],
        memories: [],
      },
    },
    {
      generate: async () => {
        calls += 1;
        return { text: "Still — invalid.", model: "paid-model" };
      },
      check: async () => [],
      extract: async () => emptyExtraction,
    },
  );

  assert.equal(calls, 1);
  assert.equal(result.harnessOutcome.status, "needs_review");
});

test("proposal extraction failure does not discard an otherwise valid draft", async () => {
  const harness = getDefaultWritingHarness();
  const result = await executePreparedGenerationPipeline(
    {
      input: {
        storyId: "story-1",
        goal: "Write a scene.",
        mode: "scene",
        model: "free-model",
        freeModel: "free-model",
        maxTokens: 1000,
        repairPolicy: "free-only",
      },
      prompt: "prompt",
      harness,
      context: {
        story: { id: "story-1", title: "Story" },
        characters: [],
        relationships: [],
        recentEvents: [],
        lore: [],
        secrets: [],
        plotThreads: [],
        memories: [],
      },
    },
    {
      generate: async () => ({
        text: "A valid draft.",
        model: "free-model",
      }),
      check: async () => [],
      extract: async () => {
        throw new Error("extractor unavailable");
      },
    },
  );

  assert.equal(result.draft, "A valid draft.");
  assert.equal(result.extraction, null);
  assert.equal(result.extractionError, "extractor unavailable");
});

test("chapter generation caps output tokens to the remaining hard-limit budget", async () => {
  const harness = getDefaultWritingHarness();
  let receivedMaxTokens = 0;
  const result = await executePreparedGenerationPipeline(
    {
      input: {
        storyId: "story-1",
        chapterId: "chapter-1",
        goal: "Close the chapter naturally.",
        mode: "scene",
        model: "free-model",
        freeModel: "free-model",
        maxTokens: 2_500,
        repairPolicy: "free-only",
      },
      prompt: "prompt",
      harness,
      effectiveChapterMode: "CLOSING",
      context: {
        story: { id: "story-1", title: "Story" },
        chapter: {
          id: "chapter-1",
          number: 1,
          title: "Chapter 1",
          status: "DRAFT",
          wordCount: 5_650,
          progress: {
            currentWords: 5_650,
            targetWords: 5_000,
            softLimitWords: 5_500,
            hardLimitWords: 6_000,
            remainingToTarget: 0,
            remainingToHardLimit: 350,
            mode: "CLOSING",
            autoAdvance: true,
          },
        },
        characters: [],
        relationships: [],
        recentEvents: [],
        lore: [],
        secrets: [],
        plotThreads: [],
        memories: [],
      },
    },
    {
      generate: async (_prompt, options) => {
        receivedMaxTokens = options.maxTokens;
        return { text: "A valid closing draft.", model: "free-model" };
      },
      check: async () => [],
      extract: async () => emptyExtraction,
    },
  );

  assert.equal(receivedMaxTokens, 875);
  assert.equal(result.effectiveMaxTokens, 875);
});

test("additive generation stops at the hard limit while revision remains available", async () => {
  const harness = getDefaultWritingHarness();
  const context: PreparedGenerationPipeline["context"] = {
    story: { id: "story-1", title: "Story" },
    chapter: {
      id: "chapter-1",
      number: 1,
      title: "Chapter 1",
      status: "DRAFT",
      wordCount: 6_000,
      progress: {
        currentWords: 6_000,
        targetWords: 5_000,
        softLimitWords: 5_500,
        hardLimitWords: 6_000,
        remainingToTarget: 0,
        remainingToHardLimit: 0,
        mode: "CLOSING",
        autoAdvance: true,
      },
    },
    characters: [],
    relationships: [],
    recentEvents: [],
    lore: [],
    secrets: [],
    plotThreads: [],
    memories: [],
  };
  let calls = 0;
  const prepared = (mode: "scene" | "revision"): PreparedGenerationPipeline => ({
    input: {
      storyId: "story-1",
      chapterId: "chapter-1",
      goal: "Work with the current prose.",
      mode,
      model: "free-model",
      freeModel: "free-model",
      maxTokens: 1_000,
      repairPolicy: "free-only",
    },
    prompt: "prompt",
    harness,
    context,
  });
  const options = {
    generate: async () => {
      calls += 1;
      return { text: "A valid revision.", model: "free-model" };
    },
    check: async () => [],
    extract: async () => emptyExtraction,
  };

  await assert.rejects(
    executePreparedGenerationPipeline(prepared("scene"), options),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "CHAPTER_HARD_LIMIT_REACHED",
  );
  assert.equal(calls, 0);

  const revision = await executePreparedGenerationPipeline(
    prepared("revision"),
    options,
  );
  assert.equal(calls, 1);
  assert.equal(revision.effectiveMaxTokens, 1_000);
});
