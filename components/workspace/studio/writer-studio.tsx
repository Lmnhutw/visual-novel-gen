"use client";

import {
  BookOpen,
  ChevronDown,
  Loader2,
  Menu,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CharacterForm, type CharacterFormRecord } from "./character-form";
import type { GenerationContext } from "@/lib/retrieval/types";
import type {
  CreateCharacterInput,
  UpdateCharacterInput,
} from "@/lib/validators/character.schema";

import { requestJson } from "./api";
import { DraftReview } from "./draft-review";
import { GenerationStudio } from "./generation-studio";
import { CanonLedger, CastLedger, ChapterLedger, StoryLedger } from "./story-ledgers";
import type { CanonProposal, GenerationJob, StoryDetail, StorySummary, WorkspaceView } from "./types";
import { WorkspaceNavigation } from "./workspace-navigation";

const defaultGoal = "Write the next scene with a choice that shifts the relationship and creates a new consequence for the story.";

export function WriterStudio() {
  const [activeView, setActiveView] = useState<WorkspaceView>("studio");
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [storyId, setStoryId] = useState("");
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [chapters, setChapters] = useState<StoryDetail["chapters"]>([]);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [goal, setGoal] = useState(defaultGoal);
  const [chapterId, setChapterId] = useState("");
  const [activeCharacterIds, setActiveCharacterIds] = useState<string[]>([]);
  const [maturityMode, setMaturityMode] = useState<"safe" | "mature">("safe");
  const [includeSecrets, setIncludeSecrets] = useState(false);
  const [contextPreview, setContextPreview] = useState<GenerationContext | null>(null);
  const [isContextPreviewLoading, setIsContextPreviewLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Loading workspace…");
  const [error, setError] = useState("");
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState("");
  const [newStoryDescription, setNewStoryDescription] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");

  const loadStories = useCallback(async (preferredId?: string) => {
    const payload = await requestJson<{ stories: StorySummary[] }>("/api/stories");
    setStories(payload.stories);
    setStoryId((current) => preferredId ?? (current || payload.stories[0]?.id || ""));
  }, []);

  const loadJobs = useCallback(async (selectedStoryId: string) => {
    const payload = await requestJson<{ jobs: GenerationJob[] }>(
      `/api/generation/jobs?storyId=${encodeURIComponent(selectedStoryId)}`,
    );
    setJobs(payload.jobs);
    setSelectedJobId((current) => current && payload.jobs.some((job) => job.id === current) ? current : payload.jobs[0]?.id ?? "");
    return payload.jobs;
  }, []);

  const loadWorkspace = useCallback(async (selectedStoryId: string) => {
    const [storyPayload, chapterPayload] = await Promise.all([
      requestJson<{ story: StoryDetail }>(`/api/stories/${selectedStoryId}`),
      requestJson<{ chapters: StoryDetail["chapters"] }>(`/api/chapters?storyId=${encodeURIComponent(selectedStoryId)}`),
    ]);
    setStory(storyPayload.story);
    setChapters(chapterPayload.chapters);
    setChapterId((current) => current && chapterPayload.chapters.some((chapter) => chapter.id === current) ? current : chapterPayload.chapters[0]?.id ?? "");
    setActiveCharacterIds((current) => current.filter((id) => storyPayload.story.characters.some((character) => character.id === id)));
    await loadJobs(selectedStoryId);
  }, [loadJobs]);

  useEffect(() => {
    void loadStories().catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Could not load stories.");
      setMessage("");
    });
  }, [loadStories]);

  useEffect(() => {
    if (!storyId) {
      setStory(null);
      setChapters([]);
      setJobs([]);
      return;
    }
    setMessage("Preparing your writing desk…");
    setError("");
    void loadWorkspace(storyId)
      .then(() => setMessage("Workspace ready."))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Could not load the workspace.");
        setMessage("");
      });
  }, [loadWorkspace, storyId]);

  const runningJob = jobs.some((job) => job.status === "QUEUED" || job.status === "RUNNING");
  useEffect(() => {
    if (!storyId || !runningJob) return;
    const interval = window.setInterval(() => {
      void loadJobs(storyId).catch(() => undefined);
    }, 1800);
    return () => window.clearInterval(interval);
  }, [loadJobs, runningJob, storyId]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  async function refreshCurrentWorkspace() {
    if (!storyId) return;
    await Promise.all([loadStories(storyId), loadWorkspace(storyId)]);
  }

  async function createStory() {
    if (!newStoryTitle.trim()) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = await requestJson<{ story: StorySummary }>("/api/stories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newStoryTitle.trim(),
          description: newStoryDescription.trim() || undefined,
          genre: ["visual novel", "character drama"],
          tone: "Atmospheric, character-first, continuity-forward",
          pov: "Third person limited",
          tense: "Past",
          nsfwPolicy: { matureModeAllowed: true, requireAdultCharacters: true, requireConsentContinuity: true },
        }),
      });
      setNewStoryTitle("");
      setNewStoryDescription("");
      setIsStoryModalOpen(false);
      setMessage("Story workspace created.");
      await loadStories(payload.story.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create story.");
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
        body: JSON.stringify({ storyId, number: chapters.length + 1, title: newChapterTitle.trim(), status: "OUTLINE" }),
      });
      setNewChapterTitle("");
      setIsChapterModalOpen(false);
      setMessage("Chapter added to the manuscript spine.");
      await refreshCurrentWorkspace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create chapter.");
    } finally { setIsLoading(false); }
  }

  async function saveCharacter(payload: CreateCharacterInput | UpdateCharacterInput, mode: "create" | "edit") {
    if (!storyId) return;
    void mode;
    setIsLoading(true);
    try {
      await requestJson("/api/characters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setIsCharacterModalOpen(false);
      setMessage("Character canon created.");
      await refreshCurrentWorkspace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save character.");
      throw requestError;
    } finally { setIsLoading(false); }
  }

  async function startGeneration() {
    if (!storyId || goal.trim().length < 10) return;
    setIsLoading(true);
    setError("");
    try {
      const idempotencyKey = `${storyId}:${chapterId}:${Date.now()}`;
      const result = await requestJson<{ job: GenerationJob }>("/api/generation/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storyId, chapterId: chapterId || undefined, goal, sceneGoal: goal, activeCharacterIds, maturityMode, includeSecrets, idempotencyKey, type: "scene" }),
      });
      setJobs((current) => [result.job, ...current.filter((job) => job.id !== result.job.id)]);
      setSelectedJobId(result.job.id);
      setMessage("Generation job queued. You can keep working while it runs.");
      void requestJson<{ job: GenerationJob }>(`/api/generation/jobs/${result.job.id}/run`, { method: "POST" })
        .then(() => refreshCurrentWorkspace())
        .catch((runError: unknown) => setError(runError instanceof Error ? runError.message : "Generation failed."));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start generation.");
    } finally { setIsLoading(false); }
  }

  const previewContext = useCallback(async () => {
    if (!storyId || goal.trim().length < 10) return;

    setIsContextPreviewLoading(true);
    setError("");
    try {
      const result = await requestJson<{ context: GenerationContext }>("/api/retrieval/context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storyId,
          query: goal,
          activeCharacterIds,
          includeSecrets,
        }),
      });
      setContextPreview(result.context);
      setMessage("Context preview is ready. Nothing has been sent to the model.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not preview generation context.");
    } finally {
      setIsContextPreviewLoading(false);
    }
  }, [activeCharacterIds, goal, includeSecrets, storyId]);

  async function cancelGeneration(jobId: string) {
    try {
      await requestJson(`/api/generation/jobs/${jobId}/cancel`, { method: "POST" });
      setMessage("Cancellation requested.");
      await loadJobs(storyId);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not cancel the job."); }
  }

  const saveDraft = useCallback(async (draftVersionId: string, content: string) => {
    await requestJson(`/api/draft-versions/${draftVersionId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
    if (storyId) await loadJobs(storyId);
  }, [loadJobs, storyId]);

  const acceptDraft = useCallback(async (draftVersionId: string) => {
    await requestJson(`/api/draft-versions/${draftVersionId}/accept`, { method: "POST" });
    setMessage("Draft accepted. Review its canon proposals next.");
    if (storyId) await loadJobs(storyId);
  }, [loadJobs, storyId]);

  const reviewProposal = useCallback(async (proposal: CanonProposal, decision: "accept" | "reject") => {
    await requestJson(`/api/canon-proposals/${proposal.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision }) });
    setMessage(decision === "accept" ? "Canon proposal reviewed." : "Proposal dismissed.");
    if (storyId) await loadJobs(storyId);
  }, [loadJobs, storyId]);

  const body = !story ? <EmptyWorkspace onCreate={() => setIsStoryModalOpen(true)} /> : activeView === "studio" ? <div className="space-y-5"><GenerationStudio form={{ goal, chapterId, activeCharacterIds, maturityMode, includeSecrets }} chapters={chapters} characters={story.characters} jobs={jobs} selectedJobId={selectedJobId} isSubmitting={isLoading} contextPreview={contextPreview} isContextPreviewLoading={isContextPreviewLoading} onFormChange={(patch) => { setContextPreview(null); if (patch.goal !== undefined) setGoal(patch.goal); if (patch.chapterId !== undefined) setChapterId(patch.chapterId); if (patch.activeCharacterIds !== undefined) setActiveCharacterIds(patch.activeCharacterIds); if (patch.maturityMode !== undefined) setMaturityMode(patch.maturityMode); if (patch.includeSecrets !== undefined) setIncludeSecrets(patch.includeSecrets); }} onGenerate={startGeneration} onPreviewContext={previewContext} onCloseContextPreview={() => setContextPreview(null)} onNavigate={setActiveView} onCancel={cancelGeneration} onSelectJob={setSelectedJobId} /><DraftReview job={selectedJob} onSaveDraft={saveDraft} onAcceptDraft={acceptDraft} onReviewProposal={reviewProposal} /></div> : activeView === "story" ? <StoryLedger story={story} stories={stories} onSelectStory={setStoryId} onNewStory={() => setIsStoryModalOpen(true)} /> : activeView === "cast" ? <CastLedger characters={story.characters} onAdd={() => setIsCharacterModalOpen(true)} /> : activeView === "chapters" ? <ChapterLedger chapters={chapters} onAdd={() => setIsChapterModalOpen(true)} /> : <CanonLedger issues={story.continuityIssues} view={activeView} />;

  return (
    <main className="min-h-screen bg-background text-on-surface">
      <div className="mx-auto flex min-h-screen max-w-[1760px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.08] bg-surface-dim/65 px-4 py-5 lg:flex">
          <div className="flex items-center gap-3 px-2"><span className="grid size-9 place-items-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/10"><Sparkles className="size-4" /></span><div><h1 className="text-lg font-semibold tracking-tight text-on-surface">Inkwell</h1><p className="text-[11px] font-semibold tracking-[0.14em] text-on-surface-variant">WRITING STUDIO</p></div></div>
          <div className="mt-9"><WorkspaceNavigation activeView={activeView} onChange={setActiveView} issueCount={story?.continuityIssues.length ?? 0} /></div>
          <div className="mt-auto rounded-xl border border-white/[0.08] bg-white/[0.035] p-3"><p className="text-xs font-semibold text-on-surface">Drafts are provisional</p><p className="mt-1 text-xs leading-5 text-on-surface-variant">Review canon proposals before they become part of the story.</p></div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-background/90 backdrop-blur-xl">
            <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><Menu className="size-5 lg:hidden" /><div className="min-w-0"><p className="text-xs font-semibold tracking-[0.14em] text-on-surface-variant">{activeView === "studio" ? "DRAFTING" : activeView.toUpperCase()}</p><div className="flex items-center gap-1"><select aria-label="Select story" className="max-w-[15rem] truncate bg-transparent text-lg font-semibold tracking-tight text-on-surface outline-none" value={storyId} onChange={(event) => setStoryId(event.target.value)}>{stories.map((entry) => <option className="bg-surface-dim" key={entry.id} value={entry.id}>{entry.title}</option>)}</select><ChevronDown className="size-4 text-on-surface-variant" /></div></div></div><button className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-semibold text-on-surface-variant transition hover:border-white/25 hover:text-on-surface" type="button" onClick={() => setIsStoryModalOpen(true)}><Plus className="size-4" /> New story</button></div>
            <div className="border-t border-white/[0.07] px-3 lg:hidden"><WorkspaceNavigation activeView={activeView} onChange={setActiveView} issueCount={story?.continuityIssues.length ?? 0} /></div>
          </header>
          <div aria-live="polite" className="sr-only">{error || message}</div>
          {(error || message) && <div className={`mx-4 mt-4 rounded-xl border px-4 py-3 text-sm sm:mx-6 lg:mx-8 ${error ? "border-rose-300/20 bg-rose-300/[0.08] text-rose-100" : "border-white/[0.08] bg-white/[0.035] text-on-surface-variant"}`}>{error || message}</div>}
          <div className="p-4 sm:p-6 lg:p-8">{body}</div>
        </section>
      </div>
      {isStoryModalOpen && <Dialog title="Create a story workspace" onClose={() => setIsStoryModalOpen(false)}><label className="block text-sm font-semibold text-on-surface">Title<input autoFocus className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-surface-dim px-3 text-on-surface outline-none focus:border-primary" value={newStoryTitle} onChange={(event) => setNewStoryTitle(event.target.value)} /></label><label className="mt-4 block text-sm font-semibold text-on-surface">One-sentence premise<textarea className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-surface-dim p-3 text-on-surface outline-none focus:border-primary" value={newStoryDescription} onChange={(event) => setNewStoryDescription(event.target.value)} /></label><button className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50" disabled={isLoading || !newStoryTitle.trim()} type="button" onClick={createStory}>{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create workspace</button></Dialog>}
      {isChapterModalOpen && <Dialog title="Add an outline chapter" onClose={() => setIsChapterModalOpen(false)}><label className="block text-sm font-semibold text-on-surface">Chapter title<input autoFocus className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-surface-dim px-3 text-on-surface outline-none focus:border-primary" value={newChapterTitle} onChange={(event) => setNewChapterTitle(event.target.value)} /></label><button className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50" disabled={isLoading || !newChapterTitle.trim()} type="button" onClick={createChapter}><BookOpen className="size-4" /> Add chapter</button></Dialog>}
      {isCharacterModalOpen && <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center"><CharacterForm character={null as CharacterFormRecord | null} isSubmitting={isLoading} storyId={storyId} onCancel={() => setIsCharacterModalOpen(false)} onSubmit={saveCharacter} /></div>}
    </main>
  );
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center" role="presentation"><section aria-modal="true" role="dialog" className="w-full max-w-lg rounded-2xl border border-white/10 bg-surface-container-low p-5 shadow-2xl"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-on-surface">{title}</h2><button aria-label="Close dialog" className="grid size-9 place-items-center rounded-lg text-on-surface-variant hover:bg-white/[0.07]" type="button" onClick={onClose}><X className="size-4" /></button></div><div className="mt-5">{children}</div></section></div>; }
function EmptyWorkspace({ onCreate }: { onCreate: () => void }) { return <div className="grid min-h-screen place-items-center p-6"><div className="max-w-md text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-on-primary"><Sparkles className="size-6" /></span><h1 className="mt-6 text-3xl font-semibold tracking-tight">Start with a story, not a blank tool.</h1><p className="mt-3 text-sm leading-7 text-on-surface-variant">Create a workspace for the characters, chapters, and canon that will give every generated scene a place to belong.</p><button className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary" type="button" onClick={onCreate}><Plus className="size-4" /> Create your first story</button></div></div>; }
