# Architecture

This project is a local-first AI storytelling application for long-form fiction, mature romance themes, memory persistence, retrieval, and continuity management.

## Current Architecture

```text
Browser
  -> Next.js App Router UI
  -> Next.js Route Handlers under /app/api
  -> Supabase bearer-token validation and story ownership guard
  -> Zod validation
  -> TypeScript service layer under /lib
  -> Prisma Client
  -> Supabase PostgreSQL database
  -> OpenRouter HTTPS API
```

The application is a modular monolith rather than a microservice system. It has
a PostgreSQL-backed generation queue and a dedicated worker process, but no
external message broker. Docker Compose packages the web app, worker, and local
pgvector-enabled PostgreSQL for development. Model inference remains a
server-side OpenRouter call; there is no local LLM runtime.

## Main Modules

- `lib/ai`: OpenRouter provider, model config, retries, token metadata.
- `lib/db`: Prisma singleton and JSON helpers.
- `lib/supabase`: Supabase browser, server, and admin clients.
- `lib/stories`: story CRUD and workspace loading.
- `lib/characters`: character profiles and state updates.
- `lib/relationships`: relationship state and history.
- `lib/memory`: memory persistence, extraction, and optional pgvector embedding storage.
- `lib/retrieval`: relational-first retrieval with optional pgvector ranking.
- `lib/prompts`: prompt templates and prompt assembly.
- `lib/generation`: synchronous scene/chapter/revision workflows plus persisted,
  cancellable generation jobs, versioned drafts, and canon review.
- `lib/continuity`: rule-based and LLM-assisted continuity checks.
- `lib/security`: server-only key access and request guards.
- `components/ui`: reusable presentation primitives.
- `components/workspace/studio`: the writing workspace and its feature-specific UI.

## Request Flow

```text
User submits scene goal
  -> POST /api/generation/jobs (validate, authorize, persist QUEUED job)
  -> worker atomically claims the job, or local UI calls /jobs/:jobId/run
  -> retrieve structured canon and memories using relational, keyword, recency,
     salience, and optional pgvector signals
  -> enforce the context token budget and record a retrieval log
  -> build the prompt and route the generation role to OpenRouter
     with cancellation propagation
  -> transactionally save the generation run and versioned draft
  -> run continuity checks and evaluate whether review or rewrite is recommended
  -> extract reviewable canon proposals
  -> mark the job READY_FOR_REVIEW, FAILED, or CANCELLED
  -> editor accepts or rejects the draft and canon proposals
```

## Design Decisions

- Supabase PostgreSQL is the source of truth.
- pgvector is installed in the `extensions` schema for semantic memory retrieval. Embeddings remain disabled by default until explicitly configured.
- Prisma handles relational persistence.
- Generation job state is monotonic: terminal jobs cannot be revived by late
  writes. Retry re-queues only failed or cancelled jobs and preserves audit
  history.
- PostgreSQL constraints enforce progress, attempt-count, version, and
  confidence ranges. Data API roles have no direct table privileges; server
  routes remain the application boundary.
- OpenRouter is abstracted so future model routing can be added without rewriting generation services.
- Generation, continuity evaluation, and memory extraction support role-based
  model routing while retaining the generation model as the fallback.
- Mature-story support is represented as stored consent, boundaries, adult confirmation, and relationship-state continuity.
