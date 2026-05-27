# Local Setup and Run Guide

This project is a local-first AI storytelling app built with Next.js, TypeScript, Tailwind CSS, Prisma, SQLite, and OpenRouter.

## Requirements

- Node.js 18 or newer
- npm
- An OpenRouter account
- An OpenRouter API key

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

Create a `.env.local` file in the project root and use the values below:

```env
DATABASE_URL="file:./dev.db"
OPENROUTER_API_KEY="sk-or-v1-your-real-key"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_GENERATION_MODEL="qwen/qwen-2.5-72b-instruct"
OPENROUTER_EMBEDDING_MODEL="openai/text-embedding-3-small"
OPENROUTER_HTTP_REFERER="http://localhost:3000"
OPENROUTER_APP_TITLE="Visual Novel Gen"
LOCAL_FIRST_MODE="true"
```

Notes:

- Do not put secrets in source files.
- The OpenRouter API key is used only on the server side.
- `DATABASE_URL="file:./dev.db"` creates a local SQLite database file.

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

## 5. Create or Sync the Local SQLite Database

Run:

```bash
npm.cmd run prisma:push
```

This will create or sync the local SQLite database using the current Prisma schema.

## 6. Run the Source Code

Start the development server:

```bash
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

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

Sync SQLite schema:

```bash
npm.cmd run prisma:push
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

- OpenRouter integration: `lib/ai/openrouter-client.ts`
- Prisma schema: `prisma/schema.prisma`
- Generation flow: `lib/generation/generation-service.ts`
- Retrieval flow: `lib/retrieval/retrieval-service.ts`
- Project rules and architecture docs: `docs/instructions/`

## 10. Troubleshooting

If Prisma is out of sync:

```bash
npx.cmd prisma generate
npm.cmd run prisma:push
```

If the app builds but generation fails:

- check that `OPENROUTER_API_KEY` is valid
- check that the selected model is available on your OpenRouter account
- check your OpenRouter credit or rate limits

If the UI opens but generation returns an error:

- confirm `.env.local` exists
- confirm the server was restarted after editing env values
- confirm the request is using a valid `storyId`

