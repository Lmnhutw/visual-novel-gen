"use client";

import { AlertCircle, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ZodError } from "zod";

import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { MultiSelectChips, type ChipOption } from "@/components/ui/multi-select-chips";
import { RadioCardGroup, type RadioCardOption } from "@/components/ui/radio-card-group";
import { SliderField } from "@/components/ui/slider-field";
import { TagInput } from "@/components/ui/tag-input";
import {
  archetypes,
  bodyScales,
  bodyTypes,
  femaleBodyScales,
  genders,
  loveLanguages,
  relationshipPartnerPreferences,
  relationshipSelfPreferences,
  type Archetype,
  type BodyScale,
  type BodyType,
  type Character,
  type FemaleBodyScale,
  type Gender,
  type LoveLanguage,
  type RelationshipPartnerPreference,
  type RelationshipSelfPreference,
} from "@/lib/types/character";
import {
  createCharacterSchema,
  updateCharacterSchema,
  type CreateCharacterInput,
  type UpdateCharacterInput,
} from "@/lib/validators/character.schema";

type CharacterRole = "PROTAGONIST" | "ANTAGONIST" | "SUPPORTING" | "BACKGROUND";
type CharacterStatus =
  | "ACTIVE"
  | "ABSENT"
  | "INJURED"
  | "UNCONSCIOUS"
  | "DEAD"
  | "UNKNOWN";

type NumericField = number | "";

export type CharacterFormRecord = Partial<Character> & {
  id?: string;
  role?: CharacterRole | string;
  status?: CharacterStatus | string;
  ageConfirmed?: boolean;
  profile?: {
    personality?: unknown;
    talents?: unknown;
    appearance?: unknown;
    speech?: unknown;
    relationshipPreference?: unknown;
    background?: unknown;
    currentState?: unknown;
    characterArc?: unknown;
    voiceRules?: string | null;
    backstory?: string | null;
  } | null;
};

type CharacterFormValues = {
  name: string;
  aliases: string[];
  role: CharacterRole;
  status: CharacterStatus;
  ageConfirmed: boolean;
  gender: Gender | "";
  age: NumericField;
  race: string;
  species: string;
  occupation: string;
  personality: {
    summary: string;
    traits: string[];
    strengths: string[];
    weaknesses: string[];
    fears: string[];
    desires: string[];
    goals: string[];
    values: string[];
    habits: string[];
    quirks: string[];
  };
  archetypes: Archetype[];
  talents: {
    giftednessLevel: "none" | "talented" | "gifted" | "genius" | "prodigy";
    talents: string[];
    limitations: string[];
  };
  addAppearance: boolean;
  appearance: {
    heightCm: NumericField;
    weightKg: NumericField;
    bodyType: BodyType | "";
    faceDescription: string;
    hairColor: string;
    hairStyle: string;
    eyeColor: string;
    skinTone: string;
    clothingStyle: string;
    distinctiveFeatures: string[];
    femaleBody: {
      chestSize: FemaleBodyScale | "";
      waistSize: FemaleBodyScale | "";
      hipSize: FemaleBodyScale | "";
    };
    maleBody: {
      shoulderWidth: BodyScale | "";
      muscleMass: BodyScale | "";
    };
  };
  speech: {
    speakingStyle: string;
    vocabularyLevel: "simple" | "normal" | "educated" | "academic" | "";
    profanityLevel: "none" | "light" | "medium" | "heavy" | "";
    catchphrases: string[];
    dialogueNotes: string;
  };
  relationshipPreference: {
    attractedToGenders: Gender[];
    self: RelationshipSelfPreference | "";
    partner: RelationshipPartnerPreference | "";
    loveLanguages: LoveLanguage[];
    preferredTraits: string[];
    turnOns: string[];
    turnOffs: string[];
    jealousyTolerance: NumericField;
    possessiveness: NumericField;
    notes: string;
  };
  background: {
    birthplace: string;
    family: string;
    education: string;
    socialClass: string;
    majorLifeEvents: string[];
    trauma: string[];
    secrets: string[];
  };
  currentState: {
    physicalState: string;
    emotionalState: string;
    mentalState: string;
    currentGoals: string[];
    currentConflicts: string[];
    currentLocation: string;
  };
  characterArc: {
    initialState: string;
    desiredGrowth: string;
    internalConflict: string;
    externalConflict: string;
    completedMilestones: string[];
  };
};

type CharacterFormProps = {
  storyId: string;
  character?: CharacterFormRecord | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (
    payload: CreateCharacterInput | UpdateCharacterInput,
    mode: "create" | "edit",
  ) => Promise<void>;
};

const characterRoles: CharacterRole[] = [
  "PROTAGONIST",
  "ANTAGONIST",
  "SUPPORTING",
  "BACKGROUND",
];

const characterStatuses: CharacterStatus[] = [
  "ACTIVE",
  "ABSENT",
  "INJURED",
  "UNCONSCIOUS",
  "DEAD",
  "UNKNOWN",
];

const positiveArchetypes = archetypes.slice(0, 18);
const flawedArchetypes = archetypes.slice(18);

const giftednessOptions = ["none", "talented", "gifted", "genius", "prodigy"] as const;
const vocabularyOptions = ["simple", "normal", "educated", "academic"] as const;
const profanityOptions = ["none", "light", "medium", "heavy"] as const;

const selfPreferenceOptions: RadioCardOption<RelationshipSelfPreference>[] =
  relationshipSelfPreferences.map((value) => {
    const descriptions: Record<RelationshipSelfPreference, string> = {
      one_person: "Prefers focusing romantic love on one person.",
      multiple_people: "Can genuinely love multiple people at the same time.",
      open_to_multiple:
        "May develop feelings for multiple people without seeking a defined poly relationship.",
      not_ready_to_commit:
        "Avoids serious commitment or keeps relationships undefined.",
    };

    const labels: Record<RelationshipSelfPreference, string> = {
      one_person: "Loves one person exclusively",
      multiple_people: "Can love multiple people",
      open_to_multiple: "Open to multiple feelings",
      not_ready_to_commit: "Not ready to commit",
    };

    return { value, label: labels[value], description: descriptions[value] };
  });

const partnerPreferenceOptions: RadioCardOption<RelationshipPartnerPreference>[] =
  relationshipPartnerPreferences.map((value) => {
    const descriptions: Record<RelationshipPartnerPreference, string> = {
      exclusive_only: "Expects their partner to love only them.",
      okay_with_multiple:
        "Accepts their partner having romantic feelings or relationships with multiple people.",
      unsure: "Still figuring out their boundaries.",
      no_preference: "Does not strongly care about romantic exclusivity.",
    };

    const labels: Record<RelationshipPartnerPreference, string> = {
      exclusive_only: "Expects exclusivity",
      okay_with_multiple: "Accepts multiple connections",
      unsure: "Unsure / conflicted",
      no_preference: "No strong preference",
    };

    return { value, label: labels[value], description: descriptions[value] };
  });

function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace("Non Binary", "Non-binary")
    .replace("Soft Spoken", "Soft-spoken")
    .replace("Self Centered", "Self-centered")
    .replace("Six Pack", "Six-pack")
    .replace("Plus Size", "Plus-size");
}

function toOptions<T extends string>(values: readonly T[]): ChipOption<T>[] {
  return values.map((value) => ({ value, label: labelFromValue(value) }));
}

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as T)
        : fallback;
    } catch {
      return fallback;
    }
  }

  return typeof value === "object" && !Array.isArray(value)
    ? (value as T)
    : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numericValue(value: unknown): NumericField {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function enumValue<T extends string>(
  value: unknown,
  approved: readonly T[],
  fallback: T | "",
): T | "" {
  return typeof value === "string" && approved.includes(value as T)
    ? (value as T)
    : fallback;
}

function cleanText(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function cleanArray(value: string[]) {
  const cleaned = Array.from(
    new Set(value.map((entry) => entry.trim()).filter(Boolean)),
  );

  return cleaned.length ? cleaned : undefined;
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  const compacted = Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === "") {
        return false;
      }

      if (Array.isArray(entry) && entry.length === 0) {
        return false;
      }

      if (
        entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        Object.keys(entry).length === 0
      ) {
        return false;
      }

      return true;
    }),
  ) as T;

  return Object.keys(compacted).length ? compacted : undefined;
}

function emptyValues(): CharacterFormValues {
  return {
    name: "",
    aliases: [],
    role: "SUPPORTING",
    status: "ACTIVE",
    ageConfirmed: true,
    gender: "",
    age: "",
    race: "",
    species: "",
    occupation: "",
    personality: {
      summary: "",
      traits: [],
      strengths: [],
      weaknesses: [],
      fears: [],
      desires: [],
      goals: [],
      values: [],
      habits: [],
      quirks: [],
    },
    archetypes: [],
    talents: {
      giftednessLevel: "none",
      talents: [],
      limitations: [],
    },
    addAppearance: false,
    appearance: {
      heightCm: "",
      weightKg: "",
      bodyType: "",
      faceDescription: "",
      hairColor: "",
      hairStyle: "",
      eyeColor: "",
      skinTone: "",
      clothingStyle: "",
      distinctiveFeatures: [],
      femaleBody: {
        chestSize: "",
        waistSize: "",
        hipSize: "",
      },
      maleBody: {
        shoulderWidth: "",
        muscleMass: "",
      },
    },
    speech: {
      speakingStyle: "",
      vocabularyLevel: "",
      profanityLevel: "",
      catchphrases: [],
      dialogueNotes: "",
    },
    relationshipPreference: {
      attractedToGenders: [],
      self: "",
      partner: "",
      loveLanguages: [],
      preferredTraits: [],
      turnOns: [],
      turnOffs: [],
      jealousyTolerance: "",
      possessiveness: "",
      notes: "",
    },
    background: {
      birthplace: "",
      family: "",
      education: "",
      socialClass: "",
      majorLifeEvents: [],
      trauma: [],
      secrets: [],
    },
    currentState: {
      physicalState: "",
      emotionalState: "",
      mentalState: "",
      currentGoals: [],
      currentConflicts: [],
      currentLocation: "",
    },
    characterArc: {
      initialState: "",
      desiredGrowth: "",
      internalConflict: "",
      externalConflict: "",
      completedMilestones: [],
    },
  };
}

function valuesFromCharacter(character?: CharacterFormRecord | null): CharacterFormValues {
  const values = emptyValues();

  if (!character) {
    return values;
  }

  const personality = character.personality ??
    parseJsonObject<Record<string, unknown>>(character.profile?.personality, {});
  const talents = character.talents ??
    parseJsonObject<Record<string, unknown>>(character.profile?.talents, {});
  const appearance = character.appearance ??
    parseJsonObject<Record<string, unknown>>(character.profile?.appearance, {});
  const speech = character.speech ??
    parseJsonObject<Record<string, unknown>>(character.profile?.speech, {});
  const relationshipPreference = character.relationshipPreference ??
    parseJsonObject<Record<string, unknown>>(
      character.profile?.relationshipPreference,
      {},
    );
  const background = character.background ??
    parseJsonObject<Record<string, unknown>>(character.profile?.background, {});
  const currentState = character.currentState ??
    parseJsonObject<Record<string, unknown>>(character.profile?.currentState, {});
  const characterArc = character.characterArc ??
    parseJsonObject<Record<string, unknown>>(character.profile?.characterArc, {});

  const femaleBody = parseJsonObject<Record<string, unknown>>(
    (appearance as { femaleBody?: unknown }).femaleBody,
    {},
  );
  const maleBody = parseJsonObject<Record<string, unknown>>(
    (appearance as { maleBody?: unknown }).maleBody,
    {},
  );

  return {
    ...values,
    name: stringValue(character.name),
    aliases: stringArray(character.aliases),
    role: enumValue(character.role, characterRoles, "SUPPORTING") as CharacterRole,
    status: enumValue(character.status, characterStatuses, "ACTIVE") as CharacterStatus,
    ageConfirmed: character.ageConfirmed ?? true,
    gender: enumValue(character.gender, genders, ""),
    age: numericValue(character.age),
    race: stringValue(character.race),
    species: stringValue(character.species),
    occupation: stringValue(character.occupation),
    personality: {
      summary: stringValue((personality as { summary?: unknown }).summary),
      traits: stringArray((personality as { traits?: unknown }).traits),
      strengths: stringArray((personality as { strengths?: unknown }).strengths),
      weaknesses: stringArray((personality as { weaknesses?: unknown }).weaknesses),
      fears: stringArray((personality as { fears?: unknown }).fears),
      desires: stringArray((personality as { desires?: unknown }).desires),
      goals: stringArray((personality as { goals?: unknown }).goals),
      values: stringArray((personality as { values?: unknown }).values),
      habits: stringArray((personality as { habits?: unknown }).habits),
      quirks: stringArray((personality as { quirks?: unknown }).quirks),
    },
    archetypes: stringArray(character.archetypes).filter((value): value is Archetype =>
      archetypes.includes(value as Archetype),
    ),
    talents: {
      giftednessLevel: enumValue(
        (talents as { giftednessLevel?: unknown }).giftednessLevel,
        giftednessOptions,
        "none",
      ) as CharacterFormValues["talents"]["giftednessLevel"],
      talents: stringArray((talents as { talents?: unknown }).talents),
      limitations: stringArray((talents as { limitations?: unknown }).limitations),
    },
    addAppearance: Object.keys(appearance as Record<string, unknown>).length > 0,
    appearance: {
      heightCm: numericValue((appearance as { heightCm?: unknown }).heightCm),
      weightKg: numericValue((appearance as { weightKg?: unknown }).weightKg),
      bodyType: enumValue(
        (appearance as { bodyType?: unknown }).bodyType,
        bodyTypes,
        "",
      ),
      faceDescription: stringValue(
        (appearance as { faceDescription?: unknown }).faceDescription,
      ),
      hairColor: stringValue((appearance as { hairColor?: unknown }).hairColor),
      hairStyle: stringValue((appearance as { hairStyle?: unknown }).hairStyle),
      eyeColor: stringValue((appearance as { eyeColor?: unknown }).eyeColor),
      skinTone: stringValue((appearance as { skinTone?: unknown }).skinTone),
      clothingStyle: stringValue(
        (appearance as { clothingStyle?: unknown }).clothingStyle,
      ),
      distinctiveFeatures: stringArray(
        (appearance as { distinctiveFeatures?: unknown }).distinctiveFeatures,
      ),
      femaleBody: {
        chestSize: enumValue(
          femaleBody.chestSize,
          femaleBodyScales,
          "",
        ),
        waistSize: enumValue(
          femaleBody.waistSize,
          femaleBodyScales,
          "",
        ),
        hipSize: enumValue(femaleBody.hipSize, femaleBodyScales, ""),
      },
      maleBody: {
        shoulderWidth: enumValue(
          maleBody.shoulderWidth,
          bodyScales,
          "",
        ),
        muscleMass: enumValue(maleBody.muscleMass, bodyScales, ""),
      },
    },
    speech: {
      speakingStyle: stringValue((speech as { speakingStyle?: unknown }).speakingStyle),
      vocabularyLevel: enumValue(
        (speech as { vocabularyLevel?: unknown }).vocabularyLevel,
        vocabularyOptions,
        "",
      ),
      profanityLevel: enumValue(
        (speech as { profanityLevel?: unknown }).profanityLevel,
        profanityOptions,
        "",
      ),
      catchphrases: stringArray((speech as { catchphrases?: unknown }).catchphrases),
      dialogueNotes: stringValue((speech as { dialogueNotes?: unknown }).dialogueNotes),
    },
    relationshipPreference: {
      attractedToGenders: stringArray(
        (relationshipPreference as { attractedToGenders?: unknown }).attractedToGenders,
      ).filter((value): value is Gender => genders.includes(value as Gender)),
      self: enumValue(
        (relationshipPreference as { self?: unknown }).self,
        relationshipSelfPreferences,
        "",
      ),
      partner: enumValue(
        (relationshipPreference as { partner?: unknown }).partner,
        relationshipPartnerPreferences,
        "",
      ),
      loveLanguages: stringArray(
        (relationshipPreference as { loveLanguages?: unknown }).loveLanguages,
      ).filter((value): value is LoveLanguage =>
        loveLanguages.includes(value as LoveLanguage),
      ),
      preferredTraits: stringArray(
        (relationshipPreference as { preferredTraits?: unknown }).preferredTraits,
      ),
      turnOns: stringArray((relationshipPreference as { turnOns?: unknown }).turnOns),
      turnOffs: stringArray((relationshipPreference as { turnOffs?: unknown }).turnOffs),
      jealousyTolerance: numericValue(
        (relationshipPreference as { jealousyTolerance?: unknown }).jealousyTolerance,
      ),
      possessiveness: numericValue(
        (relationshipPreference as { possessiveness?: unknown }).possessiveness,
      ),
      notes: stringValue((relationshipPreference as { notes?: unknown }).notes),
    },
    background: {
      birthplace: stringValue((background as { birthplace?: unknown }).birthplace),
      family: stringValue((background as { family?: unknown }).family),
      education: stringValue((background as { education?: unknown }).education),
      socialClass: stringValue((background as { socialClass?: unknown }).socialClass),
      majorLifeEvents: stringArray(
        (background as { majorLifeEvents?: unknown }).majorLifeEvents,
      ),
      trauma: stringArray((background as { trauma?: unknown }).trauma),
      secrets: stringArray((background as { secrets?: unknown }).secrets),
    },
    currentState: {
      physicalState: stringValue(
        (currentState as { physicalState?: unknown }).physicalState,
      ),
      emotionalState: stringValue(
        (currentState as { emotionalState?: unknown }).emotionalState,
      ),
      mentalState: stringValue((currentState as { mentalState?: unknown }).mentalState),
      currentGoals: stringArray(
        (currentState as { currentGoals?: unknown }).currentGoals,
      ),
      currentConflicts: stringArray(
        (currentState as { currentConflicts?: unknown }).currentConflicts,
      ),
      currentLocation: stringValue(
        (currentState as { currentLocation?: unknown }).currentLocation,
      ),
    },
    characterArc: {
      initialState: stringValue(
        (characterArc as { initialState?: unknown }).initialState,
      ),
      desiredGrowth: stringValue(
        (characterArc as { desiredGrowth?: unknown }).desiredGrowth,
      ),
      internalConflict: stringValue(
        (characterArc as { internalConflict?: unknown }).internalConflict,
      ),
      externalConflict: stringValue(
        (characterArc as { externalConflict?: unknown }).externalConflict,
      ),
      completedMilestones: stringArray(
        (characterArc as { completedMilestones?: unknown }).completedMilestones,
      ),
    },
  };
}

function normalizeValues(values: CharacterFormValues, storyId: string, mode: "create" | "edit") {
  const age = typeof values.age === "number" ? values.age : Number(values.age);
  const femaleBody =
    values.gender === "female"
      ? compactObject({
          chestSize: values.appearance.femaleBody.chestSize || undefined,
          waistSize: values.appearance.femaleBody.waistSize || undefined,
          hipSize: values.appearance.femaleBody.hipSize || undefined,
        })
      : undefined;
  const maleBody =
    values.gender === "male"
      ? compactObject({
          shoulderWidth: values.appearance.maleBody.shoulderWidth || undefined,
          muscleMass: values.appearance.maleBody.muscleMass || undefined,
        })
      : undefined;
  const appearance = values.addAppearance
    ? compactObject({
        heightCm: values.appearance.heightCm === "" ? undefined : values.appearance.heightCm,
        weightKg: values.appearance.weightKg === "" ? undefined : values.appearance.weightKg,
        bodyType: values.appearance.bodyType || undefined,
        faceDescription: cleanText(values.appearance.faceDescription),
        hairColor: cleanText(values.appearance.hairColor),
        hairStyle: cleanText(values.appearance.hairStyle),
        eyeColor: cleanText(values.appearance.eyeColor),
        skinTone: cleanText(values.appearance.skinTone),
        clothingStyle: cleanText(values.appearance.clothingStyle),
        distinctiveFeatures: cleanArray(values.appearance.distinctiveFeatures),
        femaleBody,
        maleBody,
      })
    : undefined;
  const talents = compactObject({
    giftednessLevel:
      values.talents.giftednessLevel === "none" &&
      !values.talents.talents.length &&
      !values.talents.limitations.length
        ? undefined
        : values.talents.giftednessLevel,
    talents: cleanArray(values.talents.talents),
    limitations: cleanArray(values.talents.limitations),
  });
  const speech = compactObject({
    speakingStyle: cleanText(values.speech.speakingStyle),
    vocabularyLevel: values.speech.vocabularyLevel || undefined,
    profanityLevel: values.speech.profanityLevel || undefined,
    catchphrases: cleanArray(values.speech.catchphrases),
    dialogueNotes: cleanText(values.speech.dialogueNotes),
  });
  const relationshipPreference = compactObject({
    attractedToGenders: values.relationshipPreference.attractedToGenders.length
      ? values.relationshipPreference.attractedToGenders
      : undefined,
    self: values.relationshipPreference.self || undefined,
    partner: values.relationshipPreference.partner || undefined,
    loveLanguages: values.relationshipPreference.loveLanguages.length
      ? values.relationshipPreference.loveLanguages
      : undefined,
    preferredTraits: cleanArray(values.relationshipPreference.preferredTraits),
    turnOns: cleanArray(values.relationshipPreference.turnOns),
    turnOffs: cleanArray(values.relationshipPreference.turnOffs),
    jealousyTolerance:
      values.relationshipPreference.jealousyTolerance === ""
        ? undefined
        : values.relationshipPreference.jealousyTolerance,
    possessiveness:
      values.relationshipPreference.possessiveness === ""
        ? undefined
        : values.relationshipPreference.possessiveness,
    notes: cleanText(values.relationshipPreference.notes),
  });
  const background = compactObject({
    birthplace: cleanText(values.background.birthplace),
    family: cleanText(values.background.family),
    education: cleanText(values.background.education),
    socialClass: cleanText(values.background.socialClass),
    majorLifeEvents: cleanArray(values.background.majorLifeEvents),
    trauma: cleanArray(values.background.trauma),
    secrets: cleanArray(values.background.secrets),
  });
  const currentState = compactObject({
    physicalState: cleanText(values.currentState.physicalState),
    emotionalState: cleanText(values.currentState.emotionalState),
    mentalState: cleanText(values.currentState.mentalState),
    currentGoals: cleanArray(values.currentState.currentGoals),
    currentConflicts: cleanArray(values.currentState.currentConflicts),
    currentLocation: cleanText(values.currentState.currentLocation),
  });
  const characterArc = compactObject({
    initialState: cleanText(values.characterArc.initialState),
    desiredGrowth: cleanText(values.characterArc.desiredGrowth),
    internalConflict: cleanText(values.characterArc.internalConflict),
    externalConflict: cleanText(values.characterArc.externalConflict),
    completedMilestones: cleanArray(values.characterArc.completedMilestones),
  });

  const payload = compactObject({
    storyId: mode === "create" ? storyId : undefined,
    name: values.name.trim(),
    aliases: cleanArray(values.aliases) ?? [],
    role: values.role,
    status: values.status,
    ageConfirmed: values.ageConfirmed,
    gender: values.gender || undefined,
    age: Number.isInteger(age) ? age : undefined,
    race: cleanText(values.race),
    species: cleanText(values.species),
    occupation: cleanText(values.occupation),
    archetypes: values.archetypes,
    personality: {
      summary: values.personality.summary.trim(),
      traits: cleanArray(values.personality.traits) ?? [],
      strengths: cleanArray(values.personality.strengths) ?? [],
      weaknesses: cleanArray(values.personality.weaknesses) ?? [],
      fears: cleanArray(values.personality.fears) ?? [],
      desires: cleanArray(values.personality.desires) ?? [],
      goals: cleanArray(values.personality.goals) ?? [],
      values: cleanArray(values.personality.values) ?? [],
      habits: cleanArray(values.personality.habits) ?? [],
      quirks: cleanArray(values.personality.quirks) ?? [],
    },
    talents,
    appearance,
    speech,
    relationshipPreference,
    background,
    currentState,
    characterArc,
  });

  return payload ?? {};
}

function formError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".") || "form"}: ${issue.message}`)
      .join(" ");
  }

  return error instanceof Error ? error.message : "Character validation failed.";
}

function TextField({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase text-on-surface-variant">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      <input
        className="h-10 rounded border border-outline-variant bg-surface-dim px-3 text-sm outline-none transition focus:border-primary"
        min={type === "number" ? 1 : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase text-on-surface-variant">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      <textarea
        className="min-h-24 rounded border border-outline-variant bg-surface-dim px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (value: T) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase text-on-surface-variant">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      <select
        className="h-10 rounded border border-outline-variant bg-surface-dim px-3 text-sm outline-none transition focus:border-primary"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labelFromValue(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CharacterForm({
  storyId,
  character,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: CharacterFormProps) {
  const mode = character?.id ? "edit" : "create";
  const initialValues = useMemo(() => valuesFromCharacter(character), [character]);
  const [values, setValues] = useState<CharacterFormValues>(initialValues);
  const [validationError, setValidationError] = useState("");

  const hasRelationshipData =
    values.relationshipPreference.attractedToGenders.length > 0 ||
    values.relationshipPreference.self ||
    values.relationshipPreference.partner ||
    values.relationshipPreference.loveLanguages.length > 0;
  const hasSpeechData =
    values.speech.speakingStyle ||
    values.speech.vocabularyLevel ||
    values.speech.profanityLevel ||
    values.speech.catchphrases.length > 0;
  const hasBackgroundData =
    values.background.birthplace ||
    values.background.family ||
    values.background.majorLifeEvents.length > 0 ||
    values.background.secrets.length > 0;
  const hasCurrentStateData =
    values.currentState.physicalState ||
    values.currentState.emotionalState ||
    values.currentState.currentGoals.length > 0;
  const hasArcData =
    values.characterArc.initialState ||
    values.characterArc.desiredGrowth ||
    values.characterArc.completedMilestones.length > 0;

  async function handleSubmit() {
    setValidationError("");

    try {
      const normalized = normalizeValues(values, storyId, mode);
      const payload =
        mode === "create"
          ? createCharacterSchema.parse(normalized)
          : updateCharacterSchema.parse(normalized);

      await onSubmit(payload, mode);
    } catch (error) {
      setValidationError(formError(error));
    }
  }

  return (
    <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-dim px-4 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primary">
            {mode === "edit" ? "Edit Character Bible" : "Create Character Bible"}
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Required identity and personality stay visible; optional profiles expand
            only when needed.
          </p>
        </div>
        <button
          aria-label="Close character form"
          className="inline-flex size-9 items-center justify-center rounded text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
          type="button"
          onClick={onCancel}
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="grid gap-5 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">
        <div className="flex flex-col gap-3">
          {validationError ? (
            <div className="flex gap-2 rounded border border-error-container bg-error-container/20 p-3 text-sm leading-6 text-error">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{validationError}</p>
            </div>
          ) : null}

          <CollapsibleSection
            defaultOpen
            required
            title="Basic Info"
            description="Core identity used by retrieval, scene prompts, and continuity checks."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                required
                label="Name"
                value={values.name}
                onChange={(name) => setValues((current) => ({ ...current, name }))}
                placeholder="Mira Vale"
              />
              <TextField
                required
                label="Age"
                type="number"
                value={values.age}
                onChange={(age) =>
                  setValues((current) => ({
                    ...current,
                    age: age ? Number(age) : "",
                  }))
                }
              />
              <SelectField
                required
                label="Gender"
                options={genders}
                value={values.gender}
                onChange={(gender) => setValues((current) => ({ ...current, gender }))}
              />
              <SelectField
                label="Role"
                options={characterRoles}
                value={values.role}
                onChange={(role) => setValues((current) => ({ ...current, role }))}
              />
              <SelectField
                label="Status"
                options={characterStatuses}
                value={values.status}
                onChange={(status) => setValues((current) => ({ ...current, status }))}
              />
              <TextField
                label="Occupation"
                value={values.occupation}
                onChange={(occupation) =>
                  setValues((current) => ({ ...current, occupation }))
                }
              />
              <TextField
                label="Race"
                value={values.race}
                onChange={(race) => setValues((current) => ({ ...current, race }))}
              />
              <TextField
                label="Species"
                value={values.species}
                onChange={(species) => setValues((current) => ({ ...current, species }))}
              />
              <TagInput
                className="md:col-span-2"
                label="Aliases"
                value={values.aliases}
                onChange={(aliases) => setValues((current) => ({ ...current, aliases }))}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen
            required
            title="Personality"
            description="The minimum useful profile for long-form character consistency."
          >
            <div className="grid gap-4">
              <TextAreaField
                required
                label="Personality Summary"
                value={values.personality.summary}
                onChange={(summary) =>
                  setValues((current) => ({
                    ...current,
                    personality: { ...current.personality, summary },
                  }))
                }
                placeholder="Guarded, observant, and loyal once trust is earned."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    "traits",
                    "strengths",
                    "weaknesses",
                    "fears",
                    "desires",
                    "goals",
                    "values",
                    "habits",
                    "quirks",
                  ] as const
                ).map((field) => (
                  <TagInput
                    key={field}
                    label={labelFromValue(field)}
                    value={values.personality[field]}
                    onChange={(next) =>
                      setValues((current) => ({
                        ...current,
                        personality: { ...current.personality, [field]: next },
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen
            title="Archetypes"
            description="Select multiple traits; flawed archetypes are separate so conflict is intentional."
          >
            <div className="grid gap-5">
              <MultiSelectChips
                label="Positive / Neutral"
                options={toOptions(positiveArchetypes)}
                value={values.archetypes.filter((item) =>
                  positiveArchetypes.includes(item),
                )}
                onChange={(next) =>
                  setValues((current) => ({
                    ...current,
                    archetypes: [
                      ...next,
                      ...current.archetypes.filter((item) =>
                        flawedArchetypes.includes(item),
                      ),
                    ],
                  }))
                }
              />
              <MultiSelectChips
                label="Negative / Flawed"
                options={toOptions(flawedArchetypes)}
                value={values.archetypes.filter((item) =>
                  flawedArchetypes.includes(item),
                )}
                onChange={(next) =>
                  setValues((current) => ({
                    ...current,
                    archetypes: [
                      ...current.archetypes.filter((item) =>
                        positiveArchetypes.includes(item),
                      ),
                      ...next,
                    ],
                  }))
                }
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Talents" description="Optional giftedness and limits.">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Giftedness Level"
                options={giftednessOptions}
                value={values.talents.giftednessLevel}
                onChange={(giftednessLevel) =>
                  setValues((current) => ({
                    ...current,
                    talents: { ...current.talents, giftednessLevel },
                  }))
                }
              />
              <TagInput
                label="Talents"
                value={values.talents.talents}
                onChange={(talents) =>
                  setValues((current) => ({
                    ...current,
                    talents: { ...current.talents, talents },
                  }))
                }
              />
              <TagInput
                className="md:col-span-2"
                label="Limitations"
                value={values.talents.limitations}
                onChange={(limitations) =>
                  setValues((current) => ({
                    ...current,
                    talents: { ...current.talents, limitations },
                  }))
                }
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen={values.addAppearance}
            title="Appearance"
            description="Shared physical details plus gender-specific optional body profile fields."
          >
            <div className="grid gap-4">
              <label className="flex items-center justify-between gap-3 rounded border border-outline-variant bg-surface-dim p-3 text-sm text-on-surface-variant">
                <span>Add appearance details</span>
                <input
                  checked={values.addAppearance}
                  className="size-4 accent-[#DFD0B8]"
                  type="checkbox"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      addAppearance: event.target.checked,
                    }))
                  }
                />
              </label>
              {values.addAppearance ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Height"
                    type="number"
                    value={values.appearance.heightCm}
                    onChange={(heightCm) =>
                      setValues((current) => ({
                        ...current,
                        appearance: {
                          ...current.appearance,
                          heightCm: heightCm ? Number(heightCm) : "",
                        },
                      }))
                    }
                  />
                  <TextField
                    label="Weight"
                    type="number"
                    value={values.appearance.weightKg}
                    onChange={(weightKg) =>
                      setValues((current) => ({
                        ...current,
                        appearance: {
                          ...current.appearance,
                          weightKg: weightKg ? Number(weightKg) : "",
                        },
                      }))
                    }
                  />
                  <SelectField
                    label="Body Type"
                    options={bodyTypes}
                    value={values.appearance.bodyType}
                    onChange={(bodyType) =>
                      setValues((current) => ({
                        ...current,
                        appearance: { ...current.appearance, bodyType },
                      }))
                    }
                  />
                  <TextField
                    label="Face Description"
                    value={values.appearance.faceDescription}
                    onChange={(faceDescription) =>
                      setValues((current) => ({
                        ...current,
                        appearance: { ...current.appearance, faceDescription },
                      }))
                    }
                  />
                  <TextField
                    label="Hair Color"
                    value={values.appearance.hairColor}
                    onChange={(hairColor) =>
                      setValues((current) => ({
                        ...current,
                        appearance: { ...current.appearance, hairColor },
                      }))
                    }
                  />
                  <TextField
                    label="Hair Style"
                    value={values.appearance.hairStyle}
                    onChange={(hairStyle) =>
                      setValues((current) => ({
                        ...current,
                        appearance: { ...current.appearance, hairStyle },
                      }))
                    }
                  />
                  <TextField
                    label="Eye Color"
                    value={values.appearance.eyeColor}
                    onChange={(eyeColor) =>
                      setValues((current) => ({
                        ...current,
                        appearance: { ...current.appearance, eyeColor },
                      }))
                    }
                  />
                  <TextField
                    label="Skin Tone"
                    value={values.appearance.skinTone}
                    onChange={(skinTone) =>
                      setValues((current) => ({
                        ...current,
                        appearance: { ...current.appearance, skinTone },
                      }))
                    }
                  />
                  <TextField
                    label="Clothing Style"
                    value={values.appearance.clothingStyle}
                    onChange={(clothingStyle) =>
                      setValues((current) => ({
                        ...current,
                        appearance: { ...current.appearance, clothingStyle },
                      }))
                    }
                  />
                  <TagInput
                    className="md:col-span-2"
                    label="Distinctive Features"
                    value={values.appearance.distinctiveFeatures}
                    onChange={(distinctiveFeatures) =>
                      setValues((current) => ({
                        ...current,
                        appearance: {
                          ...current.appearance,
                          distinctiveFeatures,
                        },
                      }))
                    }
                  />
                  {values.gender === "female" ? (
                    <div className="grid gap-4 rounded border border-outline-variant bg-surface p-3 md:col-span-2 md:grid-cols-3">
                      {(["chestSize", "waistSize", "hipSize"] as const).map((field) => (
                        <SelectField
                          key={field}
                          label={labelFromValue(field)}
                          options={femaleBodyScales}
                          value={values.appearance.femaleBody[field]}
                          onChange={(next) =>
                            setValues((current) => ({
                              ...current,
                              appearance: {
                                ...current.appearance,
                                femaleBody: {
                                  ...current.appearance.femaleBody,
                                  [field]: next,
                                },
                              },
                            }))
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                  {values.gender === "male" ? (
                    <div className="grid gap-4 rounded border border-outline-variant bg-surface p-3 md:col-span-2 md:grid-cols-2">
                      {(["shoulderWidth", "muscleMass"] as const).map((field) => (
                        <SelectField
                          key={field}
                          label={labelFromValue(field)}
                          options={bodyScales}
                          value={values.appearance.maleBody[field]}
                          onChange={(next) =>
                            setValues((current) => ({
                              ...current,
                              appearance: {
                                ...current.appearance,
                                maleBody: {
                                  ...current.appearance.maleBody,
                                  [field]: next,
                                },
                              },
                            }))
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen={Boolean(hasSpeechData)}
            title="Speech"
            description="Dialogue rules, catchphrases, vocabulary, and profanity range."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Speaking Style"
                value={values.speech.speakingStyle}
                onChange={(speakingStyle) =>
                  setValues((current) => ({
                    ...current,
                    speech: { ...current.speech, speakingStyle },
                  }))
                }
              />
              <SelectField
                label="Vocabulary Level"
                options={vocabularyOptions}
                value={values.speech.vocabularyLevel}
                onChange={(vocabularyLevel) =>
                  setValues((current) => ({
                    ...current,
                    speech: { ...current.speech, vocabularyLevel },
                  }))
                }
              />
              <SelectField
                label="Profanity Level"
                options={profanityOptions}
                value={values.speech.profanityLevel}
                onChange={(profanityLevel) =>
                  setValues((current) => ({
                    ...current,
                    speech: { ...current.speech, profanityLevel },
                  }))
                }
              />
              <TagInput
                label="Catchphrases"
                value={values.speech.catchphrases}
                onChange={(catchphrases) =>
                  setValues((current) => ({
                    ...current,
                    speech: { ...current.speech, catchphrases },
                  }))
                }
              />
              <TextAreaField
                label="Dialogue Notes"
                value={values.speech.dialogueNotes}
                onChange={(dialogueNotes) =>
                  setValues((current) => ({
                    ...current,
                    speech: { ...current.speech, dialogueNotes },
                  }))
                }
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen={Boolean(hasRelationshipData)}
            title="Relationship Preferences"
            description="Self and partner preferences are independent."
          >
            <div className="grid gap-5">
              <div className="rounded border border-outline-variant bg-surface-dim p-3 text-xs leading-5 text-on-surface-variant">
                <p>These settings are independent.</p>
                <p className="mt-2">
                  A character may love only one person while accepting a
                  non-exclusive partner, or love multiple people while still feeling
                  jealous, conflicted, or possessive.
                </p>
                <p className="mt-2">
                  These settings describe relationship preferences, not morality.
                  Non-exclusive dynamics should be consensual, honest, and
                  emotionally respectful unless the profile explicitly defines conflict.
                </p>
              </div>
              <MultiSelectChips
                label="Attracted To Genders"
                options={toOptions(genders)}
                value={values.relationshipPreference.attractedToGenders}
                onChange={(attractedToGenders) =>
                  setValues((current) => ({
                    ...current,
                    relationshipPreference: {
                      ...current.relationshipPreference,
                      attractedToGenders,
                    },
                  }))
                }
              />
              <RadioCardGroup
                columns
                label="How does this character personally approach romantic love?"
                options={selfPreferenceOptions}
                value={values.relationshipPreference.self}
                onChange={(self) =>
                  setValues((current) => ({
                    ...current,
                    relationshipPreference: {
                      ...current.relationshipPreference,
                      self,
                    },
                  }))
                }
              />
              <RadioCardGroup
                columns
                label="What does this character accept from the person they love?"
                options={partnerPreferenceOptions}
                value={values.relationshipPreference.partner}
                onChange={(partner) =>
                  setValues((current) => ({
                    ...current,
                    relationshipPreference: {
                      ...current.relationshipPreference,
                      partner,
                    },
                  }))
                }
              />
              <MultiSelectChips
                label="Love Languages"
                options={toOptions(loveLanguages)}
                value={values.relationshipPreference.loveLanguages}
                onChange={(loveLanguagesValue) =>
                  setValues((current) => ({
                    ...current,
                    relationshipPreference: {
                      ...current.relationshipPreference,
                      loveLanguages: loveLanguagesValue,
                    },
                  }))
                }
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TagInput
                  label="Preferred Traits"
                  value={values.relationshipPreference.preferredTraits}
                  onChange={(preferredTraits) =>
                    setValues((current) => ({
                      ...current,
                      relationshipPreference: {
                        ...current.relationshipPreference,
                        preferredTraits,
                      },
                    }))
                  }
                />
                <TagInput
                  label="Turn-ons"
                  value={values.relationshipPreference.turnOns}
                  onChange={(turnOns) =>
                    setValues((current) => ({
                      ...current,
                      relationshipPreference: {
                        ...current.relationshipPreference,
                        turnOns,
                      },
                    }))
                  }
                />
                <TagInput
                  label="Turn-offs"
                  value={values.relationshipPreference.turnOffs}
                  onChange={(turnOffs) =>
                    setValues((current) => ({
                      ...current,
                      relationshipPreference: {
                        ...current.relationshipPreference,
                        turnOffs,
                      },
                    }))
                  }
                />
                <SliderField
                  highLabel="100 = rarely jealous"
                  label="Jealousy Tolerance"
                  lowLabel="0 = easily jealous"
                  midLabel="50 = moderate"
                  value={values.relationshipPreference.jealousyTolerance}
                  onChange={(jealousyTolerance) =>
                    setValues((current) => ({
                      ...current,
                      relationshipPreference: {
                        ...current.relationshipPreference,
                        jealousyTolerance,
                      },
                    }))
                  }
                />
                <SliderField
                  highLabel="100 = highly possessive"
                  label="Possessiveness"
                  lowLabel="0 = not possessive"
                  midLabel="50 = moderate"
                  value={values.relationshipPreference.possessiveness}
                  onChange={(possessiveness) =>
                    setValues((current) => ({
                      ...current,
                      relationshipPreference: {
                        ...current.relationshipPreference,
                        possessiveness,
                      },
                    }))
                  }
                />
                <TextAreaField
                  label="Relationship Notes"
                  value={values.relationshipPreference.notes}
                  onChange={(notes) =>
                    setValues((current) => ({
                      ...current,
                      relationshipPreference: {
                        ...current.relationshipPreference,
                        notes,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen={Boolean(hasBackgroundData)}
            title="Background"
            description="History, secrets, and life events that may affect continuity."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Birthplace"
                value={values.background.birthplace}
                onChange={(birthplace) =>
                  setValues((current) => ({
                    ...current,
                    background: { ...current.background, birthplace },
                  }))
                }
              />
              <TextField
                label="Family"
                value={values.background.family}
                onChange={(family) =>
                  setValues((current) => ({
                    ...current,
                    background: { ...current.background, family },
                  }))
                }
              />
              <TextField
                label="Education"
                value={values.background.education}
                onChange={(education) =>
                  setValues((current) => ({
                    ...current,
                    background: { ...current.background, education },
                  }))
                }
              />
              <TextField
                label="Social Class"
                value={values.background.socialClass}
                onChange={(socialClass) =>
                  setValues((current) => ({
                    ...current,
                    background: { ...current.background, socialClass },
                  }))
                }
              />
              <TagInput
                label="Major Life Events"
                value={values.background.majorLifeEvents}
                onChange={(majorLifeEvents) =>
                  setValues((current) => ({
                    ...current,
                    background: { ...current.background, majorLifeEvents },
                  }))
                }
              />
              <TagInput
                label="Trauma"
                value={values.background.trauma}
                onChange={(trauma) =>
                  setValues((current) => ({
                    ...current,
                    background: { ...current.background, trauma },
                  }))
                }
              />
              <TagInput
                className="md:col-span-2"
                helperText="Secrets can affect continuity, relationship knowledge, and what each character is allowed to know."
                label="Secrets"
                value={values.background.secrets}
                onChange={(secrets) =>
                  setValues((current) => ({
                    ...current,
                    background: { ...current.background, secrets },
                  }))
                }
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen={Boolean(hasCurrentStateData)}
            title="Current State"
            description="Present-tense state used by scene generation."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Physical State"
                value={values.currentState.physicalState}
                onChange={(physicalState) =>
                  setValues((current) => ({
                    ...current,
                    currentState: { ...current.currentState, physicalState },
                  }))
                }
              />
              <TextField
                label="Emotional State"
                value={values.currentState.emotionalState}
                onChange={(emotionalState) =>
                  setValues((current) => ({
                    ...current,
                    currentState: { ...current.currentState, emotionalState },
                  }))
                }
              />
              <TextField
                label="Mental State"
                value={values.currentState.mentalState}
                onChange={(mentalState) =>
                  setValues((current) => ({
                    ...current,
                    currentState: { ...current.currentState, mentalState },
                  }))
                }
              />
              <TextField
                label="Current Location"
                value={values.currentState.currentLocation}
                onChange={(currentLocation) =>
                  setValues((current) => ({
                    ...current,
                    currentState: { ...current.currentState, currentLocation },
                  }))
                }
              />
              <TagInput
                label="Current Goals"
                value={values.currentState.currentGoals}
                onChange={(currentGoals) =>
                  setValues((current) => ({
                    ...current,
                    currentState: { ...current.currentState, currentGoals },
                  }))
                }
              />
              <TagInput
                label="Current Conflicts"
                value={values.currentState.currentConflicts}
                onChange={(currentConflicts) =>
                  setValues((current) => ({
                    ...current,
                    currentState: { ...current.currentState, currentConflicts },
                  }))
                }
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            defaultOpen={Boolean(hasArcData)}
            title="Character Arc"
            description="Arc constraints for long-form growth and milestone tracking."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextAreaField
                label="Initial State"
                value={values.characterArc.initialState}
                onChange={(initialState) =>
                  setValues((current) => ({
                    ...current,
                    characterArc: { ...current.characterArc, initialState },
                  }))
                }
              />
              <TextAreaField
                label="Desired Growth"
                value={values.characterArc.desiredGrowth}
                onChange={(desiredGrowth) =>
                  setValues((current) => ({
                    ...current,
                    characterArc: { ...current.characterArc, desiredGrowth },
                  }))
                }
              />
              <TextAreaField
                label="Internal Conflict"
                value={values.characterArc.internalConflict}
                onChange={(internalConflict) =>
                  setValues((current) => ({
                    ...current,
                    characterArc: { ...current.characterArc, internalConflict },
                  }))
                }
              />
              <TextAreaField
                label="External Conflict"
                value={values.characterArc.externalConflict}
                onChange={(externalConflict) =>
                  setValues((current) => ({
                    ...current,
                    characterArc: { ...current.characterArc, externalConflict },
                  }))
                }
              />
              <TagInput
                className="md:col-span-2"
                label="Completed Milestones"
                value={values.characterArc.completedMilestones}
                onChange={(completedMilestones) =>
                  setValues((current) => ({
                    ...current,
                    characterArc: {
                      ...current.characterArc,
                      completedMilestones,
                    },
                  }))
                }
              />
            </div>
          </CollapsibleSection>
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded border border-outline-variant bg-surface p-4">
          <div className="flex h-24 items-center justify-center rounded border border-outline-variant bg-primary text-3xl font-semibold text-on-primary">
            {values.name ? values.name.slice(0, 2).toUpperCase() : "IN"}
          </div>
          <div className="grid gap-2 text-xs text-on-surface-variant">
            <div className="flex items-center justify-between gap-3">
              <span>Gender</span>
              <span className="font-semibold text-primary">
                {values.gender ? labelFromValue(values.gender) : "Unset"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Archetypes</span>
              <span className="font-mono text-primary">{values.archetypes.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Optional profiles</span>
              <span className="font-mono text-primary">
                {
                  [
                    values.addAppearance,
                    Boolean(hasRelationshipData),
                    Boolean(hasSpeechData),
                    Boolean(hasBackgroundData),
                    Boolean(hasCurrentStateData),
                    Boolean(hasArcData),
                  ].filter(Boolean).length
                }
              </span>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded border border-outline-variant bg-surface-dim p-3 text-sm text-on-surface-variant">
            <span>Adult confirmation recorded</span>
            <input
              checked={values.ageConfirmed}
              className="size-4 accent-[#DFD0B8]"
              type="checkbox"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  ageConfirmed: event.target.checked,
                }))
              }
            />
          </label>
          <div className="rounded border border-outline-variant bg-surface-dim p-3">
            <p className="text-xs leading-5 text-on-surface-variant">
              Empty optional profiles are omitted from the API payload. Gender-specific
              body fields are submitted only for the matching gender.
            </p>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-outline-variant px-6 py-4">
        <button
          className="rounded border border-outline-variant px-4 py-2 text-sm font-semibold text-primary transition hover:bg-surface-container-high"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-50"
          disabled={!storyId || isSubmitting}
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
        >
          <Save className="size-4" />
          {mode === "edit" ? "Save Changes" : "Save Character"}
        </button>
      </div>
    </div>
  );
}
