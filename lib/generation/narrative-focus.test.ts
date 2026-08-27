import assert from "node:assert/strict";
import test from "node:test";

import { applyNarrativeFocus } from "@/lib/generation/narrative-focus";

test("primary protagonist only fills omitted scene focus", () => {
  const resolved = applyNarrativeFocus(
    { storyId: "story-1", povCharacterId: "explicit-pov", activeCharacterIds: ["explicit-active"] },
    "primary",
  );

  assert.equal(resolved.povCharacterId, "explicit-pov");
  assert.deepEqual(resolved.activeCharacterIds, ["explicit-active"]);
  assert.equal(resolved.primaryProtagonistIdUsed, "primary");
});

test("an explicit empty active-character selection stays empty", () => {
  const resolved = applyNarrativeFocus(
    { storyId: "story-1", activeCharacterIds: [] },
    "primary",
  );

  assert.deepEqual(resolved.activeCharacterIds, []);
  assert.equal(resolved.povCharacterId, "primary");
});

test("a primary protagonist fills omitted focus and no-primary stories remain unchanged", () => {
  assert.deepEqual(
    applyNarrativeFocus({ storyId: "story-1" }, "primary"),
    {
      storyId: "story-1",
      activeCharacterIds: ["primary"],
      povCharacterId: "primary",
      primaryProtagonistIdUsed: "primary",
    },
  );
  assert.deepEqual(applyNarrativeFocus({ storyId: "story-1" }), {
    storyId: "story-1",
    activeCharacterIds: undefined,
    povCharacterId: undefined,
    primaryProtagonistIdUsed: undefined,
  });
});
