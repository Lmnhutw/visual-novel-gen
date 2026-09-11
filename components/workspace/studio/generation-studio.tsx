"use client";

import { Check, CheckCircle2, Eye, Loader2, Plus, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import type { GenerationContext } from "@/lib/retrieval/types";

import type { CharacterRecord, ChapterRecord, GenerationJob, StoryDetail, WorkspaceView } from "./types";

type StudioForm = {
  goal: string;
  chapterId: string;
  activeCharacterIds: string[];
  maturityMode: "safe" | "mature";
  includeSecrets: boolean;
  chapterMode?: "auto" | "normal" | "closing";
};

export function GenerationStudio({
  form, chapters, characters, jobs, selectedJobId, isSubmitting, contextPreview, isContextPreviewLoading,
  onFormChange, onGenerate, onPreviewContext, onCloseContextPreview, onCancel, onRetry, onFallback, onEndChapter,
}: {
  form: StudioForm; chapters: ChapterRecord[]; characters: CharacterRecord[]; jobs: GenerationJob[]; selectedJobId: string;
  isSubmitting: boolean; contextPreview: GenerationContext | null; isContextPreviewLoading: boolean;
  onFormChange: (patch: Partial<StudioForm>) => void; onGenerate: () => void; onPreviewContext: () => void;
  onCloseContextPreview: () => void; story?: StoryDetail; onRetry?: (jobId: string) => void; onFallback?: (jobId: string, decision: "approve" | "decline") => void; onEndChapter?: (chapterId: string) => Promise<void>; onNavigate?: (view: WorkspaceView) => void; onCancel?: (jobId: string) => void; onReadStory?: () => void; onAddChapter?: () => void; onAddCharacter?: () => void;
}) {
  const [isCharacterPickerOpen, setIsCharacterPickerOpen] = useState(false);
  const [characterQuery, setCharacterQuery] = useState("");
  const activeJob = jobs.find((job) => job.id === selectedJobId);
  const activeGenerationJob = jobs.find(
    (job) =>
      job.status === "RUNNING" ||
      job.status === "QUEUED" ||
      job.status === "RETRYING",
  );
  const generationProgress = Math.min(
    100,
    Math.max(0, activeGenerationJob?.progress ?? 0),
  );
  const activeChapter = chapters.find((chapter) => chapter.id === form.chapterId) ?? null;
  const selectedCharacters = characters.filter((character) => form.activeCharacterIds.includes(character.id));
  const matchingCharacters = useMemo(() => characters.filter((character) => character.name.toLowerCase().includes(characterQuery.trim().toLowerCase())), [characterQuery, characters]);
  const hardLimitReached = activeChapter?.progress?.remainingToHardLimit === 0;
  const proposedFacts = activeJob?.proposals?.filter((proposal) => proposal.status === "PENDING") ?? [];

  function toggleCharacter(characterId: string) {
    const isSelected = form.activeCharacterIds.includes(characterId);
    onFormChange({ activeCharacterIds: isSelected ? form.activeCharacterIds.filter((id) => id !== characterId) : [...form.activeCharacterIds, characterId] });
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-xl border border-white/10 bg-surface-container-low p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-semibold tracking-tight text-on-surface">Write the next scene</h1><p className="mt-1 text-sm leading-6 text-on-surface-variant">Describe what you want to happen next. Mention events, characters, conflicts, or anything the AI should include.</p></div><button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-on-surface-variant transition hover:border-white/25 hover:text-on-surface disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" disabled={isContextPreviewLoading || form.goal.trim().length < 10} type="button" onClick={onPreviewContext}>{isContextPreviewLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} What will AI know?</button></div>
          <label className="mt-4 block"><span className="sr-only">What should happen next?</span><textarea id="scene-brief" className="min-h-40 w-full rounded-lg border border-white/10 bg-surface-dim/80 px-3.5 py-3 text-sm leading-7 text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="e.g. Alex discovers his father's advisor has been secretly communicating with the enemy. He confronts the advisor at night in the castle library…" value={form.goal} onChange={(event) => onFormChange({ goal: event.target.value })} /><span className="mt-1.5 block text-right text-xs text-on-surface-variant">{form.goal.length.toLocaleString()} / 1,000</span></label>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_11rem_11rem] lg:items-end">
            <div className="relative min-w-0"><p className="mb-2 text-xs font-semibold text-on-surface">Characters</p><div className="flex flex-wrap items-center gap-2">{selectedCharacters.map((character) => <button key={character.id} className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/15 px-2.5 text-xs font-medium text-primary transition hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={() => toggleCharacter(character.id)}><span className="truncate">{character.name}</span><X className="size-3 shrink-0" aria-label={`Remove ${character.name}`} /></button>)}<button aria-expanded={isCharacterPickerOpen} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-semibold text-on-surface-variant transition hover:border-white/25 hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button" onClick={() => setIsCharacterPickerOpen((open) => !open)}><Plus className="size-3.5" /> Add character</button></div>
              {isCharacterPickerOpen ? <div className="absolute z-20 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-white/10 bg-surface-container p-3 shadow-lg shadow-black/30"><label className="block text-xs font-semibold text-on-surface">Select characters<input autoFocus className="mt-2 h-9 w-full rounded-lg border border-white/10 bg-surface-dim px-3 text-sm text-on-surface outline-none focus:border-primary" placeholder="Search characters…" value={characterQuery} onChange={(event) => setCharacterQuery(event.target.value)} /></label><div className="mt-2 max-h-52 overflow-y-auto">{matchingCharacters.map((character) => { const selected = form.activeCharacterIds.includes(character.id); return <button aria-pressed={selected} className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", selected && "bg-primary/10 text-primary")} key={character.id} type="button" onClick={() => toggleCharacter(character.id)}><span className="truncate">{character.name}</span>{selected ? <Check className="size-4 shrink-0" /> : null}</button>; })}{!matchingCharacters.length ? <p className="px-3 py-4 text-sm text-on-surface-variant">No characters found.</p> : null}</div><button className="mt-2 text-xs font-semibold text-primary hover:text-primary/80" type="button" onClick={() => setIsCharacterPickerOpen(false)}>Done</button></div> : null}
            </div>
            <div className="min-w-0 text-xs font-semibold text-on-surface">Content
              <div className="mt-2">
                <SelectMenu
                  ariaLabel="Select content rating"
                  className="h-10"
                  options={[{ label: "Standard (Safe)", value: "safe" }, { label: "Mature", value: "mature" }]}
                  placeholder="Select content rating"
                  showPlaceholderOption={false}
                  value={form.maturityMode}
                  onChange={(maturityMode) => onFormChange({ maturityMode: maturityMode as StudioForm["maturityMode"] })}
                />
              </div>
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" disabled={isSubmitting || hardLimitReached || form.goal.trim().length < 10} type="button" onClick={onGenerate}>{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{hardLimitReached ? "Hard limit reached" : "Generate scene"}</button>
          </div>
          {contextPreview ? <ContextPreview context={contextPreview} includeSecrets={form.includeSecrets} onClose={onCloseContextPreview} /> : null}
          {hardLimitReached && activeChapter ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2.5 text-sm text-amber-100" role="alert"><span>Chapter hard limit reached. End this chapter before generating more prose.</span><button className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary" type="button" onClick={() => void onEndChapter?.(activeChapter.id)}>End chapter now</button></div> : null}
        </section>
        <aside className="space-y-4"><section className="rounded-xl border border-white/10 bg-surface-container-low p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-on-surface">New story facts</h2><span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{proposedFacts.length}</span></div><p className="mt-1 text-xs leading-5 text-on-surface-variant">Facts introduced by this scene that may become part of your story.</p>{proposedFacts.length ? <ul className="mt-3 space-y-2 text-xs text-on-surface-variant">{proposedFacts.slice(0, 3).map((fact) => <li className="rounded-lg bg-surface-dim p-2" key={fact.id}>{fact.title}</li>)}</ul> : <p className="mt-4 rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs leading-5 text-on-surface-variant">Generate a scene to see potential story facts here.</p>}</section><section className="rounded-xl border border-white/10 bg-surface-container-low p-4"><h2 className="text-sm font-semibold text-on-surface">Scene context</h2><ul className="mt-3 space-y-2 text-xs leading-5 text-on-surface-variant"><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-200" />{activeChapter ? `Chapter ${String(activeChapter.number).padStart(2, "0")}: ${activeChapter.title}` : "Choose a chapter"}</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-200" />Selected characters ({selectedCharacters.length})</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-200" />Approved canon facts</li><li className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />Story writing rules</li></ul></section></aside>
      </div>
      {activeGenerationJob ? (
        <section className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-on-surface">Generating scene</p>
              <p className="mt-1 text-xs text-on-surface-variant">{generationProgress}% complete</p>
            </div>
            <Loader2 className="size-4 animate-spin text-primary" />
          </div>
          <div
            aria-label="Generation progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={generationProgress}
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          <button
            className="mt-3 text-xs font-semibold text-rose-200 hover:text-rose-100"
            type="button"
            onClick={() => onCancel?.(activeGenerationJob.id)}
          >
            Cancel generation
          </button>
        </section>
      ) : null}
      {activeJob?.status === "AWAITING_FALLBACK_CONFIRMATION" ? <section className="rounded-xl border border-amber-300/25 bg-amber-300/[0.08] p-4"><p className="text-sm font-semibold text-amber-50">Generation is paused</p><p className="mt-1 text-xs leading-5 text-amber-100">Continue with {activeJob.fallbackModel ?? "the fallback model"} may consume credits. No paid request is sent without confirmation.</p><div className="mt-3 flex gap-2"><button className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary" type="button" onClick={() => onFallback?.(activeJob.id, "approve")}>Continue</button><button className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-on-surface" type="button" onClick={() => onFallback?.(activeJob.id, "decline")}>Stop</button></div></section> : null}
      {activeJob?.status === "FAILED" ? <section className="rounded-xl border border-rose-300/20 bg-rose-300/[0.08] p-4" role="alert"><div aria-label="Generation progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={activeJob.progress} className="sr-only" role="progressbar" /><p className="text-sm font-semibold text-rose-100">Generation failed</p><p className="mt-1 text-sm text-rose-100/80">{activeJob.error ?? "The provider could not complete this generation."}</p><button className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200/25 px-3 text-xs font-semibold text-rose-100" type="button" onClick={() => onRetry?.(activeJob.id)}><RefreshCw className="size-3.5" /> Retry job</button></section> : null}
    </div>
  );
}

function ContextPreview({ context, includeSecrets, onClose }: { context: GenerationContext; includeSecrets: boolean; onClose: () => void }) {
  const omittedCount = context.budget ? Object.values(context.budget.omitted).reduce((sum, value) => sum + value, 0) : 0;
  return <section className="mt-4 rounded-lg border border-primary/25 bg-primary/[0.06] p-4" aria-labelledby="context-preview-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="context-preview-title" className="text-sm font-semibold text-on-surface">Preview AI context</h2><p className="mt-1 text-xs leading-5 text-on-surface-variant">This information has not been sent until you generate.</p></div><button className="text-xs font-semibold text-on-surface-variant hover:text-on-surface" type="button" onClick={onClose}>Close</button></div><div className="mt-3 grid gap-2 text-xs text-on-surface-variant sm:grid-cols-2"><p>{context.characters.length} selected character records</p><p>{context.memories.length} relevant memories</p><p>{context.plotThreads.length} active plot threads</p><p>{includeSecrets ? `${context.secrets.length} secrets included` : "Public canon only"}</p></div>{context.budget ? <p className="mt-3 text-xs text-on-surface-variant">Estimated context: {context.budget.estimatedTokens.toLocaleString()} / {context.budget.maxTokens.toLocaleString()} tokens{omittedCount ? ` · ${omittedCount} lower-priority records omitted` : ""}</p> : null}</section>;
}
