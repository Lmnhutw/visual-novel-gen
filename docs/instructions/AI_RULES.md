# AI Rules

These rules are mandatory for coding agents working on this local-first AI storytelling app.

## Before Modifying Any Code

1. Read `docs/instructions/AI_RULES.md`.
2. Inspect the current implementation and folder structure.
3. Follow existing service, route, Prisma, and component patterns.
4. Prefer the smallest safe change over broad rewrites.
5. Update the relevant documentation when architecture, schema, prompts, retrieval, continuity, API contracts, state, or styling changes.

## Required Reads

- Architecture changes: read `docs/instructions/ARCHITECTURE.md` and `docs/instructions/PROJECT_STRUCTURE.md`.
- Database or Prisma changes: read `docs/instructions/DB_SCHEMA.md` and `docs/instructions/MEMORY_SYSTEM.md`.
- Retrieval changes: read `docs/instructions/RETRIEVAL_SYSTEM.md` and `docs/instructions/MEMORY_SYSTEM.md`.
- Prompt changes: read `docs/instructions/PROMPT_SYSTEM.md`.
- Continuity changes: read `docs/instructions/CONTINUITY_RULES.md`.
- API changes: read `docs/instructions/API_CONTRACTS.md`.
- Frontend state changes: read `docs/instructions/STATE_MANAGEMENT.md`.
- Styling or component changes: read `docs/instructions/STYLE_GUIDE.md`.
- Security-sensitive changes: read `docs/instructions/SECURITY_RULES.md`.

## Never Do

- Do not invent files, routes, models, fields, utilities, or env vars without inspecting the repo.
- Do not put database queries in React components.
- Do not put prompt assembly in UI code.
- Do not put retrieval ranking inside route handlers.
- Do not expose OpenRouter keys to the frontend.
- Do not read, print, or modify `.env` files.
- Do not bypass Zod validation.
- Do not refactor unrelated code.

## Always Do

- Keep route handlers thin.
- Keep business logic in `lib/*` services.
- Keep Prisma access in service or repository modules.
- Keep OpenRouter access server-side only.
- Use TypeScript strict mode.
- Use Zod at API boundaries.
- Preserve local-first SQLite workflows.
