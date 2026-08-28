export type StorySettings = {
  genre: string[] | string;
  tone: string | null;
  pov: string | null;
  tense: string | null;
  styleGuide?: string | null;
};

export type StorySummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
  settings: StorySettings | null;
  _count?: {
    characters: number;
    chapters: number;
    memories: number;
    continuityIssues: number;
    generationRuns?: number;
    retrievalLogs?: number;
  };
};

export type TemplateRecord = {
  id: string;
  name: string;
  aliases: string[];
  ageConfirmed: boolean;
  gender: string;
  age: number;
  race: string | null;
  occupation: string | null;
  archetypes: string[];
  profile: Record<string, unknown>;
};

export type CharacterRecord = {
  id: string;
  storyId?: string;
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
    personality?: { summary?: string; traits?: string[] } | null;
    talents?: unknown;
    appearance?: unknown;
    speech?: unknown;
    relationshipPreference?: unknown;
    background?: unknown;
    currentState?: { emotionalState?: string; currentGoals?: string[] } | null;
    characterArc?: unknown;
  } | null;
};

export type ChapterRecord = {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  status: string;
  tokenCount: number;
  _count?: { scenes: number; events: number; continuityIssues: number };
};

export type ContinuityIssue = {
  id: string;
  severity: string;
  category: string;
  description: string;
  confidence: number;
  status: string;
};

export type StoryDetail = StorySummary & {
  primaryProtagonistId?: string | null;
  characters: CharacterRecord[];
  chapters: ChapterRecord[];
  relationships: Array<{
    id: string;
    type: string;
    status: string;
    trust: number;
    intimacy: number;
    conflict: number;
    characterA: CharacterRecord;
    characterB: CharacterRecord;
  }>;
  continuityIssues: ContinuityIssue[];
};

export type DraftVersion = {
  id: string;
  title: string | null;
  content: string;
  status: string;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type CanonProposal = {
  id: string;
  type: string;
  targetType: string;
  title: string;
  description: string | null;
  proposedAfter: string;
  confidence: number;
  actionability: string;
  status: string;
};

export type GenerationJob = {
  id: string;
  type: string;
  status: string;
  stage: string;
  progress: number;
  error: string | null;
  errorCode: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  contextSnapshot?: string | null;
  draftVersion?: DraftVersion | null;
  proposals?: CanonProposal[];
  generationRun?: {
    model: string;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  } | null;
  _count?: { proposals: number };
};

export type WorkspaceView = "studio" | "story" | "cast" | "canon";
