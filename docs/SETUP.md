# Local Setup and Run Guide

This project is an AI storytelling app built with Next.js, TypeScript, Tailwind CSS, Prisma, Supabase PostgreSQL, pgvector, and OpenRouter.

## Requirements

- Node.js 18 or newer
- npm
- A Supabase project
- An OpenRouter account
- An OpenRouter API key

> Prefer Docker for local development if you want one command to run both the
> application and database. It provides local PostgreSQL with pgvector, so a
> Supabase project is not required for that workflow.

## Docker Local Development

1. Install Docker Desktop.
2. Copy `env/.env.example` to `env/.env` and set `OPENROUTER_API_KEY`.
3. Start the stack:

```bash
docker compose up --build
```

Open `http://localhost:3000`. The Compose stack starts PostgreSQL, waits for
it to become healthy, applies Prisma migrations, then starts Next.js. Your
source directory is mounted, so edits reload automatically.

Use `Ctrl+C` to stop it. Run `docker compose down -v` only when you explicitly
want to delete the local Docker database volume.

## 1. Get an OpenRouter API Key

1. Sign in to OpenRouter.
2. Open `Settings -> Keys`.
3. Create a new API key.
4. Copy the key immediately.

The key should look like this:

```text
sk-or-v1-...
```

OpenRouter documentation:

- `https://openrouter.ai/docs/cookbook/get-started/quickstart`
- `https://openrouter.ai/docs/api-keys`

## 2. Create the Local Environment File

Create `env/.env.local` and use the values below:

```env
AI_PROVIDER="openrouter"
OPENROUTER_API_KEY="sk-or-v1-your-real-key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
GENERATION_MODEL="qwen/qwen-2.5-72b-instruct"
ENABLE_EMBEDDINGS="false"
REQUIRE_AUTH="false"

DATABASE_URL="your-supabase-pooled-connection-string"
DIRECT_URL="your-supabase-direct-connection-string"

SUPABASE_URL="your-supabase-project-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

Notes:

- Do not put secrets in source files.
- The OpenRouter API key is used only on the server side.
- `DATABASE_URL` should use the Supabase pooled connection string.
- `DIRECT_URL` should use the Supabase direct connection string for migrations.
- Embeddings are disabled by default; pgvector is available when embeddings are explicitly enabled later.
- Set `REQUIRE_AUTH="true"` outside trusted local development. Authenticated API calls must send a Supabase access token as `Authorization: Bearer <token>`.

## 3. Install Dependencies

Run:

```bash
npm.cmd install
```

## 4. Generate Prisma Client

Run:

```bash
npx.cmd prisma generate
```

## 5. Run Supabase Migrations

Run:

```bash
npm.cmd run prisma:migrate
```

This will apply Prisma migrations to Supabase PostgreSQL.

## 6. Run the Source Code

Start the development server:

```bash
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

In another terminal, start the persisted generation worker:

```bash
npm.cmd run generation:worker
```

The UI can execute a queued job directly during local development, but deployed
environments should keep the worker running so queued and retried jobs continue
when no browser request is active.

Then open:

```text
http://127.0.0.1:3000
```

## 7. First-Time Usage

The current UI expects a `storyId`, so the initial workflow is:

1. Create a story with the API.
2. Copy the returned `story.id`.
3. Paste the `storyId` into the app UI.
4. Enter a scene goal.
5. Preview context or generate a scene.

Example request to create a story on Windows:

```bash
curl -X POST http://127.0.0.1:3000/api/stories ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"My Story\",\"description\":\"Private fiction workspace\",\"genre\":[\"romance\",\"drama\"]}"
```

## 8. Useful Commands

Install dependencies:

```bash
npm.cmd install
```

Generate Prisma client:

```bash
npx.cmd prisma generate
```

Run migrations:

```bash
npm.cmd run prisma:migrate
```

Run lint:

```bash
npm.cmd run lint
```

Run typecheck:

```bash
npm.cmd run typecheck
```

Build production bundle:

```bash
npm.cmd run build
```

Run production server locally:

```bash
npm.cmd run start
```

## 9. Main Source Files

- OpenRouter integration: `lib/ai/openrouter.ts`
- Prisma schema: `prisma/schema.prisma`
- Generation flow: `lib/generation/generation-service.ts`
- Persisted generation jobs and retries: `lib/generation/generation-job-service.ts`
- Retrieval flow: `lib/retrieval/retrieval-service.ts`
- Project rules and architecture docs: `docs/instructions/`

## 10. Troubleshooting

If Prisma is out of sync:

```bash
npx.cmd prisma generate
npm.cmd run prisma:migrate
```

If the app builds but generation fails:

- check that `OPENROUTER_API_KEY` is valid
- check that the selected model is available on your OpenRouter account
- check your OpenRouter credit or rate limits

If the UI opens but generation returns an error:

- confirm `env/.env.local` exists
- confirm the server was restarted after editing env values
- confirm the request is using a valid `storyId`
