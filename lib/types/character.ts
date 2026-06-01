export const archetypes = [
  "playful",
  "shy",
  "confident",
  "calm",
  "warm",
  "mysterious",
  "flirty",
  "serious",
  "chaotic",
  "soft_spoken",
  "protective",
  "ambitious",
  "rebellious",
  "intellectual",
  "romantic",
  "sarcastic",
  "adventurous",
  "nurturing",
  "jealous",
  "insecure",
  "arrogant",
  "cynical",
  "avoidant",
  "clingy",
  "impulsive",
  "stubborn",
  "guarded",
  "moody",
  "competitive",
  "self_centered",
] as const;

export type Archetype = (typeof archetypes)[number];

export const genders = ["male", "female", "non_binary", "other"] as const;
export type Gender = (typeof genders)[number];

export const bodyTypes = [
  "slim",
  "athletic",
  "fit",
  "muscular",
  "six_pack",
  "lean_muscular",
  "chubby",
  "heavy",
  "bear",
  "chubby_bear",
  "plus_size",
] as const;
export type BodyType = (typeof bodyTypes)[number];

export const femaleBodyScales = ["thin", "normal", "big", "super_big"] as const;
export type FemaleBodyScale = (typeof femaleBodyScales)[number];

export const bodyScales = ["small", "normal", "large", "very_large"] as const;
export type BodyScale = (typeof bodyScales)[number];

export const relationshipSelfPreferences = [
  "one_person",
  "multiple_people",
  "open_to_multiple",
  "not_ready_to_commit",
] as const;
export type RelationshipSelfPreference =
  (typeof relationshipSelfPreferences)[number];

export const relationshipPartnerPreferences = [
  "exclusive_only",
  "okay_with_multiple",
  "unsure",
  "no_preference",
] as const;
export type RelationshipPartnerPreference =
  (typeof relationshipPartnerPreferences)[number];

export const loveLanguages = [
  "words_of_affirmation",
  "quality_time",
  "physical_touch",
  "acts_of_service",
  "gift_giving",
] as const;
export type LoveLanguage = (typeof loveLanguages)[number];

export interface PersonalityProfile {
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
}

export interface TalentProfile {
  giftednessLevel: "none" | "talented" | "gifted" | "genius" | "prodigy";
  talents: string[];
  limitations: string[];
}

export interface FemaleBodyProfile {
  chestSize?: FemaleBodyScale;
  waistSize?: FemaleBodyScale;
  hipSize?: FemaleBodyScale;
}

export interface MaleBodyProfile {
  shoulderWidth?: BodyScale;
  muscleMass?: BodyScale;
}

export interface AppearanceProfile {
  heightCm?: number;
  weightKg?: number;
  bodyType?: BodyType;
  faceDescription?: string;
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  skinTone?: string;
  clothingStyle?: string;
  distinctiveFeatures?: string[];
  femaleBody?: FemaleBodyProfile;
  maleBody?: MaleBodyProfile;
}

export interface SpeechProfile {
  speakingStyle?: string;
  vocabularyLevel?: "simple" | "normal" | "educated" | "academic";
  profanityLevel?: "none" | "light" | "medium" | "heavy";
  catchphrases?: string[];
  dialogueNotes?: string;
}

export interface RelationshipPreferenceProfile {
  attractedToGenders?: Gender[];
  self?: RelationshipSelfPreference;
  partner?: RelationshipPartnerPreference;
  loveLanguages?: LoveLanguage[];
  preferredTraits?: string[];
  turnOns?: string[];
  turnOffs?: string[];
  jealousyTolerance?: number;
  possessiveness?: number;
  notes?: string;
}

export interface BackgroundProfile {
  birthplace?: string;
  family?: string;
  education?: string;
  socialClass?: string;
  majorLifeEvents?: string[];
  trauma?: string[];
  secrets?: string[];
}

export interface CharacterState {
  physicalState?: string;
  emotionalState?: string;
  mentalState?: string;
  currentGoals?: string[];
  currentConflicts?: string[];
  currentLocation?: string;
}

export interface CharacterArc {
  initialState?: string;
  desiredGrowth?: string;
  internalConflict?: string;
  externalConflict?: string;
  completedMilestones?: string[];
}

export interface Character {
  id: string;
  storyId: string;
  name: string;
  aliases: string[];
  gender: Gender;
  age: number;
  race?: string;
  species?: string;
  occupation?: string;
  personality: PersonalityProfile;
  archetypes: Archetype[];
  talents?: TalentProfile;
  appearance?: AppearanceProfile;
  speech?: SpeechProfile;
  relationshipPreference?: RelationshipPreferenceProfile;
  background?: BackgroundProfile;
  currentState?: CharacterState;
  characterArc?: CharacterArc;
  createdAt: Date;
  updatedAt: Date;
}
