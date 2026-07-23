# Visual Novel Gen

Next.js app for visual-novel planning, retrieval, generation, memory, and continuity checks.

The current stack is:

- Next.js
- TypeScript
- Supabase PostgreSQL
- Prisma
- pgvector
- OpenRouter
- `qwen/qwen-2.5-72b-instruct`

The app does not use OpenAI, Anthropic, Google Gemini, Ollama, or local LLM inference by default.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase connection strings and keys.
3. Add your real `OPENROUTER_API_KEY`.
4. Generate the Prisma client and run migrations.

```bash
npm run prisma:generate
npm run prisma:migrate
```

## Docker (recommended for local development)

Docker Compose starts both the Next.js app and a local PostgreSQL database with
pgvector. This replaces the separate terminal sessions for the app and database.

1. Copy `.env.example` to `.env` and add at least `OPENROUTER_API_KEY`.
2. Start everything:

```bash
docker compose up --build
```

Open `http://localhost:3000`. Prisma migrations run automatically after the
database is healthy. Source changes are mounted into the container and Next.js
reloads them automatically.

To stop the stack, press `Ctrl+C`. The database persists in the
`postgres_data` Docker volume. To reset only the local Docker database, run:

```bash
docker compose down -v
```

Do not use the local Docker database for production data. The existing Supabase
setup remains available when you run the app outside Docker.

Check Supabase connectivity:

```bash
npm run supabase:check
```

Start the app:

```bash
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm test
npm run lint
```

## Environment

`.env.example` intentionally documents placeholders only:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
GENERATION_MODEL=qwen/qwen-2.5-72b-instruct

ENABLE_EMBEDDINGS=false

DATABASE_URL=
DIRECT_URL=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit real `.env`, `.env.local`, or production secret files.

## Retrieval

Supabase PostgreSQL is the source of truth. pgvector columns are available for semantic memory retrieval when embeddings are enabled. With `ENABLE_EMBEDDINGS=false`, retrieval falls back to structured canon plus keyword, salience, recency, and emotional-weight ranking.

## Architecture

Route handlers under `app/api/**/route.ts` parse and validate input with Zod, then call service functions. Business logic stays under `lib/`.

Key modules:

- `lib/db/prisma.ts`: Prisma singleton.
- `lib/supabase/*`: Supabase browser, server, and admin clients.
- `lib/ai/openrouter.ts`: server-side OpenRouter adapter.
- `lib/ai/provider.ts`: AI provider entry point.
- `lib/memory/memory-service.ts`: memory persistence and ranked search.
- `lib/retrieval/vector-search.ts`: pgvector similarity search.
- `lib/retrieval/retrieval-service.ts`: canonical context assembly.
- `lib/prompts/prompt-builder.ts`: prompt assembly from retrieved context.
- `lib/generation/generation-service.ts`: scene and chapter generation workflow.
- `lib/continuity/continuity-service.ts`: deterministic and LLM-assisted continuity checks.
- `docs/instructions/`: project rules and architecture docs.
