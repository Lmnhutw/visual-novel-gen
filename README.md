# Narrative Studio

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

1. Copy `env/.env.example` to `env/.env.local`.
2. Add your Supabase connection strings and keys.
3. Add your real `OPENROUTER_API_KEY`.
4. Generate the Prisma client and run migrations.

```bash
npm run prisma:generate
npm run prisma:migrate
```

`npm run prisma:migrate` is the interactive local-development command. In a
deployment environment, apply committed migrations without creating a new one:

```bash
node run-with-project-env.mjs prisma migrate deploy
```

## Docker (recommended for local development)

Docker Compose starts the Next.js app, a local PostgreSQL database with pgvector,
and a dedicated generation worker. This replaces the separate terminal sessions.

1. Copy `env/.env.example` to `env/.env` and add at least `OPENROUTER_API_KEY`.
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

Local npm scripts load `env/.env.local` first, then fall back to `env/.env`.
Variables already supplied by the shell, CI, or Docker keep precedence.
The test runner loads only the database connection variables to keep tests isolated
from local feature configuration.

`env/.env.example` intentionally documents placeholders only:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
GENERATION_MODEL=qwen/qwen-2.5-72b-instruct
EVALUATION_MODEL=
EXTRACTION_MODEL=

ENABLE_EMBEDDINGS=false
REQUIRE_AUTH=false

DATABASE_URL=
DIRECT_URL=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit real `env/.env`, `env/.env.local`, or production secret files.

## Stories, Library, and Reader URLs

Each Story has a unique, human-readable `slug` stored in `stories.slug`. A slug
is generated from the title, for example `the-last-heir-of-the-forgotten-realm`.
If a title would produce a duplicate slug, the next available suffix is used,
such as `test2-2`. The database CUID remains an internal identifier and is not
shown in new Library or Reader URLs.

Reader links use the story slug and, when relevant, the chapter number:

```text
/library/story?story=the-last-heir-of-the-forgotten-realm
/library/story?story=the-last-heir-of-the-forgotten-realm&chapter=2
```

Legacy CUID-based and earlier title-plus-ID links remain accepted; the Reader
redirects them to the canonical slug URL after resolving the Story. Migration
`0013_story_slugs` backfills existing Stories and adds the unique slug index.

Library loading is intentionally split into two states: the initial visit shows
a full content skeleton while stories are first retrieved; switching to another
Story keeps the list visible but temporarily blocks it and replaces only the
Story preview with a skeleton. A failed Story request clears the loading state
and shows an error toast rather than leaving the workspace blocked.

## Retrieval

Supabase PostgreSQL is the source of truth. pgvector columns are available for semantic memory retrieval when embeddings are enabled. With `ENABLE_EMBEDDINGS=false`, retrieval falls back to structured canon plus keyword, salience, recency, and emotional-weight ranking.

Generation context is capped by a token budget (6,000 tokens by default). Canon,
active characters, relationships, secrets, timeline, plot threads, lore, and
memories are admitted in that order. The context preview shows the estimate and
how many lower-priority records were omitted.

`EVALUATION_MODEL` and `EXTRACTION_MODEL` optionally route continuity review and
memory extraction to cheaper or faster OpenRouter models. Empty values fall back
to `GENERATION_MODEL`.

## AI Writing Harness

Each Story has a versioned AI Writing Harness stored in
`story_settings.writing_harness`. The editor exposes language, readability,
style goals, required rules, forbidden characters and phrases, an advisory
sentence-length target, prose/Markdown rules, blank-line limits, and the repair
policy. Empty legacy settings resolve to the complete version 1 default; saved
settings persist the full validated snapshot.

Generation compiles the settings into concise prompt sections rather than
injecting raw JSON. Authority order is system and safety rules, mature-content
boundaries, writing harness, story canon, task, then output contract. Story
`styleGuide` text remains an additional soft goal and cannot override higher
priority instructions.

Generated prose is normalized and checked deterministically for configured hard
rules. Sentence length is advisory only. If hard violations remain and repair is
enabled, the same model receives at most one focused repair request; paid repair
still requires explicit approval. A still-usable result is retained as
`needs_review` when repair is unavailable or does not clear every hard finding.
The effective configuration, prompt version, findings, repair attempt, repair
model, and final status are recorded in generation-run input, queued-job
context/prompt snapshots, and draft metadata.

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
- `lib/writing-harness/*`: versioned story writing preferences, prompt
  compilation, deterministic output validation, bounded repair, and audit data.
- `lib/generation/generation-service.ts`: scene and chapter generation workflow.
- `lib/generation/generation-job-service.ts`: persisted, cancellable generation
  jobs, versioned drafts, reviewable canon proposals, and worker execution.
- `lib/continuity/continuity-service.ts`: deterministic and LLM-assisted continuity checks.
- `lib/stories/story-service.ts`: Story creation, slug allocation, and Library
  lookup.
- `lib/stories/story-url.ts`: canonical slug URL construction and legacy-link
  parsing.
- `docs/instructions/`: project rules and architecture docs.

## Generation jobs and ownership

Generation requests are stored first as `generation_jobs`. The worker claims a
queued job atomically, retrieves canon context, generates a draft, records
continuity issues, and creates reviewable canon proposals. Failed or cancelled
jobs can be retried without creating a duplicate job, while terminal states
cannot be overwritten by a late provider response. A browser may start the job
in local development, but production should always run the worker:

```bash
npm run generation:worker
```

Routes accept a Supabase bearer token and scope every story-bound request to
`stories.owner_id`. Set `REQUIRE_AUTH=true` outside local development to reject
anonymous requests. Public tables retain deny-by-default RLS; application data
is accessed through server-side Prisma routes.

## Canon and continuity review

The Canon view separates three review queues:

- **Canon & Continuity** contains detected contradictions against established
  facts such as character state, timeline, relationships, and prior events.
  P0 issues block draft acceptance until resolved or dismissed. P1 issues must
  be resolved or explicitly overridden during draft review.
- **Canon Proposals** contains new facts extracted from a draft. Accepting one
  commits it to canon, making it available to future retrieval, generation, and
  continuity checks. Proposals are non-blocking and can be accepted only after
  their draft is accepted.
- **Advisories** are non-blocking editorial notes. They do not prevent draft
  acceptance but can be reviewed to improve clarity or consistency.

## Character Library and primary protagonist

`character_templates` stores owned reusable profiles. Adding one to a Story
copies reusable identity and profile fields into an independent `characters`
record; it never copies memories, relationships, secrets, scene history, or
canon. `source_template_id` is lineage metadata only, so deleting a Library
item leaves existing Story characters intact.

A Story may have multiple protagonists and an optional primary protagonist.
The primary must be a `PROTAGONIST` in the same Story; deletion clears the
reference and a role demotion is rejected until the primary designation is
cleared or moved. It is only a generation fallback: explicit POV and active
character selections always win, while an explicit empty active-character list
remains empty.
