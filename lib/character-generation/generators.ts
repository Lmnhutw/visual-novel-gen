import {
  bodyScales,
  bodyTypes,
  femaleBodyScales,
  genders,
  loveLanguages,
  relationshipPartnerPreferences,
  relationshipSelfPreferences,
  type Archetype,
  type BackgroundProfile,
  type CharacterArc,
  type CharacterState,
  type Gender,
  type PersonalityProfile,
  type RelationshipPreferenceProfile,
  type SpeechProfile,
  type TalentProfile,
} from "@/lib/types/character";
import type {
  RandomizableCharacterSection,
  RandomizedCharacterSection,
} from "@/lib/validators/character.schema";

import {
  appearanceData,
  backgroundData,
  characterArcData,
  constructiveArchetypes,
  currentStateData,
  flawedArchetypes,
  personalityData,
  relationshipData,
  speechData,
  talentData,
  type GenerationOption,
} from "./data";
import {
  chance,
  randomInt,
  randomItem,
  randomItems,
  shuffle,
  weightedRandom,
  type RandomSource,
} from "./random";
import { renderTemplate } from "./template";

type ResultFor<Section extends RandomizableCharacterSection> = Extract<
  RandomizedCharacterSection,
  { section: Section }
>;

export type GeneratedPersonality = ResultFor<"personality">["personality"];
export type GeneratedArchetypes = ResultFor<"archetypes">["archetypes"];
export type GeneratedTalents = ResultFor<"talents">["talents"];
export type GeneratedAppearance = ResultFor<"appearance">["appearance"];
export type GeneratedSpeech = ResultFor<"speech">["speech"];
export type GeneratedRelationshipPreference = ResultFor<"relationshipPreference">["relationshipPreference"];
export type GeneratedBackground = ResultFor<"background">["background"];
export type GeneratedCurrentState = ResultFor<"currentState">["currentState"];
export type GeneratedCharacterArc = ResultFor<"characterArc">["characterArc"];

export type CharacterGenerationContext = {
  name?: string;
  gender?: Gender;
  age?: number;
  race?: string;
  occupation?: string;
  archetypes?: readonly Archetype[];
  personality?: Partial<PersonalityProfile>;
  talents?: Partial<TalentProfile>;
  speech?: Partial<SpeechProfile>;
  relationshipPreference?: Partial<RelationshipPreferenceProfile>;
  background?: Partial<BackgroundProfile>;
  currentState?: Partial<CharacterState>;
  characterArc?: Partial<CharacterArc>;
};

function contextText(context: CharacterGenerationContext, extra = "") {
  return [
    context.name,
    context.race,
    context.occupation,
    ...(context.archetypes ?? []),
    context.personality?.summary,
    ...(context.personality?.traits ?? []),
    ...(context.personality?.strengths ?? []),
    ...(context.personality?.weaknesses ?? []),
    ...(context.personality?.fears ?? []),
    ...(context.personality?.desires ?? []),
    ...(context.personality?.goals ?? []),
    ...(context.personality?.values ?? []),
    context.background?.birthplace,
    context.background?.family,
    context.background?.education,
    context.background?.socialClass,
    ...(context.background?.majorLifeEvents ?? []),
    ...(context.background?.trauma ?? []),
    ...(context.background?.secrets ?? []),
    context.currentState?.physicalState,
    context.currentState?.emotionalState,
    context.currentState?.mentalState,
    ...(context.currentState?.currentGoals ?? []),
    ...(context.currentState?.currentConflicts ?? []),
    context.currentState?.currentLocation,
    extra,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
}

function optionWeight<T>(
  option: GenerationOption<T>,
  context: CharacterGenerationContext,
  text: string,
) {
  let weight = option.weight ?? 1;
  for (const archetype of context.archetypes ?? []) {
    weight += option.archetypeWeights?.[archetype] ?? 0;
  }
  for (const cue of option.cues ?? []) {
    if (text.includes(cue.toLowerCase())) weight += 2;
  }
  return weight;
}

function selectOption<T>(
  options: readonly GenerationOption<T>[],
  context: CharacterGenerationContext,
  random: RandomSource,
  extra = "",
): T | undefined {
  const text = contextText(context, extra);
  return weightedRandom(
    options.map((option) => ({
      value: option.value,
      weight: optionWeight(option, context, text),
    })),
    random,
  );
}

function selectRequired<T>(
  options: readonly GenerationOption<T>[],
  fallback: T,
  context: CharacterGenerationContext,
  random: RandomSource,
  extra = "",
) {
  return selectOption(options, context, random, extra) ?? fallback;
}

function selectMany<T>(
  options: readonly GenerationOption<T>[],
  min: number,
  max: number,
  context: CharacterGenerationContext,
  random: RandomSource,
  extra = "",
) {
  if (!options.length) return [];

  const count = randomInt(
    Math.min(min, options.length),
    Math.min(max, options.length),
    random,
  );
  const remaining = [...options];
  const selected: T[] = [];

  while (selected.length < count && remaining.length) {
    const option = weightedRandom(
      remaining.map((candidate) => ({
        value: candidate,
        weight: optionWeight(
          candidate,
          context,
          contextText(context, `${extra} ${selected.join(" ")}`),
        ),
      })),
      random,
    );
    if (!option) break;
    selected.push(option.value);
    remaining.splice(remaining.indexOf(option), 1);
  }

  return selected;
}

function includesArchetype(
  context: CharacterGenerationContext,
  archetype: Archetype,
) {
  return context.archetypes?.includes(archetype) ?? false;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function generateArchetypes(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedArchetypes {
  const text = contextText(context);
  const toWeighted = (values: readonly Archetype[]) =>
    values.map((value) => ({
      value,
      weight: text.includes(label(value)) ? 4 : 1,
    }));
  const takeUnique = (values: readonly Archetype[], count: number) => {
    const remaining = toWeighted(values);
    const selected: Archetype[] = [];
    while (selected.length < count && remaining.length) {
      const value = weightedRandom(remaining, random);
      if (!value) break;
      selected.push(value);
      remaining.splice(
        remaining.findIndex((entry) => entry.value === value),
        1,
      );
    }
    return selected;
  };

  const positive = takeUnique(constructiveArchetypes, randomInt(1, 3, random));
  const flawed = chance(0.78, random)
    ? takeUnique(flawedArchetypes, chance(0.25, random) ? 2 : 1)
    : [];
  return shuffle([...positive, ...flawed], random);
}

export function generatePersonality(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedPersonality {
  const traits = selectMany(personalityData.traits, 2, 4, context, random);
  const strengths = selectMany(
    personalityData.strengths,
    2,
    3,
    context,
    random,
  );
  const weaknesses = selectMany(
    personalityData.weaknesses,
    1,
    2,
    context,
    random,
  );
  const fears = selectMany(personalityData.fears, 1, 2, context, random);
  const desires = selectMany(personalityData.desires, 1, 2, context, random);
  const goals = selectMany(personalityData.goals, 1, 2, context, random);
  const values = selectMany(personalityData.values, 2, 3, context, random);
  const habits = selectMany(personalityData.habits, 1, 2, context, random);
  const quirks = selectMany(personalityData.quirks, 1, 2, context, random);
  const summaryTemplate =
    randomItem(personalityData.summaries, random) ??
    "{name} is {traits}, but they {weakness}.";
  const name = context.name?.trim() || "This character";
  const summary = renderTemplate(summaryTemplate, {
    name,
    traits: traits.join(", "),
    strength: strengths[0] ?? "adapt to pressure",
    weakness: weaknesses[0] ?? "struggle to trust their instincts",
    desire: desires[0] ?? "a life that feels honest",
  });

  return {
    summary,
    traits,
    strengths,
    weaknesses,
    fears,
    desires,
    goals,
    values,
    habits,
    quirks,
  };
}

export function generateTalents(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedTalents {
  const giftednessLevel =
    weightedRandom(
      [
        { value: "none" as const, weight: 1 },
        { value: "talented" as const, weight: 5 },
        {
          value: "gifted" as const,
          weight: includesArchetype(context, "intellectual") ? 5 : 3,
        },
        {
          value: "genius" as const,
          weight: includesArchetype(context, "ambitious") ? 2 : 1,
        },
        { value: "prodigy" as const, weight: 0.4 },
      ],
      random,
    ) ?? "talented";

  return {
    giftednessLevel,
    talents: selectMany(talentData.talents, 1, 3, context, random),
    limitations: selectMany(talentData.limitations, 1, 2, context, random),
  };
}

export function generateAppearance(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedAppearance {
  const bodyType = randomItem(bodyTypes, random) ?? "fit";
  const isHeavy = ["chubby", "heavy", "bear", "chubby_bear", "plus_size"].includes(
    bodyType,
  );
  const isMuscular = ["muscular", "six_pack", "lean_muscular"].includes(
    bodyType,
  );
  const heightRange =
    context.gender === "female"
      ? [150, 185]
      : context.gender === "male"
        ? [160, 198]
        : [150, 198];
  const weightRange = isHeavy ? [75, 125] : isMuscular ? [62, 105] : [48, 88];
  const expression = randomItem(appearanceData.faceExpressions, random) ?? "open";
  const detail =
    randomItem(appearanceData.faceDetails, random) ?? "an attentive gaze";

  const appearance: GeneratedAppearance = {
    heightCm: randomInt(heightRange[0], heightRange[1], random),
    weightKg: randomInt(weightRange[0], weightRange[1], random),
    bodyType,
    faceDescription: renderTemplate("{expression} features with {detail}", {
      expression,
      detail,
    }),
    hairColor: randomItem(appearanceData.hairColors, random),
    hairStyle: randomItem(appearanceData.hairStyles, random),
    eyeColor: randomItem(appearanceData.eyeColors, random),
    skinTone: randomItem(appearanceData.skinTones, random),
    clothingStyle: selectRequired(
      appearanceData.clothingStyles,
      "practical, understated layers",
      context,
      random,
    ),
    distinctiveFeatures: randomItems(
      appearanceData.distinctiveFeatures,
      1,
      2,
      random,
    ),
  };

  if (context.gender === "female") {
    appearance.femaleBody = {
      chestSize: randomItem(femaleBodyScales, random),
      waistSize: randomItem(femaleBodyScales, random),
      hipSize: randomItem(femaleBodyScales, random),
    };
  } else if (context.gender === "male") {
    appearance.maleBody = {
      shoulderWidth: randomItem(bodyScales, random),
      muscleMass: randomItem(bodyScales, random),
    };
  }

  return appearance;
}

export function generateSpeech(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedSpeech {
  const vocabularyLevel =
    weightedRandom(
      [
        { value: "simple" as const, weight: 2 },
        { value: "normal" as const, weight: 5 },
        {
          value: "educated" as const,
          weight: includesArchetype(context, "intellectual") ? 6 : 3,
        },
        {
          value: "academic" as const,
          weight: includesArchetype(context, "intellectual") ? 3 : 1,
        },
      ],
      random,
    ) ?? "normal";
  const profanityLevel =
    weightedRandom(
      [
        {
          value: "none" as const,
          weight: includesArchetype(context, "soft_spoken") ? 5 : 3,
        },
        { value: "light" as const, weight: 5 },
        {
          value: "medium" as const,
          weight: includesArchetype(context, "rebellious") ? 4 : 2,
        },
        {
          value: "heavy" as const,
          weight: includesArchetype(context, "rebellious") ? 1.5 : 0.5,
        },
      ],
      random,
    ) ?? "light";

  return {
    speakingStyle: selectRequired(
      speechData.styles,
      "clear and conversational",
      context,
      random,
    ),
    vocabularyLevel,
    profanityLevel,
    catchphrases: selectMany(speechData.catchphrases, 1, 2, context, random),
    dialogueNotes: selectRequired(
      speechData.notes,
      "Speech becomes more direct as trust grows.",
      context,
      random,
    ),
  };
}

function relationshipScore(
  context: CharacterGenerationContext,
  openValue: number,
  exclusiveValue: number,
  random: RandomSource,
) {
  let score = randomInt(25, 75, random);
  if (includesArchetype(context, "flirty")) score += openValue;
  if (includesArchetype(context, "adventurous")) score += openValue / 2;
  if (includesArchetype(context, "clingy")) score += exclusiveValue;
  if (includesArchetype(context, "jealous")) score += exclusiveValue;
  return score;
}

function clampPercentage(value: number) {
  return Math.round(Math.min(100, Math.max(0, value)));
}

export function generateRelationshipPreference(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedRelationshipPreference {
  const self =
    weightedRandom(
      relationshipSelfPreferences.map((value) => ({
        value,
        weight:
          value === "one_person" && includesArchetype(context, "romantic")
            ? 5
            : value !== "one_person" && includesArchetype(context, "flirty")
              ? 4
              : 2,
      })),
      random,
    ) ?? "one_person";
  const partner =
    weightedRandom(
      relationshipPartnerPreferences.map((value) => ({
        value,
        weight:
          value === "exclusive_only" &&
          (includesArchetype(context, "jealous") ||
            includesArchetype(context, "clingy"))
            ? 5
            : value !== "exclusive_only" &&
                includesArchetype(context, "adventurous")
              ? 3
              : 2,
      })),
      random,
    ) ?? "unsure";
  const preferredTraits = selectMany(
    relationshipData.preferredTraits,
    2,
    3,
    context,
    random,
  );
  const selectedLoveLanguages = randomItems(loveLanguages, 1, 3, random);
  const noteTemplate =
    randomItem(relationshipData.notes, random) ??
    "Values {quality} and responds to {language}.";

  return {
    attractedToGenders: randomItems(genders, 1, 3, random),
    self,
    partner,
    loveLanguages: selectedLoveLanguages,
    preferredTraits,
    turnOns: randomItems(relationshipData.turnOns, 2, 3, random),
    turnOffs: randomItems(relationshipData.turnOffs, 2, 3, random),
    jealousyTolerance: clampPercentage(
      relationshipScore(context, 12, -18, random) + randomInt(-8, 8, random),
    ),
    possessiveness: clampPercentage(
      relationshipScore(context, -8, 16, random) + randomInt(-8, 8, random),
    ),
    notes: renderTemplate(noteTemplate, {
      quality: preferredTraits[0] ?? "mutual respect",
      language: label(selectedLoveLanguages[0] ?? "quality_time"),
    }),
  };
}

export function generateBackground(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedBackground {
  const birthplace = selectRequired(
    backgroundData.birthplaces,
    "a small regional city",
    context,
    random,
  );
  const family = selectRequired(
    backgroundData.families,
    "Raised in a complicated but resilient household.",
    context,
    random,
    birthplace,
  );
  const education = selectRequired(
    backgroundData.education,
    "educated through practical experience",
    context,
    random,
    `${birthplace} ${family}`,
  );
  const socialClass = selectRequired(
    backgroundData.socialClasses,
    "working class",
    context,
    random,
    `${birthplace} ${family} ${education}`,
  );
  const sectionContext = `${birthplace} ${family} ${education} ${socialClass}`;
  const majorLifeEvents = selectMany(
    backgroundData.events,
    1,
    2,
    context,
    random,
    sectionContext,
  );
  const trauma = chance(0.68, random)
    ? selectMany(
        backgroundData.trauma,
        1,
        1,
        context,
        random,
        `${sectionContext} ${majorLifeEvents.join(" ")}`,
      )
    : [];
  const secrets = chance(0.72, random)
    ? selectMany(
        backgroundData.secrets,
        1,
        1,
        context,
        random,
        `${sectionContext} ${majorLifeEvents.join(" ")} ${trauma.join(" ")}`,
      )
    : [];

  return {
    birthplace,
    family,
    education,
    socialClass,
    majorLifeEvents,
    trauma,
    secrets,
  };
}

export function generateCurrentState(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedCurrentState {
  const physicalState = selectRequired(
    currentStateData.physical,
    "physically steady",
    context,
    random,
  );
  const emotionalState = selectRequired(
    currentStateData.emotional,
    "cautiously hopeful",
    context,
    random,
    physicalState,
  );
  const mentalState = selectRequired(
    currentStateData.mental,
    "alert and reflective",
    context,
    random,
    `${physicalState} ${emotionalState}`,
  );
  const currentGoals = selectMany(
    currentStateData.goals,
    1,
    2,
    context,
    random,
    `${emotionalState} ${mentalState}`,
  );
  const currentConflicts = selectMany(
    currentStateData.conflicts,
    1,
    2,
    context,
    random,
    `${emotionalState} ${mentalState} ${currentGoals.join(" ")}`,
  );

  return {
    physicalState,
    emotionalState,
    mentalState,
    currentGoals,
    currentConflicts,
    currentLocation:
      randomItem(currentStateData.locations, random) ?? "a temporary refuge",
  };
}

export function generateCharacterArc(
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): GeneratedCharacterArc {
  const initialState = selectRequired(
    characterArcData.initial,
    "They protect a familiar identity even when it no longer serves them.",
    context,
    random,
  );
  const desiredGrowth = selectRequired(
    characterArcData.growth,
    "Learn to make choices from conviction instead of fear.",
    context,
    random,
    initialState,
  );
  const internalConflict = selectRequired(
    characterArcData.internal,
    "They want change but fear what it will cost.",
    context,
    random,
    `${initialState} ${desiredGrowth}`,
  );
  const externalConflict = selectRequired(
    characterArcData.external,
    "An escalating obligation makes avoidance impossible.",
    context,
    random,
    `${initialState} ${desiredGrowth} ${internalConflict}`,
  );

  return {
    initialState,
    desiredGrowth,
    internalConflict,
    externalConflict,
    completedMilestones: chance(0.45, random)
      ? selectMany(
          characterArcData.milestones,
          1,
          1,
          context,
          random,
          `${initialState} ${desiredGrowth} ${internalConflict}`,
        )
      : [],
  };
}

export function randomizeSection(
  section: RandomizableCharacterSection,
  context: CharacterGenerationContext = {},
  random: RandomSource = Math.random,
): RandomizedCharacterSection {
  switch (section) {
    case "archetypes":
      return { section, archetypes: generateArchetypes(context, random) };
    case "personality":
      return { section, personality: generatePersonality(context, random) };
    case "talents":
      return { section, talents: generateTalents(context, random) };
    case "appearance":
      return { section, appearance: generateAppearance(context, random) };
    case "speech":
      return { section, speech: generateSpeech(context, random) };
    case "relationshipPreference":
      return {
        section,
        relationshipPreference: generateRelationshipPreference(context, random),
      };
    case "background":
      return { section, background: generateBackground(context, random) };
    case "currentState":
      return { section, currentState: generateCurrentState(context, random) };
    case "characterArc":
      return { section, characterArc: generateCharacterArc(context, random) };
  }
}
