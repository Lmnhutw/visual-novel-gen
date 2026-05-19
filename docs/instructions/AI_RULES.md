# AI Rules

These rules are mandatory for every coding agent working in this repository.

## Before Modifying Code

1. Read this file.
2. Inspect the existing implementation and folder structure.
3. Follow the existing project patterns before introducing a new one.
4. Make the smallest safe change that solves the task.
5. Update the relevant documentation when changing architecture, schema, memory, retrieval, prompt, or continuity behavior.

## Hard Boundaries

- Do not invent a new architecture without updating `docs/instructions/ARCHITECTURE.md`.
- Do not bypass the service layer.
- Do not put database logic directly inside React components.
- Do not put retrieval logic directly inside route handlers.
- Do not duplicate existing utilities or clients.
- Do not introduce a new library without documenting why it is needed.
- Do not refactor unrelated files unnecessarily.
- Do not change schema without migration notes in `docs/instructions/DB_SCHEMA.md`.
- Do not change prompts without documenting the reason in `docs/instructions/PROMPT_SYSTEM.md`.
- Do not ignore existing naming conventions.

## Required Reads

- Architecture changes: read `docs/instructions/ARCHITECTURE.md`.
- Database or Prisma changes: read `docs/instructions/DB_SCHEMA.md` and `docs/instructions/MEMORY_SYSTEM.md`.
- Memory changes: read `docs/instructions/MEMORY_SYSTEM.md`.
- Retrieval changes: read `docs/instructions/RETRIEVAL_SYSTEM.md` and `docs/instructions/MEMORY_SYSTEM.md`.
- Prompt changes: read `docs/instructions/PROMPT_SYSTEM.md` and `docs/instructions/MEMORY_SYSTEM.md`.
- Continuity changes: read `docs/instructions/CONTINUITY_RULES.md` and `docs/instructions/MEMORY_SYSTEM.md`.
- UI changes: inspect `app`, `components`, and existing component patterns first.

## Coding Defaults

- Prefer consistency over novelty.
- Keep business logic in service modules under `lib`.
- Keep route handlers thin: validate input, call a service, return a response.
- Keep UI components presentation-focused.
- Use TypeScript strict patterns.
- Use Zod for API validation.
- Use Prisma for relational database access.
- Use raw SQL only for pgvector-specific queries and documented database operations Prisma cannot express.
- Keep local-first behavior working without external hosted services where practical.
