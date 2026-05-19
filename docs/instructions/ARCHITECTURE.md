# Architecture

This project is a local-first AI writing system for long-form fiction under roughly 100 chapters. It uses a Next.js modular monolith so a solo developer can build and debug the whole system without operating multiple services.

## System Shape

```text
Browser
  -> Next.js App Router UI
  -> Route Handlers under /app/api
  -> Zod validation
  -> Service modules under /lib
  -> Prisma + raw pgvector SQL
  -> Supabase PostgreSQL
  -> Ollama local HTTP API
```

PostgreSQL is the source of truth. Vector search is a recall mechanism, not canon.

## Main Modules

- `lib/ai`: local model clients and model configuration.
- `lib/db`: Prisma singleton, raw SQL helpers, vector serialization.
- `lib/generation`: scene/chapter generation workflows.
- `lib/memory`: memory extraction, salience scoring, and persistence.
- `lib/retrieval`: hybrid structured plus vector retrieval.
- `lib/prompts`: prompt templates and prompt assembly.
- `lib/continuity`: rule-based and LLM-assisted continuity checks.
- `lib/validation`: shared Zod schemas for API boundaries.
- `components`: presentation components for the writing workspace.

## Boundary Rules

- React components never import Prisma or raw SQL helpers.
- Route handlers do not contain business logic.
- Retrieval logic lives in `lib/retrieval`, not in API routes.
- Prompt templates live in `lib/prompts`, not inline inside generation handlers.
- Continuity rules live in `lib/continuity`.
- Database writes are coordinated by services, not UI code.

## Separate Backend Decision

A separate backend service is not necessary for the MVP. Next.js Route Handlers are sufficient for CRUD, context retrieval, scene generation, and chapter draft orchestration. Add a separate worker or backend service later only when one of these becomes true:

- chapter generation exceeds request time limits;
- jobs need retries, polling, and cancellation across restarts;
- Ollama/KoboldCPP adapters need process isolation;
- multiple clients need the same backend contract outside the web app.

The first evolution step is a local worker script that reads `generation_runs`, not microservices.

