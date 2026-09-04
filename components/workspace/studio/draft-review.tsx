"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  BookOpen,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import styles from "./draft-review.module.css";
import { titleCase } from "./api";
import type { CanonProposal, GenerationJob } from "./types";

export function DraftReview({
  job,
  jobs,
  selectedJobId,
  onSaveDraft,
  onAcceptDraft,
  onReviewProposal,
  onSelectJob,
}: {
  job: GenerationJob | null;
  jobs: GenerationJob[];
  selectedJobId: string;
  onSaveDraft: (draftVersionId: string, content: string) => Promise<void>;
  onAcceptDraft: (draftVersionId: string) => Promise<void>;
  onReviewProposal: (
    proposal: CanonProposal,
    decision: "accept" | "reject",
  ) => Promise<void>;
  onSelectJob: (jobId: string) => void;
}) {
  const draft = job?.draftVersion ?? null;
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const lastDraftId = useRef<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

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

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.style.height = "auto";
    editor.style.height = `${editor.scrollHeight}px`;
  }, [content, draft?.id]);

  const proposals = job?.proposals ?? [];
  const pendingProposals = proposals.filter(
    (proposal) => proposal.status === "PENDING",
  );

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className={styles["draft-review__paper"]}>
        <div className={styles["draft-review__toolbar"]}>
          <div className="flex items-center gap-3">
            <span className={styles["draft-review__icon"]}>
              <FileText className="size-4" />
            </span>
            <div>
              <p className={styles["draft-review__eyebrow"]}>
                DRAFT VERSION
              </p>
              <h2 className={styles["draft-review__title"]}>
                {draft
                  ? `v${draft.versionNumber} · ${draft.title ?? "Untitled draft"}`
                  : "No draft selected"}
              </h2>
            </div>
          </div>
          {draft ? (
            <div className="flex items-center gap-2">
              <span className={styles["draft-review__status"]}>
                {isSaving
                  ? "Saving…"
                  : content === draft.content
                    ? "Saved"
                    : "Unsaved"}
              </span>
              <button
                className={cn(styles["draft-review__action"], styles["draft-review__action--save"])}
                disabled={isSaving || content === draft.content}
                type="button"
                onClick={() => {
                  setIsSaving(true);
                  void onSaveDraft(draft.id, content).finally(() =>
                    setIsSaving(false),
                  );
                }}
              >
                <Save className="size-3.5" /> Save
              </button>
              <button
                className={cn(styles["draft-review__action"], styles["draft-review__action--accept"])}
                disabled={isAccepting || draft.status === "ACCEPTED"}
                type="button"
                onClick={() => {
                  setIsAccepting(true);
                  void onAcceptDraft(draft.id).finally(() =>
                    setIsAccepting(false),
                  );
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
            className={styles["draft-review__editor"]}
            placeholder="A generated draft will appear here."
            ref={editorRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        ) : (
          <div className={styles["draft-review__empty"]}>
            <div className={styles["draft-review__empty-content"]}>
              <span className={styles["draft-review__empty-icon"]}>
                <Sparkles className="size-5" />
              </span>
              <h3 className={styles["draft-review__empty-title"]}>
                A draft waits for a scene brief
              </h3>
              <p className={styles["draft-review__empty-copy"]}>
                Start a generation run from Studio. The output will be versioned
                here before it can become story truth.
              </p>
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">
                CANON PROPOSALS
              </p>
              <h2 className="mt-1 text-base font-semibold text-on-surface">
                Review before commit
              </h2>
            </div>
            <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {pendingProposals.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {proposals.map((proposal) => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                onReview={onReviewProposal}
              />
            ))}
            {!proposals.length ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-on-surface-variant">
                Generated facts will appear here as reviewable proposals.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">RUNS</p>
              <h2 className="mt-1 text-base font-semibold text-on-surface">Recent generation</h2>
            </div>
            <BookOpen className="size-4 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {jobs.slice(0, 7).map((entry) => (
              <button
                key={entry.id}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  entry.id === selectedJobId
                    ? "border-primary/40 bg-primary/10"
                    : "border-white/10 bg-surface-dim/60 hover:border-white/25",
                )}
                type="button"
                onClick={() => onSelectJob(entry.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-on-surface">{titleCase(entry.stage)}</span>
                  {entry.status === "READY_FOR_REVIEW" ? <CheckCircle2 className="size-4 text-emerald-200" /> : <RefreshCw className={cn("size-3.5 text-on-surface-variant", entry.status === "RUNNING" && "animate-spin")} />}
                </div>
              </button>
            ))}
            {!jobs.length ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-on-surface-variant">Your generation history will appear here.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">EDITORIAL GUARDRAIL</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Generated text is a draft. Memories, events, and changes to canon remain proposals until you approve them.</p>
        </section>
      </aside>
    </div>
  );
}

function ProposalRow({
  proposal,
  onReview,
}: {
  proposal: CanonProposal;
  onReview: (
    proposal: CanonProposal,
    decision: "accept" | "reject",
  ) => Promise<void>;
}) {
  const [isReviewing, setIsReviewing] = useState(false);
  const completed = proposal.status !== "PENDING";
  return (
    <article className="rounded-xl border border-white/10 bg-surface-dim/60 p-3">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
            completed && proposal.status === "ACCEPTED"
              ? "bg-emerald-300/15 text-emerald-200"
              : "bg-primary/15 text-primary",
          )}
        >
          {completed && proposal.status === "ACCEPTED" ? (
            <Check className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-on-surface">
            {proposal.title}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">
            {titleCase(proposal.type)} · {Math.round(proposal.confidence * 100)}
            % confidence
          </p>
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
              void onReview(proposal, "accept").finally(() =>
                setIsReviewing(false),
              );
            }}
          >
            {proposal.actionability === "AUTO_APPLY"
              ? "Accept"
              : "Review manually"}
          </button>
          <button
            className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface disabled:opacity-50"
            disabled={isReviewing}
            type="button"
            onClick={() => {
              setIsReviewing(true);
              void onReview(proposal, "reject").finally(() =>
                setIsReviewing(false),
              );
            }}
          >
            <X className="inline size-3" /> Dismiss
          </button>
        </div>
      ) : (
        <p className="mt-3 pl-7 text-xs font-medium text-on-surface-variant">
          {titleCase(proposal.status)}
        </p>
      )}
    </article>
  );
}
