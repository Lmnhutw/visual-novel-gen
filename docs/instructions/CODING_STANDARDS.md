# Coding Standards

## TypeScript

- Use strict TypeScript.
- Prefer explicit return types on exported functions.
- Use `unknown` instead of `any` unless there is a documented reason.
- Keep DTOs and service inputs typed.

## API

- Validate request bodies with Zod.
- Return consistent JSON errors.
- Keep route handlers thin.
- Do not leak raw provider errors directly to users.

## Database

- Use Prisma for relational CRUD.
- Use `$queryRaw` for pgvector search and operations Prisma cannot express.
- Keep vector SQL in `lib/db` or `lib/retrieval`.

## Frontend

- Components should be presentation-focused.
- Feature orchestration belongs in hooks or page-level components.
- Use semantic HTML and accessible labels.
- Keep application interfaces dense, calm, and task-focused.
- Avoid decorative complexity that does not help writing, retrieval, or continuity work.

