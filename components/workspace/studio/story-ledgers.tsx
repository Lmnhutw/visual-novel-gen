"use client";

import { BookOpen, CircleAlert, Clock3, FilePlus2, UserPlus, Users } from "lucide-react";

import type { ChapterRecord, CharacterRecord, ContinuityIssue, StoryDetail, StorySummary, WorkspaceView } from "./types";

export function StoryLedger({
  story,
  stories,
  onSelectStory,
  onNewStory,
}: {
  story: StoryDetail | null;
  stories: StorySummary[];
  onSelectStory: (storyId: string) => void;
  onNewStory: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-container-low">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)] lg:p-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary/80">STORY MAP</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-on-surface">{story?.title ?? "Choose a story"}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">{story?.description ?? "Create a story workspace to begin outlining your narrative world."}</p>
            <button className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary" type="button" onClick={onNewStory}><FilePlus2 className="size-4" /> New story</button>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <Metric label="Characters" value={story?.characters.length ?? 0} />
            <Metric label="Chapters" value={story?.chapters.length ?? 0} />
            <Metric label="Relationships" value={story?.relationships.length ?? 0} />
            <Metric label="Open issues" value={story?.continuityIssues.length ?? 0} tone="warn" />
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-surface-container-low p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.14em] text-on-surface-variant">LIBRARY</p><h3 className="mt-1 text-lg font-semibold text-on-surface">Your workspaces</h3></div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((entry) => <button key={entry.id} className="rounded-xl border border-white/10 bg-surface-dim/60 p-4 text-left transition hover:border-primary/40" type="button" onClick={() => onSelectStory(entry.id)}><p className="font-semibold text-on-surface">{entry.title}</p><p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">{entry.description ?? "No story description yet."}</p></button>)}
        </div>
      </section>
    </div>
  );
}

export function CastLedger({ characters, onAdd }: { characters: CharacterRecord[]; onAdd: () => void }) {
  return <section className="rounded-2xl border border-white/10 bg-surface-container-low p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.14em] text-on-surface-variant">CAST LEDGER</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Characters who carry the story</h2></div><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary" type="button" onClick={onAdd}><UserPlus className="size-4" /> Add character</button></div><div className="mt-6 grid gap-3 lg:grid-cols-2">{characters.map((character) => <article key={character.id} className="flex gap-4 rounded-xl border border-white/10 bg-surface-dim/60 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">{character.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-on-surface">{character.name}</h3><span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">{character.role}</span></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">{character.profile?.personality?.summary ?? "No character voice has been recorded."}</p></div></article>)}{!characters.length ? <Empty icon={<Users className="size-5" />} text="Build the cast before asking the model to hold its emotional stakes." /> : null}</div></section>;
}

export function ChapterLedger({ chapters, onAdd }: { chapters: ChapterRecord[]; onAdd: () => void }) {
  return <section className="rounded-2xl border border-white/10 bg-surface-container-low p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.14em] text-on-surface-variant">CHAPTERS</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Navigate the manuscript spine</h2></div><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary" type="button" onClick={onAdd}><FilePlus2 className="size-4" /> Add chapter</button></div><div className="mt-6 space-y-3">{chapters.map((chapter) => <article key={chapter.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-white/10 bg-surface-dim/60 p-4"><div><div className="flex items-center gap-3"><span className="text-sm font-bold text-primary">{String(chapter.number).padStart(2, "0")}</span><h3 className="font-semibold text-on-surface">{chapter.title}</h3></div><p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{chapter.summary ?? "No summary yet."}</p></div><div className="flex gap-3 text-xs text-on-surface-variant"><span>{chapter._count?.scenes ?? 0} scenes</span><span>{chapter._count?.events ?? 0} events</span></div></article>)}{!chapters.length ? <Empty icon={<BookOpen className="size-5" />} text="Create an outline chapter to give scenes a clear narrative anchor." /> : null}</div></section>;
}

export function CanonLedger({ issues, view }: { issues: ContinuityIssue[]; view: WorkspaceView }) {
  return <section className="rounded-2xl border border-white/10 bg-surface-container-low p-5 sm:p-6"><p className="text-xs font-semibold tracking-[0.14em] text-on-surface-variant">{view === "canon" ? "CONTINUITY QUEUE" : "CANON"}</p><h2 className="mt-1 text-xl font-semibold text-on-surface">Review contradictions before they harden</h2><div className="mt-6 space-y-3">{issues.map((issue) => <article key={issue.id} className="flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-4"><CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-200"/><div><div className="flex items-center gap-2"><span className="text-xs font-bold text-amber-100">{issue.severity}</span><span className="text-xs text-on-surface-variant">{issue.category}</span></div><p className="mt-1 text-sm leading-6 text-on-surface">{issue.description}</p></div></article>)}{!issues.length ? <Empty icon={<Clock3 className="size-5" />} text="No open continuity issues. New generation warnings will be collected here." /> : null}</div></section>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "warn" }) { return <div className="rounded-xl bg-surface-dim/80 p-4"><p className="text-xs font-semibold text-on-surface-variant">{label}</p><p className={`mt-2 text-2xl font-semibold ${tone ? "text-amber-200" : "text-on-surface"}`}>{value}</p></div>; }
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-5 text-sm leading-6 text-on-surface-variant">{icon}<p>{text}</p></div>; }
