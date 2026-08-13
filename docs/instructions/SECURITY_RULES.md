# Security Rules

This is a private local-first app, but secrets still require strict handling.

## Never

- Never read `.env`, `.env.local`, or production env files.
- Never print secrets.
- Never hardcode OpenRouter API keys.
- Never expose OpenRouter keys to frontend code.
- Never log authorization headers.
- Never create debug endpoints that expose prompts, keys, database paths, or private memories.
- Never bypass validation.
- Never modify `.env` files automatically.
- Never generate fake production credentials.

## Sensitive Files

Agents must not automatically modify:

- `.env`
- `.env.local`
- `.env.production`
- production database files
- lockfiles unless dependency changes require it
- migration history unless the user explicitly asks for a schema refactor

## Server-Only Rules

- `OPENROUTER_API_KEY` is read only by server-side code.
- Set `REQUIRE_AUTH=true` for any environment that is not trusted local
  development. In that mode, each API request must carry a Supabase bearer token
  that is validated server-side with `auth.getUser`.
- Every story-bound route verifies `stories.owner_id`; draft, job, character,
  relationship, memory, and proposal access resolves back to the owning story.
- The browser never receives the service-role key or a direct Prisma connection.
- Application tables deny direct Data API access to `anon` and `authenticated`;
  RLS remains enabled as defense in depth while trusted server-side Prisma routes
  form the data-access boundary.
- API responses include a request ID for correlation, but logs and responses must
  not include authorization headers, provider keys, or private prompts by default.
