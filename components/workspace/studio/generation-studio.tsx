"use client";

import { AlertTriangle, BookOpen, CheckCircle2, Eye, Loader2, Plus, RefreshCw, ShieldCheck, Sparkles, UserPlus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GenerationContext } from "@/lib/retrieval/types";
import { isRetryableGenerationStatus } from "@/lib/generation/job-state";

import { formatRelativeDate, titleCase } from "./api";
import type { CharacterRecord, ChapterRecord, GenerationJob, StoryDetail, WorkspaceView } from "./types";

type StudioForm = {
  goal: string;
  chapterId: string;
  activeCharacterIds: string[];
  maturityMode: "safe" | "mature";
  includeSecrets: boolean;
};

function jobTone(status: string) {
  if (status === "READY_FOR_REVIEW") return "text-emerald-200 bg-emerald-300/10 border-emerald-300/20";
  if (status === "FAILED") return "text-rose-200 bg-rose-300/10 border-rose-300/20";
  if (status === "CANCELLED") return "text-amber-100 bg-amber-300/10 border-amber-300/20";
  return "text-violet-200 bg-violet-300/10 border-violet-300/20";
}

function formatRunDuration(job: GenerationJob) {
  if (!job.startedAt) return null;
  const startedAt = new Date(job.startedAt).getTime();
  const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
  if (!Number.isFinite(startedAt) || !Number.isFinite(end)) return null;
  const seconds = Math.max(
    0,
    Math.round((end - startedAt) / 1000),
  );
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function GenerationStudio({
  form,
  chapters,
  characters,
  jobs,
  selectedJobId,
  isSubmitting,
  contextPreview,
  isContextPreviewLoading,
  onFormChange,
  onGenerate,
  onPreviewContext,
  onCloseContextPreview,
  onNavigate,
  onCancel,
  onRetry,
  story,
  onReadStory,
  onAddChapter,
  onAddCharacter,
}: {
  form: StudioForm;
  chapters: ChapterRecord[];
  characters: CharacterRecord[];
  jobs: GenerationJob[];
  selectedJobId: string;
  isSubmitting: boolean;
  contextPreview: GenerationContext | null;
  isContextPreviewLoading: boolean;
  onFormChange: (patch: Partial<StudioForm>) => void;
  onGenerate: () => void;
  onPreviewContext: () => void;
  onCloseContextPreview: () => void;
  onNavigate: (view: WorkspaceView) => void;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  story: StoryDetail;
  onReadStory: () => void;
  onAddChapter: () => void;
  onAddCharacter: () => void;
}) {
  const activeJob = jobs.find((job) => job.id === selectedJobId);
  const isRunning =
    activeJob?.status === "RUNNING" ||
    activeJob?.status === "QUEUED" ||
    activeJob?.status === "RETRYING";
  const isRetryable = activeJob ? isRetryableGenerationStatus(activeJob.status) : false;
  const activeRunDuration = activeJob ? formatRunDuration(activeJob) : null;
  const readiness = [
    { label: "Story workspace", detail: "A story is selected.", complete: true, action: "story" as const, actionLabel: "View story" },
    { label: "Cast", detail: "Add at least one character to ground the scene.", complete: characters.length > 0, action: "cast" as const, actionLabel: "Add character" },
    { label: "Chapter", detail: "Add an outline chapter to anchor the draft.", complete: chapters.length > 0, action: "chapter" as const, actionLabel: "Add chapter" },
    { label: "Scene brief", detail: "Describe a change or consequence in at least 10 characters.", complete: form.goal.trim().length >= 10, action: "studio" as const, actionLabel: "Write brief" },
  ];
  const incompleteReadiness = readiness.filter((item) => !item.complete);

  return (
    <div className="min-w-0 space-y-5">
        <section className="border-b border-white/[0.08] pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary/80">CURRENT STORY</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-on-surface">{story.title}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{story.description ?? "Build the next scene from this story’s canon."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={onReadStory}><BookOpen className="size-4" /> Read</button>
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-on-surface-variant transition hover:border-white/25 hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={onAddCharacter}><UserPlus className="size-4" /> Character</button>
            </div>
          </div>
        </section>
        {incompleteReadiness.length ? (
          <section className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-primary">FIRST SCENE</p>
                <h2 className="mt-1 text-lg font-semibold text-on-surface">Get the essentials in place</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">Complete only what is missing, then return here to preview the context before generating.</p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{readiness.length - incompleteReadiness.length}/{readiness.length} ready</span>
            </div>
            <ol className="mt-5 grid gap-2 sm:grid-cols-2">
              {readiness.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-surface-dim/60 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">{item.complete ? "Ready" : item.detail}</p>
                  </div>
                  {!item.complete ? <button className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={() => item.action === "studio" ? document.getElementById("scene-brief")?.focus() : item.action === "chapter" ? onAddChapter() : onNavigate(item.action)}>{item.actionLabel}</button> : <CheckCircle2 aria-label="Complete" className="size-4 shrink-0 text-emerald-200" />}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-5 shadow-[0_24px_64px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary/80">MANUSCRIPT</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-on-surface">Chapters in this story</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">Keep the manuscript spine attached to “{story.title}”. Select a chapter to anchor the next scene.</p>
            </div>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-on-surface-variant transition hover:border-white/25 hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={onAddChapter}><Plus className="size-4" /> Add chapter</button>
          </div>
          {chapters.length ? (
            <div className="mt-5 divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/[0.08] bg-surface-dim/45">
              {chapters.map((chapter) => {
                const selected = form.chapterId === chapter.id;
                return (
                  <button
                    key={chapter.id}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary",
                      selected ? "bg-primary/[0.12]" : "hover:bg-white/[0.04]",
                    )}
                    type="button"
                    onClick={() => onFormChange({ chapterId: chapter.id })}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">{String(chapter.number).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-on-surface">{chapter.title}</span>
                        <span className="mt-0.5 block text-xs text-on-surface-variant">{titleCase(chapter.status)}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-on-surface-variant">{chapter._count?.scenes ?? 0} scenes · {chapter._count?.events ?? 0} events</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-surface-dim/35 px-4 py-5">
              <p className="text-sm font-semibold text-on-surface">No chapters in this story yet.</p>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">Add the first outline chapter before generating a scene.</p>
              <button className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={onAddChapter}><Plus className="size-3.5" /> Add first chapter</button>
            </div>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-container-low shadow-[0_24px_64px_rgba(0,0,0,0.22)]">
          <div className="border-b border-white/10 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-primary/80">SCENE BRIEF</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-on-surface">Direct the next beat</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                  Give the draft a consequence, a shift, and a point of view. Context stays inspectable before it reaches the model.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-on-surface-variant transition hover:border-white/25 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  disabled={isContextPreviewLoading || form.goal.trim().length < 10}
                  type="button"
                  onClick={onPreviewContext}
                >
                  {isContextPreviewLoading ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  Review context
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  disabled={isSubmitting || form.goal.trim().length < 10}
                  type="button"
                  onClick={onGenerate}
                >
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Start generation
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-on-surface">What must change in this scene?</span>
              <textarea
                id="scene-brief"
                className="min-h-44 w-full resize-y rounded-xl border border-white/10 bg-surface-dim/80 px-4 py-3 text-[15px] leading-7 text-on-surface outline-none transition placeholder:text-on-surface-variant/55 focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
                placeholder="Example: They are forced to cooperate in public, but the old betrayal becomes impossible to ignore. End with a choice that changes the balance between them."
                value={form.goal}
                onChange={(event) => onFormChange({ goal: event.target.value })}
              />
              <span className="mt-2 block text-xs text-on-surface-variant">
                {form.goal.trim().split(/\s+/).filter(Boolean).length} words · scene briefs are saved with the generation run.
              </span>
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <span className="mb-2 block text-sm font-semibold text-on-surface">Safety and knowledge scope</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["safe", "mature"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        form.maturityMode === mode
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-white/10 bg-surface-dim text-on-surface-variant hover:border-white/25 hover:text-on-surface",
                      )}
                      type="button"
                      onClick={() => onFormChange({ maturityMode: mode })}
                    >
                      {mode === "safe" ? "Safe" : "Mature"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-surface-dim/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-on-surface">Cast in this scene</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Only selected characters are checked for mature-mode eligibility.</p>
                </div>
                <button
                  aria-pressed={form.includeSecrets}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                    form.includeSecrets
                      ? "bg-amber-300/15 text-amber-200"
                      : "bg-white/[0.06] text-on-surface-variant hover:text-on-surface",
                  )}
                  type="button"
                  onClick={() => onFormChange({ includeSecrets: !form.includeSecrets })}
                >
                  <ShieldCheck className="size-3.5" />
                  {form.includeSecrets ? "Secrets included" : "Public canon only"}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {characters.map((character) => {
                  const selected = form.activeCharacterIds.includes(character.id);
                  return (
                    <button
                      key={character.id}
                      aria-pressed={selected}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        selected
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-white/10 bg-surface text-on-surface-variant hover:border-white/25 hover:text-on-surface",
                      )}
                      type="button"
                      onClick={() => {
                        const activeCharacterIds = selected
                          ? form.activeCharacterIds.filter((id) => id !== character.id)
                          : [...form.activeCharacterIds, character.id];
                        onFormChange({ activeCharacterIds });
                      }}
                    >
                      <span className="grid size-5 place-items-center rounded-full bg-white/10 text-[10px] font-bold">
                        {character.name.slice(0, 1).toUpperCase()}
                      </span>
                      {character.name}
                      {character.ageConfirmed ? null : <AlertTriangle className="size-3 text-amber-200" />}
                    </button>
                  );
                })}
                {!characters.length ? <p className="text-sm text-on-surface-variant">Add a character before anchoring a scene.</p> : null}
              </div>
            </div>
            {contextPreview ? <ContextPreview context={contextPreview} includeSecrets={form.includeSecrets} onClose={onCloseContextPreview} /> : null}
          </div>
        </section>

        {activeJob ? (
          <section className="rounded-2xl border border-white/10 bg-surface-container-low p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-primary/80">LIVE RUN</p>
                <h2 className="mt-1 text-lg font-semibold text-on-surface">{titleCase(activeJob.stage)}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Started {formatRelativeDate(activeJob.startedAt ?? activeJob.createdAt)}</p>
              </div>
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", jobTone(activeJob.status))}>
                {titleCase(activeJob.status)}
              </span>
            </div>
            <div
              aria-label="Generation progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={activeJob.progress}
              className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.07]"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(activeJob.progress, isRunning ? 8 : 0)}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
              <span>{activeJob.progress}% complete</span>
              {isRunning ? (
                <button
                  className="inline-flex items-center gap-1.5 text-rose-200 transition hover:text-rose-100"
                  type="button"
                  onClick={() => onCancel(activeJob.id)}
                >
                  <X className="size-3.5" /> Cancel job
                </button>
              ) : isRetryable ? (
                <button
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-amber-100 transition hover:bg-amber-300/10 hover:text-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  type="button"
                  onClick={() => onRetry(activeJob.id)}
                >
                  <RefreshCw className="size-3.5" /> Retry job
                </button>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.08] pt-4 text-xs text-on-surface-variant">
              {activeRunDuration ? <span>Elapsed: <strong className="text-on-surface">{activeRunDuration}</strong></span> : null}
              {activeJob.generationRun?.totalTokens ? <span>Total tokens: <strong className="text-on-surface">{activeJob.generationRun.totalTokens.toLocaleString()}</strong></span> : null}
              {activeJob.generationRun?.model ? <span className="min-w-0 truncate">Model: <strong className="text-on-surface">{activeJob.generationRun.model}</strong></span> : null}
            </div>
            {activeJob.error ? <p className="mt-4 rounded-lg bg-rose-300/10 p-3 text-sm leading-6 text-rose-100">{activeJob.error}</p> : null}
          </section>
        ) : null}
    </div>
  );
}

function ContextPreview({ context, includeSecrets, onClose }: { context: GenerationContext; includeSecrets: boolean; onClose: () => void }) {
  const memories = context.memories.slice(0, 4);
  const omittedCount = context.budget
    ? Object.values(context.budget.omitted).reduce((sum, value) => sum + value, 0)
    : 0;

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4" aria-labelledby="context-preview-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-primary">CONTEXT TO SEND</p>
          <h3 id="context-preview-title" className="mt-1 text-base font-semibold text-on-surface">Review what will ground this draft</h3>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">This is a preview only; it has not been sent to the model.</p>
        </div>
        <button className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface-variant transition hover:bg-white/[0.06] hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={onClose}>Close preview</button>
      </div>
      {context.budget ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-y border-white/[0.08] py-3 text-xs text-on-surface-variant">
          <span className={context.budget.overBudget ? "text-amber-200" : undefined}>
            Estimated context: <strong className="text-on-surface">{context.budget.estimatedTokens.toLocaleString()} / {context.budget.maxTokens.toLocaleString()} tokens</strong>
          </span>
          <span>{context.budget.overBudget ? "Selected character canon exceeds the target budget" : omittedCount ? `${omittedCount} lower-priority records omitted` : "All retrieved records fit"}</span>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ContextList title={`Characters (${context.characters.length})`} items={context.characters.map((character) => `${character.name} · ${character.status}`)} empty="No character profiles were retrieved." />
        <ContextList title={`Memories (${context.memories.length})`} items={memories.map((memory) => memory.summary ?? memory.content)} empty="No ranked memories were retrieved." />
        <ContextList title={`Plot threads (${context.plotThreads.length})`} items={context.plotThreads.slice(0, 4).map((thread) => thread.title)} empty="No active plot threads were retrieved." />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{context.relationships.length} relationships</span>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{context.recentEvents.length} recent events</span>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1">{includeSecrets ? `${context.secrets.length} secrets included` : "Public canon only"}</span>
      </div>
    </section>
  );
}

function ContextList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div className="rounded-lg border border-white/[0.08] bg-surface-dim/60 p-3"><p className="text-xs font-semibold text-on-surface">{title}</p>{items.length ? <ul className="mt-2 space-y-1.5 text-xs leading-5 text-on-surface-variant">{items.map((item, index) => <li className="line-clamp-2" key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="mt-2 text-xs leading-5 text-on-surface-variant">{empty}</p>}</div>;
}
