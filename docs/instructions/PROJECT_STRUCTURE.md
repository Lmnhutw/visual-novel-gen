# Project Structure

```text
/app
/app/api
/components
/components/ui
/components/workspace/studio
/lib
/lib/ai
/lib/db
/lib/generation
/lib/http
/lib/memory
/lib/retrieval
/lib/prompts
/lib/continuity
/lib/security
/lib/utils
/prisma
/docs
/docs/instructions
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
- Studio-only UI stays in `components/workspace/studio`; reusable primitives stay in `components/ui`.

## Avoid

- giant god-files
- circular dependencies
- duplicated utilities
- database queries in components
- prompt strings in route handlers
- speculative abstractions
