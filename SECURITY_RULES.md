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
- API routes return generated text, warnings, and context previews only for local authenticated use.
- Future multi-user mode must add auth before exposing private memory APIs.

