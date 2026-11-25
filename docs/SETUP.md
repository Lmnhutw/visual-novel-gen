# Local Setup and Run Guide

This project is an AI storytelling app built with Next.js, TypeScript, Tailwind CSS, Prisma, Supabase PostgreSQL, pgvector, and OpenRouter.

## Requirements

- Node.js 22 or newer
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
REQUIRE_AUTH="true"

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
- Sign-in is required by default. The browser uses a Supabase session cookie,
  and API clients may send a Supabase access token as `Authorization: Bearer <token>`.
  In trusted development, `REQUIRE_AUTH="false"` lets unsigned users access
  unassigned stories and local templates. Production always requires sign-in.
  If you run a reverse proxy, preserve the public `Host` and forward the
  original protocol so the app can verify the origin of cookie-authenticated writes.

### Account setup and legacy data

Open `/register` to create an email/password account, or follow **Create an
account** from `/login`. Passwords must contain at least eight characters and
match the confirmation field. Successful registration signs you in and opens
the library. Existing accounts can continue signing in through `/login`.

**Temporary auto-verification:** `AUTO_VERIFY_EMAIL` is hardcoded to `true` in
`lib/auth/config.ts`. Registration creates a confirmed user on the server and
does not send a verification email. This requires `SUPABASE_SERVICE_ROLE_KEY`
in the server environment; keep that key out of browser code. Email ownership
is not checked while this temporary mode is enabled.

To enable email verification later:

1. Set `AUTO_VERIFY_EMAIL` to `false`.
2. Enable email signup and **Confirm email** in Supabase Authentication, and
   configure email delivery/SMTP.
3. Set the application's **Site URL** and add each application origin's
   `/auth/callback` URL to the Supabase redirect allowlist, for example
   `http://127.0.0.1:3000/auth/callback` and your deployed HTTPS URL.
4. Keep the default confirmation template using `{{ .ConfirmationURL }}`.
   Registration then shows a check-email message; open the link in the same
   browser used to register so the PKCE verifier cookie is available. The
   callback creates the session and opens the library.

For a token-hash email template that can be opened in another browser, the app
also supports `/auth/confirm?token_hash=TOKEN_HASH&type=signup`. Use
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup` as the link
and ensure **Site URL** points to the intended application.

See [Supabase email/password authentication](https://supabase.com/docs/guides/auth/passwords)
and [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

**Google sign-in:** the **Continue with Google** button uses Supabase OAuth.
When the Google credentials are available:

1. Create a Google OAuth web client. Add the Supabase project's callback URL,
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`, as an authorized redirect
   URI in Google.
2. Enable the Google provider in Supabase Authentication and enter its Client
   ID and Client Secret there. The app does not need those credentials in
   browser code.
3. Add the application's `/auth/callback` URLs to Supabase's redirect allowlist
   for local development and deployment, as above.

Google sign-in requires this provider configuration before it can complete.
Disable temporary auto-verification before enabling public Google sign-in:
Supabase can automatically link identities with the same confirmed email, so
an address registered in temporary mode must not be treated as proof of ownership.
Accounts created in temporary mode remain confirmed after changing the flag;
verify their ownership before reusing them in a public deployment.
See [Supabase Google sign-in setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

For legacy data assignment, find the account under **Authentication → Users**
in the same Supabase project the app uses, then copy the user's UUID.

To assign data already in the configured PostgreSQL database, back it up and
pause the app and generation worker. Apply the Prisma migrations, then preview
the transfer using your server environment file. This command verifies the user
in Supabase and counts stories without an owner and templates owned by
`local-workspace`.

```sh
node --env-file=env/.env.local --import tsx scripts/assign-legacy-account.ts --user-id YOUR_USER_UUID
```

After checking the database and UUID, repeat with the two counts from the preview.

```sh
node --env-file=env/.env.local --import tsx scripts/assign-legacy-account.ts --user-id YOUR_USER_UUID --apply --expect-stories STORY_COUNT --expect-templates TEMPLATE_COUNT
```

The transaction leaves already owned rows as they are. Chapters, drafts,
characters, memories and generation history keep their existing story links.
Audit records already detached from a deleted story remain private to the server
if their owner cannot be determined. Preview again to verify the legacy counts
are zero before reopening the app. Use the database backup if you need to undo
the transfer. This command assigns ownership within one database.

Run `npm run test:accounts` with Docker running to verify the account boundary
against two disposable Supabase Auth users and a fresh PostgreSQL database.
Run `npm run test:accounts -- --local` to also check anonymous development access.

### Story Store publishing permission

Apply `0014_story_publication` before releasing the Store. New accounts can
write in Studio. To grant publishing permission, verify the account under
**Authentication → Users** in the same Supabase project. Bind `$1` to its user UUID
and run this statement from a privileged database session:

```sql
INSERT INTO public.author_permissions (user_id, "AllowToPubish")
VALUES ($1::uuid, true)
ON CONFLICT (user_id) DO UPDATE SET "AllowToPubish" = EXCLUDED."AllowToPubish";
```

Set `"AllowToPubish"` to `false` to revoke permission for future publishes and
updates. The author can still remove an existing publication. Account permission
and legacy story ownership are managed separately.

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
