import assert from "node:assert/strict";
import test from "node:test";

import { createInitialChapterBrief } from "@/lib/chapters/chapter-brief";
import { buildGenerationPrompt } from "@/lib/prompts/prompt-builder";

test("continuation prompt uses the reviewed brief without restarting the chapter", () => {
  const prompt = buildGenerationPrompt({
    context: {
      story: { id: "story-1", title: "Test Story" },
      chapter: {
        id: "chapter-1",
        number: 1,
        title: "The Poison",
        status: "DRAFT",
        wordCount: 1_100,
        brief: {
          ...createInitialChapterBrief("Kaelen must find an antidote."),
          progress: ["Kaelen learned the poison reacts to moonlight."],
          openThreads: ["Who poisoned Kaelen?"],
          suggestedNextDirection: "Question Mira about the royal alchemist.",
        },
        briefVersion: 2,
        progress: {
          currentWords: 1_100,
          targetWords: 5_000,
          softLimitWords: 5_500,
          hardLimitWords: 6_000,
          remainingToTarget: 3_900,
          remainingToHardLimit: 4_900,
          mode: "NORMAL",
          autoAdvance: true,
        },
      },
      recentApprovedScenes: [
        {
          id: "scene-1",
          number: 1,
          content: "Kaelen closed the vial and faced Mira.",
        },
      ],
      characters: [],
      relationships: [],
      recentEvents: [],
      lore: [],
      secrets: [],
      plotThreads: [],
      memories: [],
    },
    goal: "Question Mira about the royal alchemist.",
    mode: "scene",
    continuation: true,
  });

  assert.match(prompt, /# Continuation Mode/);
  assert.match(prompt, /Current Chapter/);
  assert.match(prompt, /Kaelen must find an antidote/);
  assert.match(prompt, /Do not recap, restart, or retell approved scenes/);
});

