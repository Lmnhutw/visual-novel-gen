import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacterSchema,
  updateCharacterSchema,
} from "@/lib/validators/character.schema";

const baseCharacter = {
  storyId: "story_1",
  name: "Mira",
  gender: "female",
  age: 24,
  personality: {
    summary: "Mira is observant and guarded.",
  },
};

test("character creation defaults optional arrays and supports multiple archetypes", () => {
  const parsed = createCharacterSchema.parse({
    ...baseCharacter,
    archetypes: ["guarded", "intellectual"],
  });

  assert.deepEqual(parsed.aliases, []);
  assert.deepEqual(parsed.archetypes, ["guarded", "intellectual"]);
  assert.deepEqual(parsed.personality.traits, []);
});

test("character creation rejects invalid and duplicate archetypes", () => {
  assert.throws(() =>
    createCharacterSchema.parse({
      ...baseCharacter,
      archetypes: ["guarded", "unknown"],
    }),
  );

  assert.throws(() =>
    createCharacterSchema.parse({
      ...baseCharacter,
      archetypes: ["guarded", "guarded"],
    }),
  );
});

test("gender-specific body profiles are validated", () => {
  assert.doesNotThrow(() =>
    createCharacterSchema.parse({
      ...baseCharacter,
      appearance: { femaleBody: { chestSize: "normal" } },
    }),
  );

  assert.throws(() =>
    createCharacterSchema.parse({
      ...baseCharacter,
      gender: "non_binary",
      appearance: { femaleBody: { chestSize: "normal" } },
    }),
  );

  assert.throws(() =>
    createCharacterSchema.parse({
      ...baseCharacter,
      appearance: { maleBody: { muscleMass: "large" } },
    }),
  );
});

test("relationship self and partner preferences are independent", () => {
  const parsed = createCharacterSchema.parse({
    ...baseCharacter,
    relationshipPreference: {
      self: "multiple_people",
      partner: "exclusive_only",
      jealousyTolerance: 40,
      possessiveness: 10,
    },
  });

  assert.equal(parsed.relationshipPreference?.self, "multiple_people");
  assert.equal(parsed.relationshipPreference?.partner, "exclusive_only");
});

test("relationship intensity ranges reject out-of-range values", () => {
  assert.throws(() =>
    createCharacterSchema.parse({
      ...baseCharacter,
      relationshipPreference: { jealousyTolerance: 101 },
    }),
  );

  assert.throws(() =>
    updateCharacterSchema.parse({
      relationshipPreference: { possessiveness: -1 },
    }),
  );
});

test("unknown fields are rejected consistently", () => {
  assert.throws(() =>
    createCharacterSchema.parse({
      ...baseCharacter,
      unknown: true,
    }),
  );
});
