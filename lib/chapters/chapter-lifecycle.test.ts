import assert from "node:assert/strict";
import test from "node:test";

import {
  chapterGenerationMode,
  chapterLengthConfig,
  chapterProgress,
  chapterWordBudget,
  composeChapterManuscript,
  countWords,
} from "@/lib/chapters/chapter-lifecycle";
import { chapterLengthSchema } from "@/lib/validation/schemas";

test("word count is Unicode-aware and stable across prose punctuation", () => {
  assert.equal(countWords("Hello, thế giới! L’amour d’Artagnan 2026."), 6);
  assert.equal(countWords("  \n\t  "), 0);
});

test("chapter manuscript composes legacy content and ordered scene prose once", () => {
  assert.equal(
    composeChapterManuscript({
      content: "Legacy opening",
      scenes: [{ content: "Scene one" }, { content: "Scene two" }],
    }),
    "Legacy opening\n\nScene one\n\nScene two",
  );
  assert.equal(
    composeChapterManuscript({
      content: "Scene one",
      scenes: [{ content: "Scene one" }, { content: "Scene two" }],
    }),
    "Scene one\n\nScene two",
  );
});

test("chapter limits validate their ordering", () => {
  assert.equal(
    chapterLengthSchema.parse({
      targetWords: 4000,
      softLimitWords: 4500,
      hardLimitWords: 5000,
      autoAdvance: false,
    }).hardLimitWords,
    5000,
  );
  assert.equal(
    chapterLengthSchema.safeParse({
      targetWords: 5000,
      softLimitWords: 4500,
      hardLimitWords: 6000,
    }).success,
    false,
  );
});

test("chapter progress enters closing mode near the hard limit", () => {
  const config = chapterLengthConfig(null);
  assert.equal(chapterGenerationMode(3800, config), "NORMAL");
  assert.equal(chapterGenerationMode(5000, config), "CLOSING");
  assert.deepEqual(chapterProgress(5850, config), {
    currentWords: 5850,
    targetWords: 5000,
    softLimitWords: 5500,
    hardLimitWords: 6000,
    remainingToTarget: 0,
    remainingToHardLimit: 150,
    mode: "CLOSING",
    autoAdvance: true,
  });
});

test("chapter word budget distinguishes an exact boundary from an overrun", () => {
  const config = chapterLengthConfig(null);

  assert.deepEqual(chapterWordBudget(5_800, 200, config), {
    currentWords: 5_800,
    addedWords: 200,
    projectedWords: 6_000,
    hardLimitWords: 6_000,
    remainingWords: 200,
    excessWords: 0,
    exceedsHardLimit: false,
  });
  assert.equal(chapterWordBudget(5_800, 201, config).exceedsHardLimit, true);
});
