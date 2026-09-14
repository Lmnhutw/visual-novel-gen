import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialChapterBrief,
  mergeChapterBrief,
  parseChapterBrief,
  parseChapterBriefProposalMetadata,
} from "@/lib/chapters/chapter-brief";

test("chapter brief merge preserves intent and applies a reviewed delta", () => {
  const initial = {
    ...createInitialChapterBrief("Kaelen must find the royal alchemist."),
    openThreads: ["Who poisoned Kaelen?", "Where is the alchemist?"],
  };

  const merged = mergeChapterBrief(initial, {
    summary: "Kaelen learned that moonlight activates the poison.",
    completedBeats: ["Kaelen confirmed the poison is magical."],
    characterChanges: ["Kaelen now distrusts the palace physician."],
    newFacts: ["The poison reacts to moonlight."],
    openThreadsAdded: ["Why did Mira hide the alchemist's name?"],
    openThreadsResolved: ["Where is the alchemist?"],
    suggestedNextDirection: "Follow Mira into the old observatory.",
  });

  assert.equal(merged.originalIntent, initial.originalIntent);
  assert.deepEqual(merged.progress, [
    "Kaelen learned that moonlight activates the poison.",
  ]);
  assert.deepEqual(merged.openThreads, [
    "Who poisoned Kaelen?",
    "Why did Mira hide the alchemist's name?",
  ]);
  assert.equal(
    merged.suggestedNextDirection,
    "Follow Mira into the old observatory.",
  );
});

test("chapter brief parsing validates database and draft metadata boundaries", () => {
  const brief = createInitialChapterBrief("Protect the kingdom before dawn.");
  assert.deepEqual(parseChapterBrief(JSON.stringify(brief)), brief);
  assert.equal(parseChapterBrief("not json"), null);

  const proposal = {
    summary: "Ari found the missing key.",
    completedBeats: [],
    characterChanges: [],
    newFacts: [],
    openThreadsAdded: [],
    openThreadsResolved: ["Where is the key?"],
    suggestedNextDirection: "Open the observatory door.",
  };
  assert.deepEqual(
    parseChapterBriefProposalMetadata(
      JSON.stringify({ chapterBriefProposal: proposal }),
    ),
    proposal,
  );
  assert.equal(
    parseChapterBriefProposalMetadata(
      JSON.stringify({ chapterBriefProposal: { summary: "" } }),
    ),
    null,
  );
});

