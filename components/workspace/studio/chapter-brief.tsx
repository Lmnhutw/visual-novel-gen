"use client";

import { Check, ClipboardList, RotateCcw, X } from "lucide-react";

import type {
  ChapterBrief,
  ChapterBriefUpdate,
} from "@/lib/chapters/chapter-brief";
import { cn } from "@/lib/utils";

export type ChapterBriefDecision = "pending" | "approve" | "discard";

function listValue(items: string[]) {
  return items.join("\n");
}

function parseList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim().replace(/^[-•]\s*/, "").slice(0, 320))
    .filter(Boolean)
    .slice(0, 8);
}

export function ChapterBriefPanel({
  brief,
  version,
}: {
  brief: ChapterBrief | null;
  version: number;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-surface-container-low p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-primary">
            CHAPTER BRIEF
          </p>
          <h2 className="mt-1 text-sm font-semibold text-on-surface">
            {brief ? "Current working state" : "Created from your first direction"}
          </h2>
        </div>
        {brief ? (
          <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary">
            v{version}
          </span>
        ) : null}
      </div>
      {brief ? (
        <div className="mt-4 space-y-4 text-xs leading-5">
          <BriefSection label="Goal" items={[brief.originalIntent]} />
          <BriefSection
            label="Latest progress"
            items={brief.progress.slice(-2)}
            empty="No approved scene update yet."
          />
          <BriefSection
            label="Open threads"
            items={brief.openThreads.slice(0, 4)}
            empty="No open threads recorded."
          />
          {brief.suggestedNextDirection ? (
            <BriefSection
              label="Suggested next"
              items={[brief.suggestedNextDirection]}
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-on-surface-variant">
          The first scene direction becomes the stable chapter goal. Approved
          scene updates will keep this brief current.
        </p>
      )}
    </section>
  );
}

function BriefSection({
  label,
  items,
  empty,
}: {
  label: string;
  items: string[];
  empty?: string;
}) {
  return (
    <div>
      <p className="font-semibold text-on-surface">{label}</p>
      {items.length ? (
        <ul className="mt-1.5 space-y-1.5 text-on-surface-variant">
          {items.map((item) => (
            <li className="flex gap-2" key={item}>
              <span aria-hidden="true" className="text-primary">
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-on-surface-variant">{empty}</p>
      )}
    </div>
  );
}

export function ChapterBriefReview({
  proposal,
  value,
  decision,
  disabled,
  onChange,
  onDecision,
}: {
  proposal: ChapterBriefUpdate;
  value: ChapterBriefUpdate;
  decision: ChapterBriefDecision;
  disabled: boolean;
  onChange: (value: ChapterBriefUpdate) => void;
  onDecision: (decision: ChapterBriefDecision) => void;
}) {
  const updateList = (
    key:
      | "completedBeats"
      | "characterChanges"
      | "newFacts"
      | "openThreadsAdded"
      | "openThreadsResolved",
    nextValue: string,
  ) => onChange({ ...value, [key]: parseList(nextValue) });

  return (
    <section className="mt-4 border-t border-[rgb(var(--color-manuscript-border)/0.8)] pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[rgb(var(--color-manuscript-border)/0.55)] text-[rgb(var(--color-manuscript-ink))]">
            <ClipboardList className="size-4" />
          </span>
          <div>
            <h3 className="font-semibold text-[rgb(var(--color-manuscript-ink))]">
              Update Chapter Brief
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[rgb(var(--color-manuscript-muted))]">
              Review this AI proposal against the final draft. The original
              chapter goal is never overwritten.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
            decision === "approve" && "bg-emerald-100 text-emerald-800",
            decision === "discard" && "bg-stone-200 text-stone-700",
            decision === "pending" && "bg-amber-100 text-amber-800",
          )}
        >
          {decision === "approve"
            ? "Ready to merge"
            : decision === "discard"
              ? "Will not update"
              : "Review required"}
        </span>
      </div>

      <label className="mt-4 block text-xs font-semibold text-[rgb(var(--color-manuscript-ink))]">
        What happened
        <textarea
          className="mt-1.5 min-h-24 w-full rounded-lg border border-[rgb(var(--color-manuscript-border))] bg-white/70 px-3 py-2 text-sm font-normal leading-6 text-[rgb(var(--color-manuscript-ink))] outline-none focus:border-[rgb(var(--color-manuscript-link))] focus:ring-2 focus:ring-[rgb(var(--color-manuscript-link)/0.15)] disabled:opacity-60"
          disabled={disabled}
          maxLength={1_200}
          value={value.summary}
          onChange={(event) => {
            onChange({ ...value, summary: event.target.value });
            onDecision("pending");
          }}
        />
      </label>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <BriefListField
          label="Completed beats"
          value={listValue(value.completedBeats)}
          disabled={disabled}
          onChange={(nextValue) => updateList("completedBeats", nextValue)}
          onEdit={() => onDecision("pending")}
        />
        <BriefListField
          label="Character changes"
          value={listValue(value.characterChanges)}
          disabled={disabled}
          onChange={(nextValue) => updateList("characterChanges", nextValue)}
          onEdit={() => onDecision("pending")}
        />
        <BriefListField
          label="New facts"
          value={listValue(value.newFacts)}
          disabled={disabled}
          onChange={(nextValue) => updateList("newFacts", nextValue)}
          onEdit={() => onDecision("pending")}
        />
        <BriefListField
          label="Open threads added"
          value={listValue(value.openThreadsAdded)}
          disabled={disabled}
          onChange={(nextValue) => updateList("openThreadsAdded", nextValue)}
          onEdit={() => onDecision("pending")}
        />
      </div>

      <details className="mt-3 text-xs text-[rgb(var(--color-manuscript-muted))]">
        <summary className="cursor-pointer font-semibold text-[rgb(var(--color-manuscript-ink))]">
          Resolution and next direction
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <BriefListField
            label="Threads resolved"
            value={listValue(value.openThreadsResolved)}
            disabled={disabled}
            onChange={(nextValue) => updateList("openThreadsResolved", nextValue)}
            onEdit={() => onDecision("pending")}
          />
          <BriefListField
            label="Suggested next direction"
            value={value.suggestedNextDirection}
            disabled={disabled}
            onChange={(nextValue) =>
              onChange({ ...value, suggestedNextDirection: nextValue })
            }
            onEdit={() => onDecision("pending")}
            maxLength={600}
          />
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[rgb(var(--color-manuscript-ink))] px-3 text-xs font-semibold text-white disabled:opacity-50"
          disabled={disabled || !value.summary.trim()}
          type="button"
          onClick={() => onDecision("approve")}
        >
          <Check className="size-3.5" /> Approve update
        </button>
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[rgb(var(--color-manuscript-border))] bg-white/60 px-3 text-xs font-semibold text-[rgb(var(--color-manuscript-ink))] disabled:opacity-50"
          disabled={disabled}
          type="button"
          onClick={() => onDecision("discard")}
        >
          <X className="size-3.5" /> Discard update
        </button>
        {value !== proposal ? (
          <button
            className="inline-flex h-9 items-center gap-1.5 px-2 text-xs font-semibold text-[rgb(var(--color-manuscript-link))] disabled:opacity-50"
            disabled={disabled}
            type="button"
            onClick={() => {
              onChange(proposal);
              onDecision("pending");
            }}
          >
            <RotateCcw className="size-3.5" /> Reset proposal
          </button>
        ) : null}
      </div>
    </section>
  );
}

function BriefListField({
  label,
  value,
  disabled,
  onChange,
  onEdit,
  maxLength,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onEdit: () => void;
  maxLength?: number;
}) {
  return (
    <label className="block text-xs font-semibold text-[rgb(var(--color-manuscript-ink))]">
      {label}
      <textarea
        className="mt-1.5 min-h-20 w-full rounded-lg border border-[rgb(var(--color-manuscript-border))] bg-white/70 px-3 py-2 text-xs font-normal leading-5 text-[rgb(var(--color-manuscript-ink))] outline-none placeholder:text-[rgb(var(--color-manuscript-muted)/0.7)] focus:border-[rgb(var(--color-manuscript-link))] focus:ring-2 focus:ring-[rgb(var(--color-manuscript-link)/0.15)] disabled:opacity-60"
        disabled={disabled}
        maxLength={maxLength}
        placeholder="One item per line"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          onEdit();
        }}
      />
    </label>
  );
}
