import type {
  Archetype,
  BodyScale,
  BodyType,
  FemaleBodyScale,
  Gender,
  LoveLanguage,
  RelationshipPartnerPreference,
  RelationshipSelfPreference,
} from "@/lib/types/character";
import type { RandomizedCharacterSection } from "@/lib/validators/character.schema";

type CharacterRole = "PROTAGONIST" | "ANTAGONIST" | "SUPPORTING" | "BACKGROUND";
type CharacterStatus =
  | "ACTIVE"
  | "ABSENT"
  | "INJURED"
  | "UNCONSCIOUS"
  | "DEAD"
  | "UNKNOWN";

export type NumericField = number | "";

export type CharacterFormValues = {
  name: string;
  aliases: string[];
  role: CharacterRole;
  status: CharacterStatus;
  ageConfirmed: boolean;
  gender: Gender | "";
  age: NumericField;
  race: string;
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
  addRelationshipPreference: boolean;
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

export function emptyCharacterFormValues(): CharacterFormValues {
  return {
    name: "",
    aliases: [],
    role: "SUPPORTING",
    status: "ACTIVE",
    ageConfirmed: true,
    gender: "",
    age: "",
    race: "",
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
    addRelationshipPreference: false,
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
      femaleBody: { chestSize: "", waistSize: "", hipSize: "" },
      maleBody: { shoulderWidth: "", muscleMass: "" },
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

function numericValue(value: number | undefined): NumericField {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

export function withRandomizedSection(
  values: CharacterFormValues,
  candidate: RandomizedCharacterSection,
): CharacterFormValues {
  switch (candidate.section) {
    case "personality":
      return { ...values, personality: candidate.personality };
    case "archetypes":
      return { ...values, archetypes: candidate.archetypes };
    case "talents":
      return { ...values, talents: candidate.talents };
    case "appearance": {
      const appearance = candidate.appearance;
      return {
        ...values,
        addAppearance: true,
        appearance: {
          heightCm: numericValue(appearance.heightCm),
          weightKg: numericValue(appearance.weightKg),
          bodyType: appearance.bodyType ?? "",
          faceDescription: appearance.faceDescription ?? "",
          hairColor: appearance.hairColor ?? "",
          hairStyle: appearance.hairStyle ?? "",
          eyeColor: appearance.eyeColor ?? "",
          skinTone: appearance.skinTone ?? "",
          clothingStyle: appearance.clothingStyle ?? "",
          distinctiveFeatures: appearance.distinctiveFeatures,
          femaleBody: {
            chestSize: appearance.femaleBody?.chestSize ?? "",
            waistSize: appearance.femaleBody?.waistSize ?? "",
            hipSize: appearance.femaleBody?.hipSize ?? "",
          },
          maleBody: {
            shoulderWidth: appearance.maleBody?.shoulderWidth ?? "",
            muscleMass: appearance.maleBody?.muscleMass ?? "",
          },
        },
      };
    }
    case "speech":
      return {
        ...values,
        speech: {
          speakingStyle: candidate.speech.speakingStyle ?? "",
          vocabularyLevel: candidate.speech.vocabularyLevel ?? "",
          profanityLevel: candidate.speech.profanityLevel ?? "",
          catchphrases: candidate.speech.catchphrases,
          dialogueNotes: candidate.speech.dialogueNotes ?? "",
        },
      };
    case "relationshipPreference":
      return {
        ...values,
        addRelationshipPreference: true,
        relationshipPreference: {
          attractedToGenders:
            candidate.relationshipPreference.attractedToGenders ?? [],
          self: candidate.relationshipPreference.self ?? "",
          partner: candidate.relationshipPreference.partner ?? "",
          loveLanguages: candidate.relationshipPreference.loveLanguages ?? [],
          preferredTraits: candidate.relationshipPreference.preferredTraits,
          turnOns: candidate.relationshipPreference.turnOns,
          turnOffs: candidate.relationshipPreference.turnOffs,
          jealousyTolerance:
            candidate.relationshipPreference.jealousyTolerance ?? "",
          possessiveness: candidate.relationshipPreference.possessiveness ?? "",
          notes: candidate.relationshipPreference.notes ?? "",
        },
      };
    case "background":
      return {
        ...values,
        background: {
          birthplace: candidate.background.birthplace ?? "",
          family: candidate.background.family ?? "",
          education: candidate.background.education ?? "",
          socialClass: candidate.background.socialClass ?? "",
          majorLifeEvents: candidate.background.majorLifeEvents,
          trauma: candidate.background.trauma,
          secrets: candidate.background.secrets,
        },
      };
    case "currentState":
      return {
        ...values,
        currentState: {
          physicalState: candidate.currentState.physicalState ?? "",
          emotionalState: candidate.currentState.emotionalState ?? "",
          mentalState: candidate.currentState.mentalState ?? "",
          currentGoals: candidate.currentState.currentGoals,
          currentConflicts: candidate.currentState.currentConflicts,
          currentLocation: candidate.currentState.currentLocation ?? "",
        },
      };
    case "characterArc":
      return {
        ...values,
        characterArc: {
          initialState: candidate.characterArc.initialState ?? "",
          desiredGrowth: candidate.characterArc.desiredGrowth ?? "",
          internalConflict: candidate.characterArc.internalConflict ?? "",
          externalConflict: candidate.characterArc.externalConflict ?? "",
          completedMilestones: candidate.characterArc.completedMilestones,
        },
      };
  }
}
