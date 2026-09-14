import assert from "node:assert/strict";
import test from "node:test";

import {
  createChapterHandoffBrief,
  createInitialChapterBrief,
  mergeChapterBrief,
  parseChapterBrief,
  parseChapterBriefProposalMetadata,
} from "@/lib/chapters/chapter-brief";

test("chapter handoff starts a new intent while carrying unresolved continuity", () => {
  const source = {
    ...createInitialChapterBrief("Find the royal alchemist."),
    progress: ["Kaelen reached the sealed observatory."],
    completedBeats: ["Escaped the palace."],
    characterChanges: ["Kaelen no longer trusts the regent."],
    facts: ["The antidote requires moonroot."],
    openThreads: ["Who poisoned Kaelen?"],
    suggestedNextDirection: "Enter the observatory before sunrise.",
  };

  const handoff = createChapterHandoffBrief({
    source,
    sourceLabel: "Chapter 02: Seven Days to Live",
    openingDirection: "Open with Kaelen inside the observatory.",
  });

  assert.equal(
    handoff.originalIntent,
    "Open with Kaelen inside the observatory.",
  );
  assert.deepEqual(handoff.openThreads, source.openThreads);
  assert.deepEqual(handoff.characterChanges, source.characterChanges);
  assert.deepEqual(handoff.facts, source.facts);
  assert.deepEqual(handoff.completedBeats, []);
  assert.match(handoff.progress[0], /^Handoff from Chapter 02/);
});

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
