"use client";

import {
  BookOpen,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import selectStyles from "@/components/ui/select.module.css";
import studioStyles from "./studio.module.css";

import { CharacterForm, type CharacterFormRecord } from "./character-form";
import type { GenerationContext } from "@/lib/retrieval/types";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@/lib/validators/character.schema";

import { Dialog, ModalFrame } from "@/components/ui/modal";

import { formatRequestError, requestJson } from "./api";
import { DraftReview } from "./draft-review";
import { GenerationStudio } from "./generation-studio";
import {
  CanonLedger,
  CastLedger,
  StoryLedger,
} from "./story-ledgers";
import type {
  CanonProposal,
  GenerationJob,
  StoryDetail,
  StorySummary,
  TemplateRecord,
  WorkspaceView,
} from "./types";
import { CharacterTemplateLibrary } from "./character-template-library";
import { WorkspaceNavigation } from "./workspace-navigation";

const defaultGoal =
  "Write the next scene with a choice that shifts the relationship and creates a new consequence for the story.";

function templateFormRecord(template: TemplateRecord): CharacterFormRecord {
  return {
    ...template,
    role: "SUPPORTING",
    status: "ACTIVE",
    profile: template.profile,
  } as unknown as CharacterFormRecord;
}

export function WriterStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storyId = searchParams.get("story") ?? "";
  const [activeView, setActiveView] = useState<WorkspaceView>(() => storyId ? "studio" : "story");
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [chapters, setChapters] = useState<StoryDetail["chapters"]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [goal, setGoal] = useState(defaultGoal);
  const [chapterId, setChapterId] = useState("");
  const [activeCharacterIds, setActiveCharacterIds] = useState<string[]>([]);
  const [maturityMode, setMaturityMode] = useState<"safe" | "mature">("safe");
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [contextPreview, setContextPreview] =
    useState<GenerationContext | null>(null);
  const [isContextPreviewLoading, setIsContextPreviewLoading] = useState(false);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(Boolean(storyId));
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<StorySummary | null>(null);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [templateQuery, setTemplateQuery] = useState("");
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [templateRole, setTemplateRole] = useState("SUPPORTING");
  const [editingCharacter, setEditingCharacter] = useState<CharacterFormRecord | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRecord | null>(null);
  const [isTemplateForm, setIsTemplateForm] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryDescription, setNewStoryDescription] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");

  const selectStory = useCallback((nextStoryId: string, nextView: WorkspaceView = nextStoryId ? "studio" : "story") => {
    setActiveView(nextView);
    if (nextStoryId === storyId) return;

    setContextPreview(null);
    setStory(null);
    setChapters([]);
    setJobs([]);
    setIsWorkspaceLoading(Boolean(nextStoryId));

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextStoryId) nextParams.set("story", nextStoryId);
    else nextParams.delete("story");
    const query = nextParams.toString();
    router.push(query ? `/library?${query}` : "/library");
  }, [router, searchParams, storyId]);

  const loadStories = useCallback(async () => {
    const payload = await requestJson<{ stories: StorySummary[] }>(
      "/api/stories",
    );
    setStories(payload.stories);
  }, []);

  const loadJobs = useCallback(async (selectedStoryId: string) => {
    const payload = await requestJson<{ jobs: GenerationJob[] }>(
      `/api/generation/jobs?storyId=${encodeURIComponent(selectedStoryId)}`,
    );
    setJobs(payload.jobs);
    setSelectedJobId((current) =>
      current && payload.jobs.some((job) => job.id === current)
        ? current
        : (payload.jobs[0]?.id ?? ""),
    );
    return payload.jobs;
  }, []);

  const loadTemplates = useCallback(async (query = "") => {
    const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
    const payload = await requestJson<{ templates: TemplateRecord[] }>(`/api/character-templates${suffix}`);
    setTemplates(payload.templates);
  }, []);

  const loadWorkspace = useCallback(
    async (selectedStoryId: string) => {
      const [storyPayload, chapterPayload] = await Promise.all([
        requestJson<{ story: StoryDetail }>(`/api/stories/${selectedStoryId}`),
        requestJson<{ chapters: StoryDetail["chapters"] }>(
          `/api/chapters?storyId=${encodeURIComponent(selectedStoryId)}`,
        ),
      ]);
      setStory(storyPayload.story);
      setChapters(chapterPayload.chapters);
      setChapterId((current) =>
        current &&
        chapterPayload.chapters.some((chapter) => chapter.id === current)
          ? current
          : (chapterPayload.chapters[0]?.id ?? ""),
      );
      setActiveCharacterIds((current) =>
        current.filter((id) =>
          storyPayload.story.characters.some(
            (character) => character.id === id,
          ),
        ),
      );
      await loadJobs(selectedStoryId);
    },
    [loadJobs],
  );

  useEffect(() => {
    void loadStories().catch((loadError: unknown) => {
      setError(formatRequestError(loadError, "Could not load stories."));
      setMessage("");
    });
  }, [loadStories]);

  useEffect(() => {
    if (!storyId) setActiveView("story");
  }, [storyId]);

  useEffect(() => {
    if (!storyId) {
      setStory(null);
      setChapters([]);
      setJobs([]);
      setIsWorkspaceLoading(false);
      return;
    }
    setMessage("");
    setError("");
    setStory(null);
    setChapters([]);
    setJobs([]);
    setIsWorkspaceLoading(true);
    void loadWorkspace(storyId)
      .then(() => setMessage(""))
      .catch((loadError: unknown) => {
        setError(
          formatRequestError(loadError, "Could not load the workspace."),
        );
        setMessage("");
      })
      .finally(() => setIsWorkspaceLoading(false));
  }, [loadWorkspace, storyId]);

  useEffect(() => {
    if (activeView === "cast" || isTemplatePickerOpen) {
      void loadTemplates(templateQuery).catch((loadError: unknown) =>
        setError(formatRequestError(loadError, "Could not load Character Library.")),
      );
    }
  }, [activeView, isTemplatePickerOpen, loadTemplates, templateQuery]);

  const runningJob = jobs.some(
    (job) => job.status === "QUEUED" || job.status === "RUNNING",
  );
  useEffect(() => {
    if (!storyId || !runningJob) return;
    const interval = window.setInterval(() => {
      void loadJobs(storyId).catch(() => undefined);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [loadJobs, runningJob, storyId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  async function refreshCurrentWorkspace() {
    if (!storyId) return;
    await Promise.all([loadStories(), loadWorkspace(storyId)]);
  }

  async function createStory() {
    if (!newStoryTitle.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = await requestJson<{ story: StorySummary }>(
        "/api/stories",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: newStoryTitle.trim(),
            description: newStoryDescription.trim() || undefined,
            genre: ["visual novel", "character drama"],
            tone: "Atmospheric, character-first, continuity-forward",
            pov: "Third person limited",
            tense: "Past",
            nsfwPolicy: {
              matureModeAllowed: true,
              requireAdultCharacters: true,
              requireConsentContinuity: true,
            },
          }),
        },
      );
      setNewStoryTitle("");
      setNewStoryDescription("");
      setIsStoryModalOpen(false);
      setMessage("Story workspace created.");
      await loadStories();
      selectStory(payload.story.id);
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not create story."));
    } finally {
      setIsLoading(false);
    }
  }

  async function createChapter() {
    if (!storyId || !newChapterTitle.trim()) return;
    setIsLoading(true);
    try {
      await requestJson("/api/chapters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storyId,
          number: chapters.length + 1,
          title: newChapterTitle.trim(),
          status: "OUTLINE",
        }),
      });
      setNewChapterTitle("");
      setIsChapterModalOpen(false);
      setMessage("Chapter added to the manuscript spine.");
      await refreshCurrentWorkspace();
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not create chapter."));
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteStory() {
    if (!storyToDelete) return;
    setIsLoading(true);
    setError("");
    try {
      await requestJson(`/api/stories/${storyToDelete.id}`, { method: "DELETE" });
      setMessage(`Deleted ${storyToDelete.title}.`);
      setStoryToDelete(null);
      await loadStories();
      if (storyToDelete.id === storyId) selectStory("");
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not delete story."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCharacter(
    payload: CreateCharacterInput | UpdateCharacterInput,
    mode: "create" | "edit",
  ) {
    if (!storyId && !isTemplateForm) return;
    setIsLoading(true);
    try {
      if (isTemplateForm) {
        const templateInput = Object.fromEntries(
          Object.entries(payload as CreateCharacterInput).filter(([key]) =>
            !["storyId", "role", "status", "currentState"].includes(key),
          ),
        );
        await requestJson(editingTemplate ? `/api/character-templates/${editingTemplate.id}` : "/api/character-templates", {
          method: editingTemplate ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(templateInput),
        });
        setMessage(editingTemplate ? "Character Library item updated." : "Character saved to the Library.");
        await loadTemplates(templateQuery);
      } else {
        await requestJson(mode === "edit" && editingCharacter?.id ? `/api/characters/${editingCharacter.id}` : "/api/characters", {
          method: mode === "edit" && editingCharacter?.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        setMessage(mode === "edit" ? "Character canon updated." : "Character canon created.");
        await refreshCurrentWorkspace();
      }
      setEditingCharacter(null);
      setEditingTemplate(null);
      setIsTemplateForm(false);
      setIsCharacterModalOpen(false);
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not save character."));
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateCharacter() {
    setEditingCharacter(null);
    setEditingTemplate(null);
    setIsTemplateForm(false);
    setIsCharacterModalOpen(true);
  }

  function openTemplateForm(template?: TemplateRecord) {
    setEditingCharacter(null);
    setEditingTemplate(template ?? null);
    setIsTemplateForm(true);
    setIsCharacterModalOpen(true);
  }

  async function duplicateCharacter(character: CharacterFormRecord) {
    if (!character.id) return;
    setIsLoading(true);
    try {
      const payload = await requestJson<{ character: CreateCharacterInput }>(`/api/characters/${character.id}/duplicate`, { method: "POST" });
      setEditingCharacter(payload.character as unknown as CharacterFormRecord);
      setEditingTemplate(null);
      setIsTemplateForm(false);
      setIsCharacterModalOpen(true);
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not duplicate character."));
    } finally {
      setIsLoading(false);
    }
  }

  async function addTemplateToStory(templateId: string) {
    if (!storyId) return;
    setIsLoading(true);
    try {
      await requestJson(`/api/stories/${storyId}/characters/from-template`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId, role: templateRole }),
      });
      setIsTemplatePickerOpen(false);
      setMessage("An independent Story character was created from the Library item.");
      await refreshCurrentWorkspace();
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not add this Library character."));
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteTemplate(template: TemplateRecord) {
    setIsLoading(true);
    try {
      await requestJson(`/api/character-templates/${template.id}`, { method: "DELETE" });
      setMessage("Character Library item deleted. Existing Story copies are unchanged.");
      await loadTemplates(templateQuery);
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not delete this Library character."));
    } finally {
      setIsLoading(false);
    }
  }

  async function setPrimaryProtagonist(primaryProtagonistId: string | null) {
    if (!storyId) return;
    setIsLoading(true);
    try {
      await requestJson(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ primaryProtagonistId }),
      });
      setMessage(primaryProtagonistId ? "Primary protagonist selected." : "Primary protagonist cleared.");
      await refreshCurrentWorkspace();
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not update the primary protagonist."));
    } finally {
      setIsLoading(false);
    }
  }

  async function startGeneration() {
    if (!storyId || goal.trim().length < 10) return;
    setIsLoading(true);
    setError("");
    try {
      const idempotencyKey = `${storyId}:${chapterId}:${Date.now()}`;
      const result = await requestJson<{ job: GenerationJob }>(
        "/api/generation/jobs",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storyId,
            chapterId: chapterId || undefined,
            goal,
            sceneGoal: goal,
            activeCharacterIds,
            maturityMode,
            includeSecrets,
            idempotencyKey,
            type: "scene",
          }),
        },
      );
      setJobs((current) => [
        result.job,
        ...current.filter((job) => job.id !== result.job.id),
      ]);
      setSelectedJobId(result.job.id);
      setMessage("Generation job queued. You can keep working while it runs.");
      void requestJson<{ job: GenerationJob }>(
        `/api/generation/jobs/${result.job.id}/run`,
        { method: "POST" },
      )
        .then(() => refreshCurrentWorkspace())
        .catch((runError: unknown) =>
          setError(formatRequestError(runError, "Generation failed.")),
        );
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not start generation."));
    } finally {
      setIsLoading(false);
    }
  }

  const previewContext = useCallback(async () => {
    if (!storyId || goal.trim().length < 10) return;

    setIsContextPreviewLoading(true);
    setError("");
    try {
      const result = await requestJson<{ context: GenerationContext }>(
        "/api/retrieval/context",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storyId,
            query: goal,
            activeCharacterIds,
            includeSecrets,
          }),
        },
      );
      setContextPreview(result.context);
      setMessage(
        "Context preview is ready. Nothing has been sent to the model.",
      );
    } catch (requestError) {
      setError(
        formatRequestError(
          requestError,
          "Could not preview generation context.",
        ),
      );
    } finally {
      setIsContextPreviewLoading(false);
    }
  }, [activeCharacterIds, goal, includeSecrets, storyId]);

  async function cancelGeneration(jobId: string) {
    try {
      await requestJson(`/api/generation/jobs/${jobId}/cancel`, {
        method: "POST",
      });
      setMessage("Cancellation requested.");
      await loadJobs(storyId);
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not cancel the job."));
    }
  }

  async function retryGeneration(jobId: string) {
    setIsLoading(true);
    setError("");
    try {
      const result = await requestJson<{ job: GenerationJob }>(
        `/api/generation/jobs/${jobId}/retry`,
        { method: "POST" },
      );
      setJobs((current) =>
        current.map((job) => (job.id === result.job.id ? result.job : job)),
      );
      setSelectedJobId(result.job.id);
      setMessage("Generation queued for another attempt.");
      void requestJson<{ job: GenerationJob }>(
        `/api/generation/jobs/${result.job.id}/run`,
        { method: "POST" },
      )
        .then(() => refreshCurrentWorkspace())
        .catch((runError: unknown) =>
          setError(formatRequestError(runError, "Generation retry failed.")),
        );
    } catch (requestError) {
      setError(formatRequestError(requestError, "Could not retry the job."));
    } finally {
      setIsLoading(false);
    }
  }

  const saveDraft = useCallback(
    async (draftVersionId: string, content: string) => {
      await requestJson(`/api/draft-versions/${draftVersionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (storyId) await loadJobs(storyId);
    },
    [loadJobs, storyId],
  );

  const acceptDraft = useCallback(
    async (draftVersionId: string) => {
      await requestJson(`/api/draft-versions/${draftVersionId}/accept`, {
        method: "POST",
      });
      setMessage("Draft accepted. Review its canon proposals next.");
      if (storyId) await loadJobs(storyId);
    },
    [loadJobs, storyId],
  );

  const reviewProposal = useCallback(
    async (proposal: CanonProposal, decision: "accept" | "reject") => {
      await requestJson(`/api/canon-proposals/${proposal.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setMessage(
        decision === "accept"
          ? "Canon proposal reviewed."
          : "Proposal dismissed.",
      );
      if (storyId) await loadJobs(storyId);
    },
    [loadJobs, storyId],
  );

  const body = activeView === "story" ? (
    <StoryLedger
      story={story}
      stories={stories}
      onSelectStory={(selectedStoryId) => {
        selectStory(selectedStoryId);
      }}
      onNewStory={() => setIsStoryModalOpen(true)}
      onReadStory={(selectedStory) => window.location.assign(`/library/story?story=${encodeURIComponent(selectedStory.id)}&view=detail`)}
      onAddChapter={(selectedStory) => {
        selectStory(selectedStory.id);
        setIsChapterModalOpen(true);
      }}
      onAddCharacter={(selectedStory) => {
        selectStory(selectedStory.id);
        openCreateCharacter();
      }}
      onDeleteStory={setStoryToDelete}
    />
  ) : isWorkspaceLoading ? (
    <WorkspaceSkeleton />
  ) : !story ? (
    <EmptyWorkspace onCreate={() => setIsStoryModalOpen(true)} />
  ) : activeView === "studio" ? (
    <div className="space-y-5">
      {!story.primaryProtagonistId ? (
        <p className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm leading-6 text-amber-100">
          No primary protagonist selected. The AI can continue, but Story-level narrative focus may be less consistent.
        </p>
      ) : null}
      <GenerationStudio
        form={{
          goal,
          chapterId,
          activeCharacterIds,
          maturityMode,
          includeSecrets,
        }}
        chapters={chapters}
        characters={story.characters}
        jobs={jobs}
        selectedJobId={selectedJobId}
        isSubmitting={isLoading}
        contextPreview={contextPreview}
        isContextPreviewLoading={isContextPreviewLoading}
        onFormChange={(patch) => {
          setContextPreview(null);
          if (patch.goal !== undefined) setGoal(patch.goal);
          if (patch.chapterId !== undefined) setChapterId(patch.chapterId);
          if (patch.activeCharacterIds !== undefined)
            setActiveCharacterIds(patch.activeCharacterIds);
          if (patch.maturityMode !== undefined)
            setMaturityMode(patch.maturityMode);
          if (patch.includeSecrets !== undefined)
            setIncludeSecrets(patch.includeSecrets);
        }}
        onGenerate={startGeneration}
        onPreviewContext={previewContext}
        onCloseContextPreview={() => setContextPreview(null)}
        onNavigate={setActiveView}
        onCancel={cancelGeneration}
        onRetry={retryGeneration}
        story={story}
        onReadStory={() => window.location.assign(`/library/story?story=${encodeURIComponent(story.id)}&view=detail`)}
        onAddChapter={() => setIsChapterModalOpen(true)}
        onAddCharacter={openCreateCharacter}
      />
      <DraftReview
        job={selectedJob}
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSaveDraft={saveDraft}
        onAcceptDraft={acceptDraft}
        onReviewProposal={reviewProposal}
        onSelectJob={setSelectedJobId}
      />
    </div>
  ) : activeView === "cast" ? (
    <div className="space-y-5">
      <CastLedger
        characters={story.characters}
        onAdd={openCreateCharacter}
        onAddFromLibrary={() => setIsTemplatePickerOpen(true)}
        onEdit={(character) => {
          setEditingCharacter(character as unknown as CharacterFormRecord);
          setEditingTemplate(null);
          setIsTemplateForm(false);
          setIsCharacterModalOpen(true);
        }}
        onDuplicate={(character) => void duplicateCharacter(character as unknown as CharacterFormRecord)}
        onSetPrimary={(character) => void setPrimaryProtagonist(character.id)}
        onClearPrimary={() => void setPrimaryProtagonist(null)}
        primaryProtagonistId={story.primaryProtagonistId}
      />
      <CharacterTemplateLibrary
        isLoading={isLoading}
        query={templateQuery}
        templates={templates}
        onQueryChange={setTemplateQuery}
        onEdit={openTemplateForm}
        onDelete={deleteTemplate}
      />
    </div>
  ) : (
    <CanonLedger issues={story.continuityIssues} view={activeView} />
  );

  return (
    <main className={studioStyles.workspace}>
      <div className="mx-auto flex min-h-screen max-w-[1760px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.08] bg-surface-dim/65 px-4 py-5 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/10">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-on-surface">
                Narrative Studio
              </h1>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-on-surface-variant">
                WRITING STUDIO
              </p>
            </div>
          </div>
          <div className="mt-9">
            <WorkspaceNavigation
              activeView={activeView}
              onChange={setActiveView}
              issueCount={story?.continuityIssues.length ?? 0}
              storySelected={Boolean(story)}
            />
          </div>
          <div className="mt-auto rounded-xl border border-white/[0.08] bg-white/[0.035] p-3">
            <p className="text-xs font-semibold text-on-surface">
              Drafts are provisional
            </p>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">
              Review canon proposals before they become part of the story.
            </p>
          </div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-background/90 backdrop-blur-xl">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.14em] text-on-surface-variant">
                  {activeView === "studio"
                    ? "DRAFTING"
                    : activeView === "story"
                      ? "LIBRARY"
                      : activeView.toUpperCase()}
                </p>
                <div className="min-w-0">
                  <select
                    aria-label="Select story"
                    className={`${selectStyles["studio-select"]} block w-[min(34rem,calc(100vw-10rem))] truncate bg-surface-dim/70 px-3 py-1.5 text-lg font-semibold tracking-tight`}
                    value={storyId}
                    onChange={(event) => selectStory(event.target.value)}
                  >
                    <option value="">Please select a story</option>
                    {stories.map((entry) => (
                      <option
                        className="bg-surface-dim"
                        key={entry.id}
                        value={entry.id}
                      >
                        {entry.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                type="button"
                onClick={() => setIsStoryModalOpen(true)}
              >
                <Plus className="size-4" /> New story
              </button>
            </div>
            <div className="border-t border-white/[0.07] px-3 lg:hidden">
              <WorkspaceNavigation
                activeView={activeView}
                onChange={setActiveView}
                issueCount={story?.continuityIssues.length ?? 0}
                storySelected={Boolean(story)}
              />
            </div>
          </header>
          <div aria-live="polite" className="sr-only">
            {error || message}
          </div>
          {(error || message) && (
            <div
              className={`${studioStyles["workspace__feedback"]} ${error ? studioStyles["workspace__feedback--error"] : ""}`}
            >
              {error || message}
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8">{body}</div>
        </section>
      </div>
      {isStoryModalOpen && (
        <Dialog
          title="Create a story workspace"
          onClose={() => setIsStoryModalOpen(false)}
        >
          <label className="block text-sm font-semibold text-on-surface">
            Title
            <input
              autoFocus
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-surface-dim px-3 text-on-surface outline-none focus:border-primary"
              value={newStoryTitle}
              onChange={(event) => setNewStoryTitle(event.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm font-semibold text-on-surface">
            One-sentence premise
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-surface-dim p-3 text-on-surface outline-none focus:border-primary"
              value={newStoryDescription}
              onChange={(event) => setNewStoryDescription(event.target.value)}
            />
          </label>
          <button
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
            disabled={isLoading || !newStoryTitle.trim()}
            type="button"
            onClick={createStory}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}{" "}
            Create workspace
          </button>
        </Dialog>
      )}
      {isChapterModalOpen && (
        <Dialog
          title="Add an outline chapter"
          onClose={() => setIsChapterModalOpen(false)}
        >
          <label className="block text-sm font-semibold text-on-surface">
            Chapter title
            <input
              autoFocus
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-surface-dim px-3 text-on-surface outline-none focus:border-primary"
              value={newChapterTitle}
              onChange={(event) => setNewChapterTitle(event.target.value)}
            />
          </label>
          <button
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
            disabled={isLoading || !newChapterTitle.trim()}
            type="button"
            onClick={createChapter}
          >
            <BookOpen className="size-4" /> Add chapter
          </button>
        </Dialog>
      )}
      {isCharacterModalOpen && (
        <ModalFrame
          label={isTemplateForm ? "Character Library" : "Character bible"}
          onClose={() => {
            setIsCharacterModalOpen(false);
            setEditingCharacter(null);
            setEditingTemplate(null);
            setIsTemplateForm(false);
          }}
          panelClassName="w-full max-w-6xl"
        >
          <CharacterForm
            character={isTemplateForm && editingTemplate ? templateFormRecord(editingTemplate) : editingCharacter}
            forceCreate={isTemplateForm}
            isSubmitting={isLoading}
            storyId={storyId || "template"}
            onCancel={() => {
              setIsCharacterModalOpen(false);
              setEditingCharacter(null);
              setEditingTemplate(null);
              setIsTemplateForm(false);
            }}
            onSubmit={saveCharacter}
          />
        </ModalFrame>
      )}
      {isTemplatePickerOpen && (
        <Dialog title="Add from Character Library" onClose={() => setIsTemplatePickerOpen(false)}>
          <p className="text-sm leading-6 text-on-surface-variant">Adding this character creates an independent copy for this story. Future changes will not sync automatically.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-on-surface">Search
              <input autoFocus className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-surface-dim px-3 text-on-surface outline-none focus:border-primary" value={templateQuery} onChange={(event) => setTemplateQuery(event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-on-surface">Story role
              <select className={`${selectStyles["studio-select"]} mt-2 h-10 w-full text-sm`} value={templateRole} onChange={(event) => setTemplateRole(event.target.value)}>
                <option value="SUPPORTING">Supporting</option><option value="PROTAGONIST">Protagonist</option><option value="ANTAGONIST">Antagonist</option><option value="BACKGROUND">Background</option>
              </select>
            </label>
          </div>
          <div className="mt-5 max-h-80 divide-y divide-white/[0.08] overflow-y-auto border-y border-white/[0.08]">
            {templates.map((template) => (
              <button key={template.id} className="block w-full px-1 py-4 text-left transition hover:bg-white/[0.04]" type="button" disabled={isLoading} onClick={() => void addTemplateToStory(template.id)}>
                <span className="block font-semibold text-on-surface">{template.name}</span>
                <span className="mt-1 block text-sm text-on-surface-variant">{typeof template.profile.personality === "object" && template.profile.personality && "summary" in template.profile.personality ? String((template.profile.personality as { summary?: unknown }).summary ?? "") : "Reusable character profile"}</span>
              </button>
            ))}
            {!templates.length ? <p className="px-1 py-5 text-sm text-on-surface-variant">No matching Library characters yet.</p> : null}
          </div>
        </Dialog>
      )}
      {storyToDelete && (
        <Dialog title="Delete this story?" onClose={() => setStoryToDelete(null)}>
          <p className="text-sm leading-6 text-on-surface-variant">
            This permanently deletes “{storyToDelete.title}”, including its chapters, characters, drafts, and canon records. This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="inline-flex h-10 rounded-xl px-4 text-sm font-semibold text-on-surface-variant transition hover:bg-white/[0.07] hover:text-on-surface" type="button" onClick={() => setStoryToDelete(null)}>Cancel</button>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50" disabled={isLoading} type="button" onClick={deleteStory}><X className="size-4" /> Delete story</button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

function EmptyWorkspace({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-on-primary">
          <Sparkles className="size-6" />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Start with a story, not a blank tool.
        </h1>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          Create a workspace for the characters, chapters, and canon that will
          give every generated scene a place to belong.
        </p>
        <button
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"
          type="button"
          onClick={onCreate}
        >
          <Plus className="size-4" /> Create your first story
        </button>
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading story workspace" className="animate-pulse space-y-5">
      <div className="border-b border-white/[0.08] pb-5">
        <div className="h-3 w-24 rounded bg-white/[0.08]" />
        <div className="mt-3 h-8 w-72 max-w-full rounded bg-white/[0.1]" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-white/[0.06]" />
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-surface-container-low p-5 sm:p-6">
        <div className="h-5 w-40 rounded bg-white/[0.1]" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-white/[0.06]" />
        <div className="mt-6 divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/[0.08]">
          {[0, 1, 2].map((index) => (
            <div className="flex items-center justify-between gap-4 px-4 py-4" key={index}>
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-white/[0.08]" />
                <span className="h-4 w-44 max-w-[40vw] rounded bg-white/[0.08]" />
              </div>
              <span className="h-3 w-24 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-surface-container-low p-5 sm:p-6">
        <div className="h-5 w-36 rounded bg-white/[0.1]" />
        <div className="mt-5 h-44 rounded-xl bg-white/[0.05]" />
      </div>
    </section>
  );
}
