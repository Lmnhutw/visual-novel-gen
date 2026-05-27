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
  -> SQLite file database
  -> OpenRouter HTTPS API
```

There are no microservices, queues, containers, or local LLM inference in the MVP. The app runs on a laptop and calls OpenRouter from server-side route handlers.

## Main Modules

- `lib/ai`: OpenRouter provider, model config, retries, token metadata.
- `lib/db`: Prisma singleton and JSON helpers.
- `lib/stories`: story CRUD and workspace loading.
- `lib/characters`: character profiles and state updates.
- `lib/relationships`: relationship state and history.
- `lib/memory`: memory persistence, extraction, embedding storage.
- `lib/retrieval`: hybrid relational plus semantic retrieval.
- `lib/prompts`: prompt templates and prompt assembly.
- `lib/generation`: scene/chapter/revision workflows.
- `lib/continuity`: rule-based and LLM-assisted continuity checks.
- `lib/security`: server-only key access and request guards.
- `components`: presentation-focused UI.

## Request Flow

```text
User submits scene goal
  -> /api/generation/scene
  -> validate request with Zod
  -> retrieve structured canon from SQLite
  -> retrieve semantic memories from stored embeddings
  -> build prompt
  -> call OpenRouter qwen/qwen-2.5-72b-instruct
  -> save generation run
  -> extract memories
  -> update embeddings
  -> run continuity checker
  -> return draft, context preview, warnings
```

## Design Decisions

- SQLite is the source of truth for local use.
- Embeddings are stored as JSON-array text in SQLite and ranked in TypeScript for the MVP.
- Prisma handles relational persistence.
- OpenRouter is abstracted so future model routing can be added without rewriting generation services.
- Mature-story support is represented as stored consent, boundaries, adult confirmation, and relationship-state continuity.
