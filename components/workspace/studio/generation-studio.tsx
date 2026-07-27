"use client";

import { AlertTriangle, BookOpen, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatRelativeDate, titleCase } from "./api";
import type { CharacterRecord, ChapterRecord, GenerationJob } from "./types";

type StudioForm = {
  goal: string;
  chapterId: string;
  activeCharacterIds: string[];
  maturityMode: "safe" | "mature";
  includeSecrets: boolean;
};

function jobTone(status: string) {
  if (status === "READY_FOR_REVIEW") return "text-emerald-200 bg-emerald-300/10 border-emerald-300/20";
  if (status === "FAILED" || status === "CANCELLED") return "text-rose-200 bg-rose-300/10 border-rose-300/20";
  return "text-violet-200 bg-violet-300/10 border-violet-300/20";
}

export function GenerationStudio({
  form,
  chapters,
  characters,
  jobs,
  selectedJobId,
  isSubmitting,
  onFormChange,
  onGenerate,
  onCancel,
  onSelectJob,
}: {
  form: StudioForm;
  chapters: ChapterRecord[];
  characters: CharacterRecord[];
  jobs: GenerationJob[];
  selectedJobId: string;
  isSubmitting: boolean;
  onFormChange: (patch: Partial<StudioForm>) => void;
  onGenerate: () => void;
  onCancel: (jobId: string) => void;
  onSelectJob: (jobId: string) => void;
}) {
  const activeJob = jobs.find((job) => job.id === selectedJobId);
  const isRunning = activeJob?.status === "RUNNING" || activeJob?.status === "QUEUED";

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-5">
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

          <div className="space-y-6 p-5 sm:p-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-on-surface">What must change in this scene?</span>
              <textarea
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
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-on-surface">Chapter anchor</span>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-surface-dim px-3 text-sm text-on-surface outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/15"
                  value={form.chapterId}
                  onChange={(event) => onFormChange({ chapterId: event.target.value })}
                >
                  <option value="">Unanchored draft</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.number}. {chapter.title}
                    </option>
                  ))}
                </select>
              </label>
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
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
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
              ) : null}
            </div>
            {activeJob.error ? <p className="mt-4 rounded-lg bg-rose-300/10 p-3 text-sm leading-6 text-rose-100">{activeJob.error}</p> : null}
          </section>
        ) : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">RUNS</p>
              <h2 className="mt-1 text-base font-semibold text-on-surface">Recent generation</h2>
            </div>
            <BookOpen className="size-4 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {jobs.slice(0, 7).map((job) => (
              <button
                key={job.id}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  job.id === selectedJobId
                    ? "border-primary/40 bg-primary/10"
                    : "border-white/10 bg-surface-dim/60 hover:border-white/25",
                )}
                type="button"
                onClick={() => onSelectJob(job.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-on-surface">{titleCase(job.stage)}</span>
                  {job.status === "READY_FOR_REVIEW" ? <CheckCircle2 className="size-4 text-emerald-200" /> : <RefreshCw className={cn("size-3.5 text-on-surface-variant", job.status === "RUNNING" && "animate-spin")} />}
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">{formatRelativeDate(job.createdAt)}</p>
              </button>
            ))}
            {!jobs.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-on-surface-variant">Your generation history will appear here.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">EDITORIAL GUARDRAIL</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Generated text is a draft. Memories, events, and changes to canon remain proposals until you approve them.
          </p>
        </section>
      </aside>
    </div>
  );
}
