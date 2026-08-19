"use client";

import { Check, CheckCircle2, ChevronRight, FileText, Save, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { GenerationContext } from "@/lib/retrieval/types";

import { titleCase } from "./api";
import type { CanonProposal, GenerationJob } from "./types";

function parseContext(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as GenerationContext;
  } catch {
    return null;
  }
}

export function DraftReview({
  job,
  onSaveDraft,
  onAcceptDraft,
  onReviewProposal,
}: {
  job: GenerationJob | null;
  onSaveDraft: (draftVersionId: string, content: string) => Promise<void>;
  onAcceptDraft: (draftVersionId: string) => Promise<void>;
  onReviewProposal: (proposal: CanonProposal, decision: "accept" | "reject") => Promise<void>;
}) {
  const draft = job?.draftVersion ?? null;
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const lastDraftId = useRef<string | null>(null);

  useEffect(() => {
    if (draft?.id !== lastDraftId.current) {
      setContent(draft?.content ?? "");
      lastDraftId.current = draft?.id ?? null;
    }
  }, [draft]);

  useEffect(() => {
    if (!draft || content === draft.content) return;
    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      void onSaveDraft(draft.id, content).finally(() => setIsSaving(false));
    }, 1300);
    return () => window.clearTimeout(timeout);
  }, [content, draft, onSaveDraft]);

  const context = parseContext(job?.contextSnapshot);
  const proposals = job?.proposals ?? [];
  const pendingProposals = proposals.filter((proposal) => proposal.status === "PENDING");

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#ece7dc] shadow-[0_24px_64px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300/80 bg-[#e5decf] px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-stone-800 text-[#f5efe3]">
              <FileText className="size-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-stone-500">DRAFT VERSION</p>
              <h2 className="text-sm font-semibold text-stone-900">
                {draft ? `v${draft.versionNumber} · ${draft.title ?? "Untitled draft"}` : "No draft selected"}
              </h2>
            </div>
          </div>
          {draft ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-500">{isSaving ? "Saving…" : content === draft.content ? "Saved" : "Unsaved"}</span>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 disabled:opacity-50"
                disabled={isSaving || content === draft.content}
                type="button"
                onClick={() => {
                  setIsSaving(true);
                  void onSaveDraft(draft.id, content).finally(() => setIsSaving(false));
                }}
              >
                <Save className="size-3.5" /> Save
              </button>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-stone-900 px-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
                disabled={isAccepting || draft.status === "ACCEPTED"}
                type="button"
                onClick={() => {
                  setIsAccepting(true);
                  void onAcceptDraft(draft.id).finally(() => setIsAccepting(false));
                }}
              >
                <CheckCircle2 className="size-3.5" />
                {draft.status === "ACCEPTED" ? "Accepted" : "Accept draft"}
              </button>
            </div>
          ) : null}
        </div>
        {draft ? (
          <textarea
            aria-label="Draft editor"
            className="min-h-[43rem] w-full resize-y bg-transparent px-7 py-8 font-story text-[17px] leading-8 text-stone-800 outline-none placeholder:text-stone-400 sm:px-10"
            placeholder="A generated draft will appear here."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        ) : (
          <div className="grid min-h-[35rem] place-items-center p-8 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-stone-200 text-stone-500"><Sparkles className="size-5" /></span>
              <h3 className="mt-5 text-lg font-semibold text-stone-800">A draft waits for a scene brief</h3>
              <p className="mt-2 text-sm leading-6 text-stone-500">Start a generation run from Studio. The output will be versioned here before it can become story truth.</p>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">CANON PROPOSALS</p>
              <h2 className="mt-1 text-base font-semibold text-on-surface">Review before commit</h2>
            </div>
            <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{pendingProposals.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {proposals.map((proposal) => (
              <ProposalRow key={proposal.id} proposal={proposal} onReview={onReviewProposal} />
            ))}
            {!proposals.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-on-surface-variant">Generated facts will appear here as reviewable proposals.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">CONTEXT USED</p>
          {context ? (
            <div className="mt-3 space-y-3 text-sm">
              <ContextRow label="Characters" value={Array.isArray(context.characters) ? context.characters.length : 0} />
              <ContextRow label="Memories" value={Array.isArray(context.memories) ? context.memories.length : 0} />
              <ContextRow label="Open threads" value={Array.isArray(context.plotThreads) ? context.plotThreads.length : 0} />
              <ContextRow label="Secrets" value={Array.isArray(context.secrets) ? context.secrets.length : 0} />
              {context.budget ? <ContextRow label="Estimated tokens" value={context.budget.estimatedTokens} /> : null}
            </div>
          ) : <p className="mt-3 text-sm leading-6 text-on-surface-variant">Run a generation to inspect the exact context snapshot.</p>}
        </section>
      </aside>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 last:border-0 last:pb-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}

function ProposalRow({
  proposal,
  onReview,
}: {
  proposal: CanonProposal;
  onReview: (proposal: CanonProposal, decision: "accept" | "reject") => Promise<void>;
}) {
  const [isReviewing, setIsReviewing] = useState(false);
  const completed = proposal.status !== "PENDING";
  return (
    <article className="rounded-xl border border-white/10 bg-surface-dim/60 p-3">
      <div className="flex items-start gap-2">
        <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", completed && proposal.status === "ACCEPTED" ? "bg-emerald-300/15 text-emerald-200" : "bg-primary/15 text-primary")}>
          {completed && proposal.status === "ACCEPTED" ? <Check className="size-3" /> : <ChevronRight className="size-3" />}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-on-surface">{proposal.title}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{titleCase(proposal.type)} · {Math.round(proposal.confidence * 100)}% confidence</p>
        </div>
      </div>
      {proposal.status === "PENDING" ? (
        <div className="mt-3 flex gap-2 pl-7">
          <button
            className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-on-primary disabled:opacity-50"
            disabled={isReviewing}
            type="button"
            onClick={() => {
              setIsReviewing(true);
              void onReview(proposal, "accept").finally(() => setIsReviewing(false));
            }}
          >
            {proposal.actionability === "AUTO_APPLY" ? "Accept" : "Review manually"}
          </button>
          <button
            className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            disabled={isReviewing}
            type="button"
            onClick={() => {
              setIsReviewing(true);
              void onReview(proposal, "reject").finally(() => setIsReviewing(false));
            }}
          >
            <X className="inline size-3" /> Dismiss
          </button>
        </div>
      ) : <p className="mt-3 pl-7 text-xs font-medium text-on-surface-variant">{titleCase(proposal.status)}</p>}
    </article>
  );
}
