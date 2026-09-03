import assert from "node:assert/strict";
import test from "node:test";

import {
  emptyCharacterFormValues,
  withRandomizedSection,
} from "../components/workspace/studio/character-form-randomization";
import {
  createSeededRandom,
  generateAppearance,
  generateArchetypes,
  generateBackground,
  generateCharacterArc,
  generateCurrentState,
  generatePersonality,
  generateRelationshipPreference,
  generateSpeech,
  generateTalents,
  randomItem,
  randomItems,
  randomizeSection,
  renderTemplate,
  shuffle,
  weightedRandom,
  type CharacterGenerationContext,
} from "@/lib/character-generation";
import {
  archetypes,
  bodyScales,
  bodyTypes,
  femaleBodyScales,
  genders,
  loveLanguages,
  relationshipPartnerPreferences,
  relationshipSelfPreferences,
} from "@/lib/types/character";
import {
  createCharacterSchema,
  randomizableCharacterSections,
  randomizedCharacterSectionSchema,
} from "@/lib/validators/character.schema";

const context: CharacterGenerationContext = {
  name: "Mira",
  gender: "female",
  age: 24,
  occupation: "investigator",
  archetypes: ["shy", "ambitious", "protective"],
  personality: {
    summary: "Mira is observant, guarded, and fiercely loyal.",
    traits: ["observant", "disciplined"],
  },
  background: {
    family: "The eldest sibling in a loving but financially strained household.",
    majorLifeEvents: ["helped their community recover after a natural disaster"],
  },
  currentState: {
    emotionalState: "protective and quietly afraid",
    currentConflicts: ["an ally wants honesty while secrecy feels safer"],
  },
};

function keys(value: object) {
  return Object.keys(value).sort();
}

function assertUnique(values: readonly unknown[]) {
  assert.equal(new Set(values).size, values.length);
}

test("every section generator returns its complete section shape", () => {
  assert.deepEqual(
    keys(generatePersonality(context, createSeededRandom(1))),
    [
      "desires",
      "fears",
      "goals",
      "habits",
      "quirks",
      "strengths",
      "summary",
      "traits",
      "values",
      "weaknesses",
    ],
  );
  assert.deepEqual(keys(generateTalents(context, createSeededRandom(2))), [
    "giftednessLevel",
    "limitations",
    "talents",
  ]);
  assert.deepEqual(keys(generateSpeech(context, createSeededRandom(3))), [
    "catchphrases",
    "dialogueNotes",
    "profanityLevel",
    "speakingStyle",
    "vocabularyLevel",
  ]);
  assert.deepEqual(
    keys(generateRelationshipPreference(context, createSeededRandom(4))),
    [
      "attractedToGenders",
      "jealousyTolerance",
      "loveLanguages",
      "notes",
      "partner",
      "possessiveness",
      "preferredTraits",
      "self",
      "turnOffs",
      "turnOns",
    ],
  );
  assert.deepEqual(keys(generateBackground(context, createSeededRandom(5))), [
    "birthplace",
    "education",
    "family",
    "majorLifeEvents",
    "secrets",
    "socialClass",
    "trauma",
  ]);
  assert.deepEqual(keys(generateCurrentState(context, createSeededRandom(6))), [
    "currentConflicts",
    "currentGoals",
    "currentLocation",
    "emotionalState",
    "mentalState",
    "physicalState",
  ]);
  assert.deepEqual(keys(generateCharacterArc(context, createSeededRandom(7))), [
    "completedMilestones",
    "desiredGrowth",
    "externalConflict",
    "initialState",
    "internalConflict",
  ]);

  const appearance = generateAppearance(context, createSeededRandom(8));
  assert.equal(typeof appearance.heightCm, "number");
  assert.equal(typeof appearance.weightKg, "number");
  assert.deepEqual(keys(appearance.femaleBody ?? {}), [
    "chestSize",
    "hipSize",
    "waistSize",
  ]);
  assert.ok(generateArchetypes(context, createSeededRandom(9)).length >= 1);
});

test("all common-entry results pass the relevant Zod section schema", () => {
  for (const [index, section] of randomizableCharacterSections.entries()) {
    const candidate = randomizeSection(
      section,
      context,
      createSeededRandom(index + 10),
    );
    assert.doesNotThrow(() => randomizedCharacterSectionSchema.parse(candidate));
    assert.equal(candidate.section, section);
  }
});

test("generated enums and numeric ranges stay valid", () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const generatedArchetypes = generateArchetypes(
      context,
      createSeededRandom(seed),
    );
    generatedArchetypes.forEach((value) => assert.ok(archetypes.includes(value)));
    assertUnique(generatedArchetypes);

    const appearance = generateAppearance(context, createSeededRandom(seed));
    assert.ok(appearance.bodyType && bodyTypes.includes(appearance.bodyType));
    assert.ok((appearance.heightCm ?? 0) > 0);
    assert.ok((appearance.weightKg ?? 0) > 0);
    if (appearance.femaleBody) {
      Object.values(appearance.femaleBody).forEach((value) =>
        assert.ok(value && femaleBodyScales.includes(value)),
      );
    }
    if (appearance.maleBody) {
      Object.values(appearance.maleBody).forEach((value) =>
        assert.ok(value && bodyScales.includes(value)),
      );
    }

    const relationship = generateRelationshipPreference(
      context,
      createSeededRandom(seed),
    );
    relationship.attractedToGenders?.forEach((value) =>
      assert.ok(genders.includes(value)),
    );
    relationship.loveLanguages?.forEach((value) =>
      assert.ok(loveLanguages.includes(value)),
    );
    assert.ok(
      relationship.self &&
        relationshipSelfPreferences.includes(relationship.self),
    );
    assert.ok(
      relationship.partner &&
        relationshipPartnerPreferences.includes(relationship.partner),
    );
    assert.ok(Number.isInteger(relationship.jealousyTolerance));
    assert.ok((relationship.jealousyTolerance ?? -1) >= 0);
    assert.ok((relationship.jealousyTolerance ?? 101) <= 100);
    assert.ok(Number.isInteger(relationship.possessiveness));
    assert.ok((relationship.possessiveness ?? -1) >= 0);
    assert.ok((relationship.possessiveness ?? 101) <= 100);
  }
});

test("appearance generation respects gender-specific validation", () => {
  for (const gender of genders) {
    const appearance = generateAppearance(
      { ...context, gender },
      createSeededRandom(42),
    );
    const parsed = createCharacterSchema.parse({
      storyId: "story_1",
      name: "Mira",
      gender,
      age: 24,
      archetypes: [],
      personality: { summary: "Careful and observant." },
      appearance,
    });

    if (gender === "female") {
      assert.ok(parsed.appearance?.femaleBody);
      assert.equal(parsed.appearance?.maleBody, undefined);
    } else if (gender === "male") {
      assert.ok(parsed.appearance?.maleBody);
      assert.equal(parsed.appearance?.femaleBody, undefined);
    } else {
      assert.equal(parsed.appearance?.femaleBody, undefined);
      assert.equal(parsed.appearance?.maleBody, undefined);
    }
  }
});

test("generated arrays contain no duplicates", () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const random = createSeededRandom(seed);
    const personality = generatePersonality(context, random);
    Object.values(personality)
      .filter((value): value is string[] => Array.isArray(value))
      .forEach(assertUnique);

    const talents = generateTalents(context, random);
    assertUnique(talents.talents);
    assertUnique(talents.limitations);

    const relationship = generateRelationshipPreference(context, random);
    assertUnique(relationship.attractedToGenders ?? []);
    assertUnique(relationship.loveLanguages ?? []);
    assertUnique(relationship.preferredTraits);
    assertUnique(relationship.turnOns);
    assertUnique(relationship.turnOffs);
  }
});

test("random utilities are unique, safe for empty pools, and non-mutating", () => {
  const source = ["a", "a", "b", "c"];
  const selected = randomItems(source, 3, 3, createSeededRandom(2));
  assert.deepEqual(source, ["a", "a", "b", "c"]);
  assertUnique(selected);
  assert.equal(selected.length, 3);
  assert.equal(randomItem([], createSeededRandom(1)), undefined);
  assert.deepEqual(randomItems([], 0, 2, createSeededRandom(1)), []);
  assert.equal(weightedRandom([], createSeededRandom(1)), undefined);

  const ordered = [1, 2, 3, 4];
  shuffle(ordered, createSeededRandom(3));
  assert.deepEqual(ordered, [1, 2, 3, 4]);
});

test("template rendering replaces known placeholders and preserves missing ones", () => {
  assert.equal(
    renderTemplate("{name} values {value}.", { name: "Mira", value: "trust" }),
    "Mira values trust.",
  );
  assert.equal(
    renderTemplate("{name} fears {missing}.", { name: "Mira" }),
    "Mira fears {missing}.",
  );
});

test("personality summary reflects the generated personality", () => {
  const personality = generatePersonality(context, createSeededRandom(99));
  assert.ok(personality.summary.includes(personality.traits[0]));
  assert.ok(personality.summary.includes(personality.strengths[0]));
  assert.ok(personality.summary.includes(personality.weaknesses[0]));
});

test("applying one randomized section preserves unrelated form state", () => {
  const original = {
    ...emptyCharacterFormValues(),
    name: "Manually entered name",
    age: 31,
    gender: "female" as const,
    occupation: "Archivist",
    aliases: ["M"],
    archetypes: ["guarded" as const],
    personality: {
      ...emptyCharacterFormValues().personality,
      summary: "Manual personality",
    },
  };
  const candidate = randomizeSection(
    "speech",
    context,
    createSeededRandom(12),
  );
  const next = withRandomizedSection(original, candidate);

  assert.notDeepEqual(next.speech, original.speech);
  assert.equal(next.name, original.name);
  assert.equal(next.age, original.age);
  assert.equal(next.gender, original.gender);
  assert.equal(next.occupation, original.occupation);
  assert.strictEqual(next.aliases, original.aliases);
  assert.strictEqual(next.personality, original.personality);
  assert.strictEqual(next.archetypes, original.archetypes);
  assert.strictEqual(next.appearance, original.appearance);
  assert.strictEqual(next.background, original.background);
  assert.strictEqual(next.currentState, original.currentState);
  assert.strictEqual(next.characterArc, original.characterArc);
});

test("seeded generation is deterministic and different seeds vary", () => {
  const first = randomizeSection("personality", context, createSeededRandom(17));
  const repeat = randomizeSection("personality", context, createSeededRandom(17));
  assert.deepEqual(first, repeat);

  const variants = new Set(
    Array.from({ length: 12 }, (_, seed) =>
      JSON.stringify(
        randomizeSection("personality", context, createSeededRandom(seed + 1)),
      ),
    ),
  );
  assert.ok(variants.size > 1);
});
