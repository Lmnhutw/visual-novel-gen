import assert from "node:assert/strict";
import test from "node:test";

import {
  createCharacterSchema,
  randomizedCharacterSectionSchema,
  randomizeCharacterSectionSchema,
  updateCharacterSchema,
} from "@/lib/validators/character.schema";

const character = {
  storyId: "story_1",
  name: "Mira",
  gender: "female",
  age: 24,
  personality: { summary: "Observant and guarded." },
};

test("species is rejected and long-lived fantasy characters are supported", () => {
  assert.throws(() =>
    createCharacterSchema.parse({ ...character, species: "elf" }),
  );
  assert.doesNotThrow(() =>
    createCharacterSchema.parse({ ...character, age: 750, race: "elf" }),
  );
});

test("optional appearance and relationship profiles can be explicitly cleared", () => {
  const parsed = updateCharacterSchema.parse({
    appearance: null,
    relationshipPreference: null,
  });

  assert.equal(parsed.appearance, null);
  assert.equal(parsed.relationshipPreference, null);
});

test("random section contracts accept only the requested structured profile", () => {
  const request = randomizeCharacterSectionSchema.parse({
    section: "speech",
    character: { name: "Mira", gender: "female", age: 24 },
  });
  assert.equal(request.section, "speech");

  const candidate = randomizedCharacterSectionSchema.parse({
    section: "speech",
    speech: {
      speakingStyle: "Measured and observant",
      catchphrases: ["Let me think."],
    },
  });
  assert.equal(candidate.section, "speech");

  assert.throws(() =>
    randomizedCharacterSectionSchema.parse({
      section: "speech",
      appearance: {},
    }),
  );
});
