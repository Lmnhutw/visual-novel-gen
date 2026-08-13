# Narrative Studio hardening implementation prompt

Purpose: Harden the existing full-stack writing workflow and finish the highest-value review items without replacing the current architecture.

Assumptions:

- The current repository is authoritative.
- Narrative Studio remains a Next.js 15, React 19, TypeScript, Prisma, Supabase PostgreSQL, pgvector, and OpenRouter application.
- Local-first mode may run without a signed-in actor; deployments that set `REQUIRE_AUTH=true` must enforce Supabase Auth and story ownership on every API route.
- There is no Go module or Go deployment boundary in this repository. Do not introduce Go, pgx, a second backend, or microservices in this phase. Revisit Go only when independent deployment, ownership, or scaling requirements are proven.
- The untracked technical DOCX is user-owned and out of scope.

Final Prompt:

## Objective

Finish Narrative Studio's recoverable editorial-generation workflow so that retries, cancellation, API failures, database exposure, and high-consequence UI actions are explicit, safe, and testable.

## Context

Narrative Studio is a local-first visual-novel writing studio. Generated prose is provisional. The writer reviews a draft and separately approves proposed canon changes. The application is a modular monolith: browser UI -> Next.js route handlers -> domain services -> Prisma -> Supabase PostgreSQL, with OpenRouter used only from server-side code.

Existing implementation already includes:

- story ownership guards on API routes;
- persisted generation jobs, draft versions, canon proposals, and audit logs;
- a polling worker and a client-triggered run endpoint;
- a split studio UI with pre-generation context preview;
- a graphite editorial shell and warm manuscript surface.

## Scope

1. Harden generation job idempotency, cancellation, retry, and state transitions.
2. Keep failed or cancelled work recoverable without silently creating duplicate jobs.
3. Prevent the new workflow tables from becoming reachable through the Supabase Data API when the project is configured as server-only.
4. Improve the typed frontend API boundary and expose actionable retry/error states.
5. Repair dialog keyboard behavior, progress semantics, and mobile interaction clarity.
6. Bring architecture, API contract, security, and setup documentation in sync with the implementation.
7. Add focused tests for pure job-state rules, API error parsing, and other logic that does not require a live production database.

## Constraints

- Preserve the modular monolith and existing public routes unless a compatibility-preserving addition is needed.
- Keep AI generation, prompts, retrieval context, memories, and service credentials server-side.
- Do not expose `service_role`, OpenRouter credentials, raw authorization headers, or production environment values.
- Do not convert existing JSON-string columns in the same migration as workflow hardening; that requires a separately planned expand/backfill/contract phase.
- Do not add an HNSW index until embedding dimensions and the distance operator are fixed. Current vector columns allow mixed dimensions and embeddings are disabled by default.
- Do not add Go/pgx code to a repository that has no Go runtime boundary.
- Preserve the current visual direction. Use restrained product UI, one action accent, semantic status colors, and no decorative redesign.
- Preserve the user's untracked files.

## Backend requirements

- Make idempotent job creation race-safe against the database unique constraint.
- Make cancellation monotonic: once cancelled, later stage writes must not revive or mutate the job, and generated output must not be persisted after cancellation is observed.
- Add a retry transition for `FAILED` and `CANCELLED` jobs. Clear transient execution state while retaining attempt history and previously persisted generation records.
- Reject invalid transitions with stable workflow error codes.
- Keep OpenRouter timeout/retry behavior bounded; do not retry a caller-initiated abort.
- Record proposal decisions and retry transitions in audit logs.
- Keep direct Data API access revoked for server-owned workflow tables, with RLS retained as defense in depth.

## Frontend requirements

- Parse API errors into a typed error carrying `code`, `details`, status, and request ID when present.
- Show a Retry action for failed/cancelled generation jobs and refresh the selected run after retry.
- Give progress a semantic `progressbar` role and accessible values.
- Use dialog focus trapping, Escape-to-close, focus restoration, and a labelled dialog title.
- Do not present a non-interactive menu icon as a control.
- Keep loading, failure, empty, ready-for-review, accepted, and manual-review states visibly distinct.

## Database requirements

- Add one deterministic forward migration under `prisma/migrations`.
- Explicitly revoke all privileges on workflow tables from `anon` and `authenticated` when those roles exist; the app accesses them through trusted server-side Prisma routes.
- Preserve RLS and ownership policy definitions for defense in depth and future deliberate Data API exposure.
- Do not modify applied migration files.

## Verification criteria

- GitNexus impact analysis is run before every changed function/class/method; HIGH or CRITICAL risk is reported before editing.
- GitNexus `explain` is run on the security, generation, and API boundary after a `--pdg` index. Absence of findings is documented as limited evidence, not proof of safety.
- `npm run prisma:generate`, `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` pass.
- `git diff --check` passes.
- The production UI is exercised at desktop and narrow widths, including keyboard dialog behavior and generation retry affordances.
- `detect_changes()` confirms the final blast radius before any commit.

## Output format

Implement the changes directly. Report changed files, architecture decisions, test commands and results, remaining database/runtime checks that require a live Supabase project, and any deliberately deferred work.
