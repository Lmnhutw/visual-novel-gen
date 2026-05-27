# Project Structure

```text
/app
/app/api
/components
/components/ui
/components/workspace
/lib
/lib/ai
/lib/db
/lib/memory
/lib/retrieval
/lib/prompts
/lib/continuity
/lib/security
/lib/utils
/prisma
/docs
/types
```

## Rules

- API route handlers validate input and call services.
- React components do not import Prisma.
- OpenRouter clients are server-side only.
- Retrieval code stays in `lib/retrieval`.
- Prompt construction stays in `lib/prompts`.
- Continuity checks stay in `lib/continuity`.
- Shared UI primitives stay in `components/ui`.
- Feature UI stays in `components/workspace` until the app grows enough to split by feature.

## Avoid

- giant god-files
- circular dependencies
- duplicated utilities
- database queries in components
- prompt strings in route handlers
- speculative abstractions

