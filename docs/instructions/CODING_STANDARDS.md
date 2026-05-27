# Coding Standards

## TypeScript

- Strict mode stays enabled.
- Exported functions should have clear input and output types.
- Use `unknown` instead of `any`.
- Prefer small functions with explicit behavior.

## Backend

- Route handlers stay thin.
- Services own workflows.
- Prisma access stays server-side.
- OpenRouter access stays server-side.
- Use async/await.
- Validate all request bodies with Zod.

## Frontend

- Components are presentation-focused.
- UI state stays local unless shared state is actually needed.
- Do not put prompt or retrieval logic in components.
- Use accessible labels and semantic HTML.

## Refactoring

- Prefer incremental refactors.
- Preserve existing conventions.
- Do not introduce libraries without documenting why.

<!--  -->