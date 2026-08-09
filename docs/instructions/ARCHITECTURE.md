# Architecture

This project is a local-first AI storytelling application for long-form fiction, mature romance themes, memory persistence, retrieval, and continuity management.

## Current Architecture

```text
Browser
  -> Next.js App Router UI
  -> Next.js Route Handlers under /app/api
  -> Zod validation
  -> TypeScript service layer under /lib
  -> Prisma Client
  -> Supabase PostgreSQL database
  -> OpenRouter HTTPS API
```

There are no microservices, queues, containers, or local LLM inference in the MVP. The app runs on a laptop and calls OpenRouter from server-side route handlers.

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
- `lib/generation`: scene/chapter/revision workflows.
- `lib/continuity`: rule-based and LLM-assisted continuity checks.
- `lib/security`: server-only key access and request guards.
- `components/ui`: reusable presentation primitives.
- `components/workspace/studio`: the writing workspace and its feature-specific UI.

## Request Flow

```text
User submits scene goal
  -> /api/generation/scene
  -> validate request with Zod
  -> retrieve structured canon from Supabase PostgreSQL
  -> retrieve ranked memories from relational, keyword, recency, salience, and optional pgvector signals
  -> build prompt
  -> call OpenRouter qwen/qwen-2.5-72b-instruct
  -> save generation run
  -> extract memories
  -> optionally update embeddings only if explicitly enabled later
  -> run continuity checker
  -> return draft, context preview, warnings
```

## Design Decisions

- Supabase PostgreSQL is the source of truth.
- pgvector is installed in the `extensions` schema for semantic memory retrieval. Embeddings remain disabled by default until explicitly configured.
- Prisma handles relational persistence.
- OpenRouter is abstracted so future model routing can be added without rewriting generation services.
- Mature-story support is represented as stored consent, boundaries, adult confirmation, and relationship-state continuity.
