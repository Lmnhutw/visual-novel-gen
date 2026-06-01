"use client";

import {
  BookOpen,
  ChevronDown,
  Cloud,
  Database,
  Library,
  Loader2,
  Menu,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Sparkles,
  Terminal,
  UserPlus,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  CharacterForm,
  type CharacterFormRecord,
} from "@/components/characters/character-form";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@/lib/validators/character.schema";

type StorySettings = {
  genre: string;
  tone: string | null;
  pov: string | null;
  tense: string | null;
  styleGuide?: string | null;
};

type StoryCounts = {
  characters: number;
  chapters: number;
  memories: number;
  continuityIssues: number;
  generationRuns?: number;
  retrievalLogs?: number;
};

type StorySummary = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
  settings: StorySettings | null;
  _count?: StoryCounts;
};

type CharacterRecord = {
  id: string;
  name: string;
  aliases: string[];
  role: string;
  status: string;
  ageConfirmed: boolean;
  gender: string;
  age: number;
  race?: string | null;
  species?: string | null;
  occupation?: string | null;
  archetypes: string[];
  profile?: {
    personality?: unknown;
    talents?: unknown;
    appearance?: unknown;
    speech?: unknown;
    relationshipPreference?: unknown;
    background?: unknown;
    currentState?: unknown;
    characterArc?: unknown;
    voiceRules: string | null;
    backstory: string | null;
  } | null;
};

type ChapterRecord = {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  content?: string | null;
  status: string;
  tokenCount: number;
  _count?: {
    scenes: number;
    events: number;
    continuityIssues: number;
  };
};

type RelationshipRecord = {
  id: string;
  type: string;
  status: string;
  trust: number;
  intimacy: number;
  conflict: number;
  notes: string | null;
  characterA: CharacterRecord;
  characterB: CharacterRecord;
};

type ContinuityIssue = {
  id: string;
  severity: string;
  category: string;
  description: string;
  confidence: number;
  status: string;
};

type StoryDetail = StorySummary & {
  characters: CharacterRecord[];
  chapters: ChapterRecord[];
  relationships: RelationshipRecord[];
  continuityIssues: ContinuityIssue[];
};

type GenerationResponse = {
  generationRunId: string | null;
  draft: string | null;
  prompt?: string;
  contextPreview?: unknown;
  continuityWarnings?: Array<{
    severity: string;
    category: string;
    description: string;
  }>;
};

type ApiErrorPayload = {
  error?: string;
};

type DisplayWarning = {
  severity: string;
  label: string;
  tone: StatusTone;
};

const navItems = [
  { id: "studio", label: "Generate", icon: WandSparkles },
  { id: "overview", label: "Overview", icon: Database },
  { id: "characters", label: "Characters", icon: Users },
  { id: "lore", label: "Lore", icon: Library },
  { id: "chapters", label: "Chapters", icon: BookOpen },
] as const;

type WorkspaceSection = (typeof navItems)[number]["id"];

const fallbackWarnings: DisplayWarning[] = [
  {
    severity: "P0",
    label: "Adult confirmation is required before mature generation.",
    tone: "danger",
  },
  {
    severity: "P1",
    label: "Relationship shifts should be backed by turning-point history.",
    tone: "warn",
  },
  {
    severity: "P2",
    label: "Recent state, injury, and location facts should appear in output.",
    tone: "neutral",
  },
];

const sampleLore = [
  {
    title: "Canon retrieval",
    text: "The context engine composes story settings, chapter summaries, characters, relationships, memories, and secrets before generation.",
  },
  {
    title: "Continuity policy",
    text: "Generated scenes must respect age confirmation, consent continuity, relationship state, and unresolved plot commitments.",
  },
];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & ApiErrorPayload;

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with ${response.status}.`);
  }

  return payload;
}

function warningTone(severity: string): StatusTone {
  if (severity === "P0") {
    return "danger";
  }

  if (severity === "P1") {
    return "warn";
  }

  return "neutral";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase text-on-surface-variant">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function WorkspaceShell() {
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("studio");
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [storyDetail, setStoryDetail] = useState<StoryDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [activeCharacterIds, setActiveCharacterIds] = useState<string[]>([]);
  const [goal, setGoal] = useState(
    "Write a tense scene where the leads must cooperate despite unresolved betrayal.",
  );
  const [maturityMode, setMaturityMode] = useState<"safe" | "mature">("safe");
  const [draft, setDraft] = useState("");
  const [contextPreview, setContextPreview] = useState("");
  const [warnings, setWarnings] = useState<GenerationResponse["continuityWarnings"]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsBooting] = useState(true);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterRecord | null>(
    null,
  );
  const [isStoryComposerOpen, setIsStoryComposerOpen] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryDescription, setNewStoryDescription] = useState("");

  const loadStories = useCallback(async (preferredStoryId?: string) => {
    const payload = await requestJson<{ stories: StorySummary[] }>("/api/stories");
    setStories(payload.stories);
    setSelectedStoryId((current) => {
      if (preferredStoryId) {
        return preferredStoryId;
      }

      if (current && payload.stories.some((story) => story.id === current)) {
        return current;
      }

      return payload.stories[0]?.id ?? "";
    });
  }, []);

  const loadStoryDetail = useCallback(async (storyId: string) => {
    const payload = await requestJson<{ story: StoryDetail }>(
      `/api/stories/${storyId}`,
    );
    setStoryDetail(payload.story);
    setWarnings([]);
    setActiveCharacterIds((current) => {
      const validIds = new Set(payload.story.characters.map((character) => character.id));
      return current.filter((id) => validIds.has(id));
    });
  }, []);

  const loadChapters = useCallback(async (storyId: string) => {
    const payload = await requestJson<{ chapters: ChapterRecord[] }>(
      `/api/chapters?storyId=${encodeURIComponent(storyId)}`,
    );
    setChapters(payload.chapters);
    setSelectedChapterId((current) => {
      if (current && payload.chapters.some((chapter) => chapter.id === current)) {
        return current;
      }

      return payload.chapters[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    void loadStories()
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load stories.",
        );
      })
      .finally(() => setIsBooting(false));
  }, [loadStories]);

  useEffect(() => {
    if (!selectedStoryId) {
      setStoryDetail(null);
      setChapters([]);
      return;
    }

    setError("");
    void Promise.all([
      loadStoryDetail(selectedStoryId),
      loadChapters(selectedStoryId),
    ]).catch((loadError: unknown) => {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load story workspace.",
      );
    });
  }, [loadChapters, loadStoryDetail, selectedStoryId]);

  const selectedStory = storyDetail ?? stories.find((story) => story.id === selectedStoryId);
  const characters = storyDetail?.characters ?? [];
  const relationships = storyDetail?.relationships ?? [];
  const activeCharacters = characters.filter((character) =>
    activeCharacterIds.includes(character.id),
  );
  const selectedCharacter = activeCharacters[0] ?? characters[0] ?? null;
  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId);
  const canGenerate = selectedStoryId.length > 0 && goal.trim().length >= 10;
  const activeNavItem =
    navItems.find((item) => item.id === activeSection) ?? navItems[0];

  const displayWarnings: DisplayWarning[] = useMemo(() => {
    if (warnings?.length) {
      return warnings.map((warning) => ({
        severity: warning.severity,
        label: warning.description,
        tone: warningTone(warning.severity),
      }));
    }

    if (storyDetail?.continuityIssues.length) {
      return storyDetail.continuityIssues.map((issue) => ({
        severity: issue.severity,
        label: issue.description,
        tone: warningTone(issue.severity),
      }));
    }

    return fallbackWarnings;
  }, [storyDetail?.continuityIssues, warnings]);

  const snapshotItems = [
    ["Characters", characters.length],
    ["Chapters", chapters.length],
    ["Relationships", relationships.length],
    ["Issues", storyDetail?.continuityIssues.length ?? 0],
  ] as const;

  async function refreshSelectedStory() {
    if (!selectedStoryId) {
      return;
    }

    await Promise.all([
      loadStories(selectedStoryId),
      loadStoryDetail(selectedStoryId),
      loadChapters(selectedStoryId),
    ]);
  }

  async function createStory() {
    setError("");
    setStatus("Creating story workspace...");
    setIsLoading(true);

    try {
      const payload = await requestJson<{ story: StorySummary }>("/api/stories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newStoryTitle.trim(),
          description: newStoryDescription.trim() || undefined,
          genre: ["visual novel", "character drama"],
          tone: "Restrained, atmospheric, continuity-forward",
          pov: "Third person limited",
          tense: "past",
          styleGuide:
            "Inkwell workspace: dark editorial UI, canon-aware prose, character-first scene construction.",
          nsfwPolicy: {
            matureModeAllowed: true,
            requireAdultCharacters: true,
            requireConsentContinuity: true,
          },
        }),
      });

      setNewStoryTitle("");
      setNewStoryDescription("");
      setIsStoryComposerOpen(false);
      setStatus("Story library updated.");
      await loadStories(payload.story.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Story creation failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function openNewCharacterForm() {
    setEditingCharacter(null);
    setIsCharacterModalOpen(true);
  }

  function openEditCharacterForm(character: CharacterRecord) {
    setEditingCharacter(character);
    setIsCharacterModalOpen(true);
  }

  async function saveCharacter(
    payload: CreateCharacterInput | UpdateCharacterInput,
    mode: "create" | "edit",
  ) {
    if (!selectedStoryId) {
      return;
    }

    setError("");
    setStatus(
      mode === "edit" ? "Updating character profile..." : "Creating character profile...",
    );
    setIsLoading(true);

    try {
      const url =
        mode === "edit" && editingCharacter?.id
          ? `/api/characters/${editingCharacter.id}`
          : "/api/characters";
      const method = mode === "edit" ? "PATCH" : "POST";

      await requestJson<{ character: CharacterRecord }>(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      setEditingCharacter(null);
      setIsCharacterModalOpen(false);
      setStatus(
        mode === "edit" ? "Character canon updated." : "Character canon created.",
      );
      await refreshSelectedStory();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : mode === "edit"
            ? "Character update failed."
            : "Character creation failed.",
      );
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  async function previewContext() {
    if (!canGenerate) {
      return;
    }

    setError("");
    setStatus("Retrieving context...");
    setIsLoading(true);

    try {
      const payload = await requestJson<{ context: unknown }>("/api/retrieval/context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storyId: selectedStoryId,
          query: goal,
          activeCharacterIds,
          includeSecrets: true,
          maxMemories: 12,
        }),
      });

      setContextPreview(JSON.stringify(payload.context, null, 2));
      setStatus("Context preview loaded.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Context preview failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function submitGeneration() {
    if (!canGenerate) {
      return;
    }

    setError("");
    setStatus("Generating scene...");
    setIsLoading(true);

    try {
      const payload = await requestJson<GenerationResponse>("/api/generation/scene", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storyId: selectedStoryId,
          chapterId: selectedChapterId || undefined,
          goal,
          sceneGoal: goal,
          activeCharacterIds,
          maturityMode,
          previewOnly: false,
        }),
      });

      setDraft(payload.draft ?? "");
      setContextPreview(JSON.stringify(payload.contextPreview ?? {}, null, 2));
      setWarnings(payload.continuityWarnings ?? []);
      setStatus("Scene generated.");
      await refreshSelectedStory();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Generation request failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function toggleActiveCharacter(characterId: string) {
    setActiveCharacterIds((current) =>
      current.includes(characterId)
        ? current.filter((id) => id !== characterId)
        : [...current, characterId],
    );
  }

  function renderStoryControls() {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-on-surface-variant">
            Story Workspace
          </span>
          <select
            className="h-10 rounded border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition focus:border-primary"
            value={selectedStoryId}
            onChange={(event) => setSelectedStoryId(event.target.value)}
          >
            <option value="">Select story</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-on-surface-variant">
            Target Chapter
          </span>
          <select
            className="h-10 rounded border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition focus:border-primary"
            value={selectedChapterId}
            onChange={(event) => setSelectedChapterId(event.target.value)}
          >
            <option value="">No chapter selected</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                Chapter {chapter.number}: {chapter.title}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  function renderCharacterPicker() {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-on-surface-variant">
            Active Characters
          </span>
          <button
            className="inline-flex items-center gap-1 rounded border border-outline-variant px-2 py-1 text-xs text-primary transition hover:bg-surface-container-high disabled:opacity-50"
            disabled={!selectedStoryId}
            type="button"
            onClick={openNewCharacterForm}
          >
            <UserPlus className="size-3.5" />
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeCharacters.map((character) => (
            <button
              key={character.id}
              className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1.5 text-xs font-semibold text-on-primary transition hover:opacity-90"
              type="button"
              onClick={() => toggleActiveCharacter(character.id)}
            >
              {character.name}
              <X className="size-3" />
            </button>
          ))}
          {characters
            .filter((character) => !activeCharacterIds.includes(character.id))
            .slice(0, 4)
            .map((character) => (
              <button
                key={character.id}
                className="rounded border border-dashed border-outline-variant px-2.5 py-1.5 text-xs text-on-surface-variant transition hover:border-primary hover:text-primary"
                type="button"
                onClick={() => toggleActiveCharacter(character.id)}
              >
                + {character.name}
              </button>
            ))}
          {!characters.length ? (
            <span className="rounded border border-dashed border-outline-variant px-2.5 py-1.5 text-xs text-on-surface-variant">
              No characters yet
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  function renderStudio() {
    return (
      <div className="flex flex-col gap-6">
        <section className="rounded border border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-col gap-5">
            <SectionTitle eyebrow="1" title="Prompt">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded border border-outline-variant px-3 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary disabled:opacity-50"
                  disabled={!canGenerate || isLoading}
                  type="button"
                  onClick={() => {
                    void previewContext();
                  }}
                >
                  <Search className="size-4" />
                  Preview Context
                </button>
                <button
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded px-4 text-sm font-semibold transition active:scale-[0.99]",
                    canGenerate
                      ? "bg-primary text-on-primary hover:opacity-90"
                      : "bg-surface-container-highest text-on-surface-variant",
                  )}
                  disabled={!canGenerate || isLoading}
                  type="button"
                  onClick={() => {
                    void submitGeneration();
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Zap className="size-4" />
                  )}
                  Generate
                </button>
              </div>
            </SectionTitle>

            {renderStoryControls()}

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-on-surface-variant">
                Scene Goal
              </span>
              <textarea
                className="min-h-44 w-full resize-y rounded border border-outline-variant bg-surface-container-lowest p-4 text-sm leading-6 text-on-surface outline-none transition placeholder:text-outline/70 focus:border-primary"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Describe the emotional arc, scene movement, continuity facts, and dialogue intent."
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
              {renderCharacterPicker()}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-on-surface-variant">
                  Maturity Mode
                </span>
                <div className="grid grid-cols-2 overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
                  {(["safe", "mature"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={cn(
                        "h-9 text-xs font-semibold uppercase transition",
                        maturityMode === mode
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:bg-surface-container-high",
                      )}
                      type="button"
                      onClick={() => setMaturityMode(mode)}
                    >
                      {mode === "safe" ? "SFW" : "NSFW"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded border border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-col gap-4">
            <SectionTitle eyebrow="2" title="Draft Output">
              <div className="flex items-center gap-2">
                <StatusPill tone={draft ? "ok" : "neutral"}>
                  {draft ? `${draft.trim().split(/\s+/).length} words` : "Empty"}
                </StatusPill>
                <button
                  aria-label="More draft actions"
                  className="inline-flex size-9 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
                  type="button"
                >
                  <MoreVertical className="size-4" />
                </button>
              </div>
            </SectionTitle>
            <textarea
              className="min-h-[24rem] w-full resize-y rounded border border-outline-variant bg-surface-container-lowest p-5 font-story text-base leading-8 text-on-surface outline-none transition placeholder:text-outline/70 focus:border-primary"
              placeholder="Generated content will appear here. You can edit the draft directly after generation."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
        </section>
      </div>
    );
  }

  function renderOverview() {
    return (
      <div className="flex flex-col gap-6">
        <section className="rounded border border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-col gap-5">
            <SectionTitle eyebrow="Workspace" title={selectedStory?.title ?? "No story selected"}>
              <StatusPill tone={selectedStory ? "ok" : "neutral"}>
                {selectedStory?.status ?? "Select story"}
              </StatusPill>
            </SectionTitle>
            <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
              {selectedStory?.description ??
                "Choose or create a story workspace before generating scenes."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {snapshotItems.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded border border-outline-variant bg-surface-container-lowest p-4"
                >
                  <p className="text-xs font-semibold text-on-surface-variant">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {renderLibrary()}
      </div>
    );
  }

  function renderLibrary() {
    const showComposer = isStoryComposerOpen || stories.length === 0;

    return (
      <section className="rounded border border-outline-variant bg-surface-container-low p-4">
        <div className="flex flex-col gap-5">
          <SectionTitle eyebrow="Library" title="Story Workspaces">
            <button
              className="inline-flex h-9 items-center gap-2 rounded bg-primary px-3 text-sm font-semibold text-on-primary transition hover:opacity-90"
              type="button"
              onClick={() => setIsStoryComposerOpen((current) => !current)}
            >
              <Plus className="size-4" />
              New Story
            </button>
          </SectionTitle>

          {showComposer ? (
            <div className="grid gap-3 rounded border border-outline-variant bg-surface-container-lowest p-4 lg:grid-cols-[1fr_1.5fr_auto]">
              <input
                className="h-10 rounded border border-outline-variant bg-surface-dim px-3 text-sm outline-none transition focus:border-primary"
                value={newStoryTitle}
                onChange={(event) => setNewStoryTitle(event.target.value)}
                placeholder="New story title"
              />
              <input
                className="h-10 rounded border border-outline-variant bg-surface-dim px-3 text-sm outline-none transition focus:border-primary"
                value={newStoryDescription}
                onChange={(event) => setNewStoryDescription(event.target.value)}
                placeholder="Short library description"
              />
              <button
                className="inline-flex h-10 items-center justify-center rounded border border-outline-variant px-4 text-sm font-semibold text-primary transition hover:bg-surface-container-high disabled:opacity-50"
                disabled={!newStoryTitle.trim() || isLoading}
                type="button"
                onClick={() => {
                  void createStory();
                }}
              >
                Create
              </button>
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-2">
            {stories.length ? (
              stories.map((story) => (
                <button
                  key={story.id}
                  className={cn(
                    "rounded border p-4 text-left transition",
                    story.id === selectedStoryId
                      ? "border-primary bg-surface-container-high"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary",
                  )}
                  type="button"
                  onClick={() => setSelectedStoryId(story.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-primary">
                        {story.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-on-surface-variant">
                        {story.description ?? "No description yet."}
                      </p>
                    </div>
                    <StatusPill>{story.status}</StatusPill>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                    <span>{story._count?.characters ?? 0} characters</span>
                    <span>{story._count?.chapters ?? 0} chapters</span>
                    <span>{story._count?.memories ?? 0} memories</span>
                  </div>
                  <p className="mt-3 text-[11px] text-on-surface-variant">
                    Updated {formatDate(story.updatedAt)}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center xl:col-span-2">
                <Database className="mx-auto size-8 text-outline" />
                <p className="mt-3 text-sm text-on-surface-variant">
                  Create a story to populate the library.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  function renderCharacters() {
    return (
      <section className="rounded border border-outline-variant bg-surface-container-low p-4">
        <div className="flex flex-col gap-5">
          <SectionTitle eyebrow="Canon" title="Character Profiles">
            <button
              className="inline-flex h-9 items-center gap-2 rounded bg-primary px-3 text-sm font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-50"
              disabled={!selectedStoryId}
              type="button"
              onClick={openNewCharacterForm}
            >
              <UserPlus className="size-4" />
              New Character
            </button>
          </SectionTitle>

          <div className="grid gap-3 xl:grid-cols-2">
            {characters.length ? (
              characters.map((character) => {
                const isActive = activeCharacterIds.includes(character.id);

                return (
                  <article
                    key={character.id}
                    className={cn(
                      "rounded border p-4 text-left transition",
                      isActive
                        ? "border-primary bg-surface-container-high"
                        : "border-outline-variant bg-surface-container-lowest hover:border-primary",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="flex size-10 shrink-0 items-center justify-center rounded bg-primary-container text-xs font-semibold text-on-primary-container"
                        type="button"
                        onClick={() => toggleActiveCharacter(character.id)}
                      >
                        {initials(character.name)}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-primary">
                            {character.name}
                          </h3>
                          <StatusPill>{character.role}</StatusPill>
                          <StatusPill>{character.gender}</StatusPill>
                          {isActive ? <StatusPill tone="ok">Active</StatusPill> : null}
                        </div>
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-on-surface-variant">
                          {typeof character.profile?.personality === "object" &&
                          character.profile?.personality &&
                          "summary" in character.profile.personality
                            ? String(character.profile.personality.summary)
                            : character.profile?.backstory ??
                              character.profile?.voiceRules ??
                              "No profile notes are stored yet."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded border border-outline-variant px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-surface-container-high"
                            type="button"
                            onClick={() => openEditCharacterForm(character)}
                          >
                            Edit bible
                          </button>
                          <button
                            className="rounded border border-dashed border-outline-variant px-2.5 py-1.5 text-xs text-on-surface-variant transition hover:border-primary hover:text-primary"
                            type="button"
                            onClick={() => toggleActiveCharacter(character.id)}
                          >
                            {isActive ? "Remove from focus" : "Add to focus"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center xl:col-span-2">
                <Users className="mx-auto size-8 text-outline" />
                <p className="mt-3 text-sm text-on-surface-variant">
                  Add a character to start building scene context.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  function renderLore() {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded border border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-col gap-5">
            <SectionTitle eyebrow="Retrieval" title="Context Preview">
              <StatusPill>{contextPreview ? "Live" : "Stable"}</StatusPill>
            </SectionTitle>
            {contextPreview ? (
              <pre className="max-h-[34rem] overflow-auto rounded border border-outline-variant bg-surface-container-lowest p-4 font-mono text-[11px] leading-5 text-on-surface-variant">
                {contextPreview}
              </pre>
            ) : (
              <div className="grid gap-3">
                {sampleLore.map((item) => (
                  <article
                    key={item.title}
                    className="rounded border border-outline-variant bg-surface-container-lowest p-4"
                  >
                    <h3 className="text-sm font-semibold text-primary">{item.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded border border-outline-variant bg-surface-container-low p-4">
          <div className="flex flex-col gap-4">
            <SectionTitle eyebrow="Continuity" title="Open Notes" />
            {displayWarnings.map((warning) => (
              <article
                key={`${warning.severity}-${warning.label}`}
                className="rounded border border-outline-variant bg-surface-container-lowest p-3"
              >
                <StatusPill tone={warning.tone}>{warning.severity}</StatusPill>
                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  {warning.label}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderChapters() {
    return (
      <section className="rounded border border-outline-variant bg-surface-container-low p-4">
        <div className="flex flex-col gap-5">
          <SectionTitle eyebrow="Ledger" title="Chapters">
            <StatusPill>{chapters.length} chapters</StatusPill>
          </SectionTitle>

          <div className="grid gap-3">
            {chapters.length ? (
              chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  className={cn(
                    "rounded border p-4 text-left transition",
                    chapter.id === selectedChapterId
                      ? "border-primary bg-surface-container-high"
                      : "border-outline-variant bg-surface-container-lowest hover:border-primary",
                  )}
                  type="button"
                  onClick={() => setSelectedChapterId(chapter.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-primary">
                        {chapter.number}. {chapter.title}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                        {chapter.summary ?? "No summary yet."}
                      </p>
                    </div>
                    <StatusPill>{chapter.status}</StatusPill>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                    <span>{chapter.tokenCount} tokens</span>
                    <span>{chapter._count?.scenes ?? 0} scenes</span>
                    <span>{chapter._count?.events ?? 0} events</span>
                    <span>{chapter._count?.continuityIssues ?? 0} issues</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
                <BookOpen className="mx-auto size-8 text-outline" />
                <p className="mt-3 text-sm text-on-surface-variant">
                  No chapters exist for this story yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  function renderActiveSection() {
    if (activeSection === "overview") {
      return renderOverview();
    }

    if (activeSection === "characters") {
      return renderCharacters();
    }

    if (activeSection === "lore") {
      return renderLore();
    }

    if (activeSection === "chapters") {
      return renderChapters();
    }

    return renderStudio();
  }

  function renderInspector() {
    return (
      <aside className="rounded border border-outline-variant bg-surface-container-low p-4 lg:sticky lg:top-20">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase text-on-surface-variant">
                Context Inspector
              </p>
              <h2 className="text-base font-semibold text-primary">Generation Scope</h2>
            </div>
            <button
              aria-label="Open debug payload"
              className="inline-flex size-9 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
              type="button"
              onClick={() => setIsDebugOpen(true)}
            >
              <Terminal className="size-4" />
            </button>
          </div>

          {status || error ? (
            <div
              className={cn(
                "rounded border p-3 text-xs leading-5",
                error
                  ? "border-error/40 bg-error-container/20 text-error"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface-variant",
              )}
            >
              {error || status}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded border border-outline-variant bg-surface-container-lowest p-3">
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm font-semibold">Working...</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded bg-surface-container-highest">
                <div className="h-full w-1/2 bg-primary" />
              </div>
            </div>
          ) : null}

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-primary">
                Continuity Warnings
              </h3>
              <StatusPill tone={displayWarnings.length ? "warn" : "ok"}>
                {displayWarnings.length}
              </StatusPill>
            </div>
            {displayWarnings.slice(0, 3).map((warning) => (
              <article
                key={`${warning.severity}-${warning.label}`}
                className="rounded border border-outline-variant bg-surface-container-lowest p-3"
              >
                <StatusPill tone={warning.tone}>{warning.severity}</StatusPill>
                <p className="mt-2 text-xs leading-5 text-on-surface-variant">
                  {warning.label}
                </p>
              </article>
            ))}
          </section>

          <section className="flex flex-col gap-3 border-t border-outline-variant pt-5">
            <h3 className="text-sm font-semibold text-primary">Active Focus</h3>
            {selectedChapter ? (
              <article className="rounded border border-outline-variant bg-surface-container-lowest p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      {selectedChapter.number}. {selectedChapter.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                      {selectedChapter.summary ?? "No summary yet."}
                    </p>
                  </div>
                  <StatusPill>{selectedChapter.status}</StatusPill>
                </div>
              </article>
            ) : (
              <p className="rounded border border-dashed border-outline-variant p-3 text-xs text-on-surface-variant">
                Select a chapter to anchor generation.
              </p>
            )}

            {selectedCharacter ? (
              <article className="rounded border border-outline-variant bg-surface-container-lowest p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded bg-primary-container text-xs font-semibold text-on-primary-container">
                    {initials(selectedCharacter.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      {selectedCharacter.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {selectedCharacter.role}
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <p className="rounded border border-dashed border-outline-variant p-3 text-xs text-on-surface-variant">
                Add a character to focus the scene.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3 border-t border-outline-variant pt-5">
            <h3 className="text-sm font-semibold text-primary">Backend</h3>
            <div className="grid gap-2 text-xs text-on-surface-variant">
              <div className="flex items-center justify-between gap-3">
                <span>Provider</span>
                <span className="font-mono text-primary">OpenRouter / Qwen</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Retrieval logs</span>
                <span className="font-mono text-primary">
                  {storyDetail?._count?.retrievalLogs ?? 0}
                </span>
              </div>
            </div>
          </section>
        </div>
      </aside>
    );
  }

  return (
    <main className="min-h-screen bg-background text-on-surface">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-outline-variant bg-surface-container-low md:flex md:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-outline-variant px-4">
            <div className="flex size-9 items-center justify-center rounded bg-primary text-on-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary">Inkwell</h1>
              <p className="text-[10px] font-semibold uppercase text-on-surface-variant">
                AI Storytelling
              </p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Workspace sections">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeSection;

              return (
                <button
                  key={item.id}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-10 w-full items-center gap-3 rounded px-3 text-left text-sm transition",
                    isActive
                      ? "bg-surface text-primary"
                      : "text-on-surface-variant hover:bg-surface hover:text-on-surface",
                  )}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                >
                  <Icon className="size-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex flex-col gap-1 border-t border-outline-variant p-3">
            <button
              className="flex h-10 w-full items-center gap-3 rounded px-3 text-left text-sm text-on-surface-variant transition hover:bg-surface"
              type="button"
            >
              <Settings className="size-4" />
              Settings
            </button>
            <div className="flex h-10 items-center gap-3 rounded px-3 text-sm text-on-surface-variant">
              <Cloud className="size-4 text-secondary" />
              System Status
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface/95 backdrop-blur">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Menu className="size-5 text-on-surface-variant md:hidden" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-primary">
                      {activeNavItem.label}
                    </h2>
                    <ChevronDown className="size-4 text-on-surface-variant" />
                  </div>
                  <p className="truncate text-sm text-on-surface-variant">
                    {selectedStory?.title ?? "No story selected"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded border border-outline-variant px-3 text-sm text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
                  type="button"
                  onClick={() => setIsDebugOpen(true)}
                >
                  <Terminal className="size-4" />
                  Debug
                </button>
                <button
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded px-4 text-sm font-semibold transition active:scale-[0.99]",
                    canGenerate
                      ? "bg-primary text-on-primary hover:opacity-90"
                      : "bg-surface-container-highest text-on-surface-variant",
                  )}
                  disabled={!canGenerate || isLoading}
                  type="button"
                  onClick={() => {
                    void submitGeneration();
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <WandSparkles className="size-4" />
                  )}
                  Generate
                </button>
              </div>
            </div>

            <nav
              className="flex gap-1 overflow-x-auto border-t border-outline-variant px-3 py-2 md:hidden"
              aria-label="Mobile workspace sections"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeSection;

                return (
                  <button
                    key={item.id}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center gap-2 rounded px-3 text-sm transition",
                      isActive
                        ? "bg-surface-container-high text-primary"
                        : "text-on-surface-variant",
                    )}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </header>

          <div className="grid flex-1 gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
            <div className="min-w-0">{renderActiveSection()}</div>
            {renderInspector()}
          </div>

          <footer className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-t border-outline-variant bg-surface-container-low px-4 py-2 text-[11px] text-on-surface-variant lg:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded bg-emerald-500" />
                OpenRouter / Qwen
              </span>
              <span>{storyDetail?._count?.retrievalLogs ?? 0} retrieval logs</span>
            </div>
            <span>Inkwell alpha</span>
          </footer>
        </section>
      </div>

      {isDebugOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <section className="flex max-h-[82vh] w-full max-w-3xl flex-col rounded border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
              <div>
                <h2 className="font-mono text-sm font-semibold text-primary">
                  OPENROUTER_PAYLOAD_VIEWER
                </h2>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Request shape for the current generation state.
                </p>
              </div>
              <button
                aria-label="Close debug payload"
                className="inline-flex size-9 items-center justify-center rounded text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
                type="button"
                onClick={() => setIsDebugOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-auto bg-surface-dim p-4 font-mono text-[11px] leading-5 text-primary">
              <pre>
                {JSON.stringify(
                  {
                    storyId: selectedStoryId || null,
                    chapterId: selectedChapterId || null,
                    activeCharacterIds,
                    maturityMode,
                    goal,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </section>
        </div>
      ) : null}

      {isCharacterModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <CharacterForm
            key={editingCharacter?.id ?? "new-character"}
            character={editingCharacter as CharacterFormRecord | null}
            isSubmitting={isLoading}
            storyId={selectedStoryId}
            onCancel={() => {
              setEditingCharacter(null);
              setIsCharacterModalOpen(false);
            }}
            onSubmit={saveCharacter}
          />
        </div>
      ) : null}
    </main>
  );
}
