import type { WritingHarnessConfig } from "@/lib/writing-harness/config";
import type { ChapterGenerationMode } from "@/lib/chapters/chapter-lifecycle";

export type RetrievedMemory = {
  id: string;
  memoryType: string;
  content: string;
  summary?: string | null;
  salience: number;
  emotionalWeight?: number;
  similarity?: number;
  finalScore?: number;
};

export type RecentApprovedScene = {
  id: string;
  number: number;
  title?: string | null;
  content: string;
  truncatedAtStart?: boolean;
};

export type GenerationContext = {
  story: {
    id: string;
    title: string;
    description?: string | null;
  };
  settings?: {
    genre: string[];
    tone?: string | null;
    pov?: string | null;
    tense?: string | null;
    styleGuide?: string | null;
    writingHarness?: WritingHarnessConfig;
    nsfwPolicy?: unknown;
    modelConfig?: unknown;
    chapterTargetWords?: number;
    chapterSoftLimitWords?: number;
    chapterHardLimitWords?: number;
    chapterAutoAdvance?: boolean;
  } | null;
  chapter?: {
    id: string;
    number: number;
    title: string;
    status: string;
    wordCount: number;
    progress: {
      currentWords: number;
      targetWords: number;
      softLimitWords: number;
      hardLimitWords: number;
      remainingToTarget: number;
      remainingToHardLimit: number;
      mode: ChapterGenerationMode;
      autoAdvance: boolean;
    };
  };
  recentApprovedScenes?: RecentApprovedScene[];
  characters: Array<{
    id: string;
    name: string;
    aliases: string[];
    role: string;
    status: string;
    ageConfirmed: boolean;
    gender: string;
    age: number;
    race?: string | null;
    occupation?: string | null;
    archetypes: string[];
    profile?: {
      personality?: unknown;
      voiceRules?: string | null;
      backstory?: string | null;
      appearance?: unknown;
      boundaries?: unknown;
      motivations?: unknown;
      talents?: unknown;
      speech?: unknown;
      relationshipPreference?: unknown;
      background?: unknown;
      currentState?: unknown;
      characterArc?: unknown;
    } | null;
    latestState?: {
      location?: string | null;
      emotionalState?: unknown;
      physicalState?: unknown;
      goals?: unknown;
    };
  }>;
  relationships: Array<{
    id: string;
    type: string;
    status: string;
    trust: number;
    intimacy: number;
    conflict: number;
    characterA: string;
    characterB: string;
    notes?: string | null;
    boundaries?: unknown;
    recentHistory: string[];
  }>;
  recentEvents: Array<{
    id: string;
    summary: string;
    eventType: string;
    salience: number;
  }>;
  lore: Array<{
    id: string;
    category: string;
    name: string;
    content: string;
    canonLevel: number;
  }>;
  secrets: Array<{
    id: string;
    name: string;
    truthStatus: string;
    holderCharacterId?: string | null;
    knownBy: string[];
  }>;
  plotThreads: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    commitments: unknown;
    foreshadowing: unknown;
    salience: number;
  }>;
  memories: RetrievedMemory[];
  budget?: {
    maxTokens: number;
    estimatedTokens: number;
    overBudget: boolean;
    omitted: Record<
      | "characters"
      | "recentApprovedScenes"
      | "relationships"
      | "secrets"
      | "recentEvents"
      | "plotThreads"
      | "lore"
      | "memories",
      number
    >;
  };
};
