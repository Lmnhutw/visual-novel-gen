"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  RefreshCw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { countWords } from "@/lib/chapters/chapter-lifecycle";
import {
  parseWritingHarnessAuditMetadata,
  validateWritingHarnessOutput,
} from "@/lib/writing-harness/evaluation";
import styles from "./draft-review.module.css";
import { titleCase } from "./api";
import type { CanonProposal, ChapterRecord, GenerationJob } from "./types";

export type DraftCommitSuccess = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  wordCount: number;
  targetWords: number;
  hardLimitWords: number;
  activeChapterId: string;
};

export function DraftReview({
  job,
  jobs,
  selectedJobId,
  chapter,
  commitSuccess,
  onSaveDraft,
  onAcceptDraft,
  onReviewProposal,
  onSelectJob,
  onContinueChapter,
  onEndChapter,
}: {
  job: GenerationJob | null;
  jobs: GenerationJob[];
  selectedJobId: string;
  chapter: ChapterRecord | null;
  commitSuccess: DraftCommitSuccess | null;
  onSaveDraft: (draftVersionId: string, content: string) => Promise<void>;
  onAcceptDraft: (
    draftVersionId: string,
    content: string,
    allowContinuityReview: boolean,
  ) => Promise<void>;
  onReviewProposal: (
    proposal: CanonProposal,
    decision: "accept" | "reject",
  ) => Promise<void>;
  onSelectJob: (jobId: string) => void;
  onContinueChapter: () => void;
  onEndChapter: (chapterId: string) => Promise<void>;
}) {
  const draft = job?.draftVersion ?? null;
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [allowContinuityReview, setAllowContinuityReview] = useState(false);
  const lastDraftId = useRef<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const committed = draft?.status === "ACCEPTED" || Boolean(draft?.sceneId);

  useEffect(() => {
    if (draft?.id !== lastDraftId.current) {
      setContent(draft?.content ?? "");
      lastDraftId.current = draft?.id ?? null;
    }
  }, [draft]);

  useEffect(() => {
    if (!draft || committed || isAccepting || content === draft.content) return;
    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      void onSaveDraft(draft.id, content).finally(() => setIsSaving(false));
    }, 1300);
    return () => window.clearTimeout(timeout);
  }, [committed, content, draft, isAccepting, onSaveDraft]);

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
  const harnessAudit = useMemo(
    () => parseWritingHarnessAuditMetadata(draft?.metadata),
    [draft?.metadata],
  );
  const harnessViolations = useMemo(
    () =>
      harnessAudit
        ? validateWritingHarnessOutput(content, harnessAudit.effectiveHarness).filter(
            (finding) => finding.severity === "error",
          )
        : [],
    [content, harnessAudit],
  );
  const harnessNeedsReview = harnessViolations.length > 0;
  const continuityNeedsReview = job?.stage.includes("CONTINUITY") ?? false;

  if (commitSuccess) {
    const advanced = commitSuccess.activeChapterId !== commitSuccess.chapterId;
    const canContinue =
      advanced ||
      commitSuccess.wordCount < commitSuccess.hardLimitWords;
    return (
      <section className="border-y border-white/[0.08] py-8" aria-live="polite">
        <p className="text-xs font-semibold tracking-[0.16em] text-emerald-200">ADDED TO CHAPTER {String(commitSuccess.chapterNumber).padStart(2, "0")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-on-surface">{commitSuccess.chapterTitle}</h2>
        <p className="mt-3 text-sm text-on-surface-variant">
          Chapter length <strong className="text-on-surface">{commitSuccess.wordCount.toLocaleString()} words</strong>
          {" · "}target {commitSuccess.targetWords.toLocaleString()}
          {" · "}hard limit {commitSuccess.hardLimitWords.toLocaleString()}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {canContinue ? (
            <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary" type="button" onClick={onContinueChapter}>
              <Sparkles className="size-4" /> {advanced ? "Continue to next chapter" : "Continue chapter"}
            </button>
          ) : null}
          {!advanced ? (
            <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-on-surface" type="button" onClick={() => void onEndChapter(commitSuccess.chapterId)}>
              <BookOpen className="size-4" /> End chapter
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const draftWords = countWords(content);
  const projectedWords = (chapter?.wordCount ?? 0) + draftWords;
  const hardLimitWords = chapter?.progress?.hardLimitWords;
  const excessWords = hardLimitWords
    ? Math.max(0, projectedWords - hardLimitWords)
    : 0;
  const hardLimitExceeded = excessWords > 0;

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className={styles["draft-review__paper"]}>
        <div className={styles["draft-review__toolbar"]}>
          <div className="flex items-center gap-5">
            <h2 className={`${styles["draft-review__tab"]} ${styles["draft-review__tab--active"]}`}>Draft</h2>
            <button className={styles["draft-review__tab"]} type="button" onClick={() => jobs.length && onSelectJob(jobs[0].id)}>Versions{jobs.length ? ` (${jobs.length})` : ""}</button>
          </div>
          <div className={styles["draft-review__status"]}>
            {draft ? <span>{draftWords.toLocaleString()} words</span> : null}
            {draft ? <span>{isSaving ? "Saving…" : content === draft.content ? "Saved" : "Unsaved"}</span> : null}
          </div>
        </div>
        {draft ? (
          <>
          <textarea
            aria-label="Draft editor"
            className={styles["draft-review__editor"]}
            placeholder="A generated draft will appear here."
            ref={editorRef}
            readOnly={committed || isAccepting}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <div className={`${styles["draft-review__metadata"]} border-t border-white/[0.08] px-5 py-4 text-sm`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>AI draft · <strong className="text-on-surface">{draftWords.toLocaleString()} words</strong></span>
              {chapter ? (
                <span>
                  Chapter after approval · <strong className={hardLimitExceeded ? "text-rose-200" : "text-on-surface"}>{projectedWords.toLocaleString()} words</strong>
                  {" · "}target {(chapter.progress?.targetWords ?? 5000).toLocaleString()}
                  {hardLimitWords ? ` · hard ${hardLimitWords.toLocaleString()}` : ""}
                </span>
              ) : null}
            </div>
            {hardLimitExceeded ? (
              <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/[0.08] px-3 py-2 text-xs leading-5 text-rose-100" role="alert">
                This draft is {excessWords.toLocaleString()} words over the chapter hard limit. Shorten it before approval.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.06] pt-3 text-xs">
              <span>
                Harness · {" "}
                <strong className={harnessNeedsReview ? "text-amber-200" : "text-emerald-200"}>
                  {harnessNeedsReview ? "Review required" : "Passed"}
                </strong>
              </span>
              <span>
                Continuity · {" "}
                <strong className={continuityNeedsReview ? "text-amber-200" : "text-emerald-200"}>
                  {continuityNeedsReview ? "Review required" : "Passed"}
                </strong>
              </span>
            </div>
            {job?.stage.includes("CONTINUITY_REVIEW_REQUIRED") ? (
              <label className="mt-3 flex items-start gap-2 text-xs text-amber-100">
                <input className="mt-0.5" type="checkbox" checked={allowContinuityReview} onChange={(event) => setAllowContinuityReview(event.target.checked)} />
                I reviewed the P1 continuity warnings and want to approve this draft.
              </label>
            ) : null}
            {harnessNeedsReview ? (
              <div
                className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2 text-xs leading-5 text-amber-100"
                role="alert"
              >
                <p className="font-semibold text-amber-50">
                  Fix these Writing Harness violations to add this draft.
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {harnessViolations.map((finding) => (
                    <li key={`${finding.kind}-${finding.rule}`}>
                      {finding.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
              <button
                className={cn(styles["draft-review__action"], styles["draft-review__action--save"])}
                disabled={committed || isAccepting || isSaving || content === draft.content}
                type="button"
                onClick={() => {
                  setIsSaving(true);
                  void onSaveDraft(draft.id, content).finally(() => setIsSaving(false));
                }}
              >
                <Save className="size-3.5" /> Save changes
              </button>
              <button
                className={cn(styles["draft-review__action"], styles["draft-review__action--accept"])}
                disabled={committed || isAccepting || hardLimitExceeded || harnessNeedsReview}
                title={
                  hardLimitExceeded
                    ? "Shorten this draft before approving it."
                    : harnessNeedsReview
                      ? "Fix all Writing Harness violations before approving it."
                      : undefined
                }
                type="button"
                onClick={() => {
                  setIsAccepting(true);
                  void onAcceptDraft(draft.id, content, allowContinuityReview).finally(() => setIsAccepting(false));
                }}
              >
                <CheckCircle2 className="size-3.5" />{committed ? "Added to chapter" : "Add to chapter"}
              </button>
            </div>
          </div>
          </>
        ) : (
          <div className={styles["draft-review__empty"]}>
            <div className={styles["draft-review__empty-content"]}>
              <span className={styles["draft-review__empty-icon"]}>
                <Sparkles className="size-5" />
              </span>
              <h3 className={styles["draft-review__empty-title"]}>
                No draft yet
              </h3>
              <p className={styles["draft-review__empty-copy"]}>
                Generate a scene to start writing. Your draft will appear here.
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
                NEW STORY FACTS
              </p>
              <h2 className="mt-1 text-base font-semibold text-on-surface">
                {pendingProposals.length ? "Review new facts" : "No new facts yet"}
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
                canApply={draft?.status === "ACCEPTED"}
                onReview={onReviewProposal}
              />
            ))}
            {!proposals.length ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-on-surface-variant">
                Facts introduced by a scene will appear here for your review.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.15em] text-on-surface-variant">VERSIONS</p>
              <h2 className="mt-1 text-base font-semibold text-on-surface">Draft history</h2>
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
      </aside>
    </div>
  );
}

function ProposalRow({
  proposal,
  canApply,
  onReview,
}: {
  proposal: CanonProposal;
  canApply: boolean;
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
            disabled={isReviewing || !canApply}
            type="button"
            onClick={() => {
              setIsReviewing(true);
              void onReview(proposal, "accept").finally(() =>
                setIsReviewing(false),
              );
            }}
          >
            {!canApply
              ? "Accept draft first"
              : proposal.actionability === "AUTO_APPLY"
                ? "Apply"
                : "Mark manual change"}
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
