# Generation Pipeline and Chapter Lifecycle — Execution Prompt

Purpose: Refactor the existing deterministic AI writing workflow and implement an atomic post-generation chapter lifecycle.

Assumptions:

- The application remains a Next.js/TypeScript modular monolith using Prisma and PostgreSQL.
- The existing `Scene` model is the ordered manuscript segment unless inspection proves it cannot represent accepted generated chunks.
- Existing chapter statuses remain backward compatible. `DRAFT` represents an in-progress chapter, `COMPLETE` a finished chapter, and `CLOSING` is a derived generation mode rather than a new persisted status unless a migration is demonstrably necessary.
- No agent framework, new queue, event bus, vector database, or provider abstraction is needed.

## Objective

Remove duplicated generation orchestration and make each generated draft an editable chunk that can be approved and committed exactly once to the current chapter. After commit, clear the active review workspace while preserving generation history, draft versions, continuity findings, and canon proposals.

## Required architecture

```text
Generation core
  resolve focus → retrieve bounded context → build prompt → generate
  → normalize → deterministic harness validation → optional one repair
  → revalidate → continuity → evaluation → proposal extraction

Generation job workflow
  progress → cancellation checkpoints → retries → paid fallback confirmation
  → persistence and audit

Draft commit use case
  validate blockers → save final edited content → create accepted Scene placement
  → update chapter word count → optionally complete/advance chapter

Studio UI
  active generation workspace + immutable/selectable generation history
```

The shared generation core is the single source of truth for generation, harness repair, continuity checking, evaluation, and extraction. Persistence transactions, job progress, cancellation, retries, and paid-fallback confirmation remain caller concerns. Small lifecycle hooks are allowed; a generic workflow framework is not.

## Generation requirements

- Reuse the shared core from scene generation, revision, and queued jobs wherever behavior overlaps.
- Preserve exactly one optional Writing Harness repair.
- Centralize repair eligibility as a typed policy; paid work requires explicit approval.
- Preserve raw normalization findings separately from post-normalization validation findings.
- Return typed generated content, provider/usage, prompt/context, harness results, continuity, evaluation, and extraction candidates.
- Keep cancellation checks at meaningful job stage boundaries.
- Failed, cancelled, or rejected generations never alter manuscript content or chapter word count.
- Pre-approval extraction produces candidates/proposals, not canonical memory.

## Chapter manuscript and lifecycle

- Reuse `Scene` as the ordered accepted manuscript segment. Add `ChapterSegment` only if `Scene` is demonstrably incompatible.
- `DraftVersion` remains historical; its accepted `Scene` placement is manuscript content.
- A draft can be committed at most once, enforced by database state and an idempotent transaction.
- Prefer ordered scenes as the canonical manuscript. Do not leave `Chapter.content` and scenes independently writable.
- Preserve historical drafts and do not guess placements for old accepted drafts.
- Generation without a chapter atomically finds the current non-complete chapter or creates Chapter 1 as `DRAFT`, titled `Chapter 1`.
- Approval carries final edited content; never rely on debounced autosave ordering.
- In one transaction: validate blockers, save final content, create the next scene, link/accept the draft, update chapter count, audit, and optionally complete/advance.
- Duplicate approval returns the existing commit.
- Manual end completes the current chapter and creates or reuses Chapter N+1 as `DRAFT`.
- Use unique constraints, serializable transactions, and bounded conflict retries for concurrency.
- Pending canon proposals are non-blocking.

Blocking policy:

```text
hard Writing Harness violations → block
continuity P0 → block
continuity P1 → require explicit override
continuity P2/P3 → non-blocking
pending canon proposals → non-blocking
```

## Chapter length and context

- Store per-story target/soft/hard/auto-advance settings, defaulting to 5000/5500/6000/true. `target` is desired length, `soft` starts closing guidance, and `hard` is the backend-authoritative maximum after commit.
- Validate `targetWords <= softLimitWords <= hardLimitWords` at the API boundary.
- Use one shared Unicode-aware backend-authoritative word-count function.
- Expose counts, limits, remaining budget, and derived `NORMAL | CLOSING` mode to context, prompts, APIs, and UI.
- Retrieve only a bounded recent accepted manuscript tail plus existing memories/summaries.
- Closing prompts state the remaining budget and request a natural ending. Bound generation output by the remaining budget, but enforce the exact word limit when committing because model output length is not authoritative. Never truncate or split prose.
- Reject approval atomically when edited content would make the Chapter exceed its hard limit, returning current, draft, projected, hard-limit, and excess counts.
- Persist the effective generation mode with the draft. Auto-advance only after an approved `CLOSING` draft meets the configured condition; a user-selected `NORMAL`/Continue Anyway draft must not be reclassified during approval. Manual End remains available.
- At the hard limit, disable additive generation and require ending the current Chapter before generating in the next one.

## UI

- Show active chapter title/status, word progress, remaining budget, and limit guidance.
- Rename the action to “Approve & Add to Chapter” and submit current editor content atomically.
- Show projected count against target and hard limit before approval; block approval while the edited draft exceeds the hard limit.
- After commit, clear active review and show `Continue Chapter` / `End Chapter` success actions.
- Keep history selectable without leaving a committed draft active.
- Near limits, prioritize “Generate Chapter Ending”; allow “Continue Anyway” below the hard limit.
- Match the existing restrained dark studio UI, Tailwind, accessibility, and `docs/frontend-structure.md`. Add no dependency.

## Verification

- Add a forward-only Prisma migration preserving all existing content.
- Preserve direct routes, job states, retries, cancellation, and paid fallback consent.
- Test shared pipeline, one-shot repair, word count/budget, Chapter 1 creation, edited commit, blockers, duplicate approval, continue/end/auto-advance, pending proposals, failure isolation, and concurrent transition.
- Run Prisma generation, lint, typecheck, tests, and production build.
- Review the final diff for duplicated orchestration and unnecessary abstraction.

Do not rewrite unrelated modules. Report architecture/schema/API/UI changes, migration behavior, tests and command results, and remaining limitations.
