# Frontend Structure Contract

> Source of truth for frontend structure and naming in this project.

## Scope

- Frontend root: `app/` and `components/`
- Framework: Next.js App Router with React and TypeScript
- Styling system: Tailwind CSS utility classes with shared tokens in `tailwind.config.ts`
- Applies to: all browser-rendered pages and components

## Naming Convention

This project primarily uses Tailwind utilities for styling. Do not add custom
classes when an existing utility or shared component is sufficient. When a
semantic custom class is necessary, use BEM:

```css
.block {}
.block__element {}
.block--modifier {}
```

- Use semantic names based on responsibility, not appearance or DOM depth.
- Do not mix ad-hoc naming systems, utility-like custom classes, or selectors
  tied to `nth-child`/fragile markup structure.
- Use `cn` for conditional Tailwind class composition.

## Block Ownership

| Block | Responsibility | Location |
| --- | --- | --- |
| `workspace` | Studio shell, story selection, navigation, and workspace state | `components/workspace/studio/` |
| `story-ledger` | Story library, cast, and canon overview surfaces | `components/workspace/studio/story-ledgers.tsx` |
| `generation-studio` | Generation brief and retrieval/context preview | `components/workspace/studio/generation-studio.tsx` |
| `draft-review` | Draft editing, proposal review, and generation history | `components/workspace/studio/draft-review.tsx` |
| `character-form` | Story and reusable character profile editing | `components/workspace/studio/character-form.tsx` |
| `ui` primitives | Reusable controls and presentational primitives | `components/ui/` |

## Styling Rules

- Keep static styles in Tailwind utilities and shared tokens.
- Use inline styles only for genuinely runtime-derived values.
- Prefer semantic component markup and accessible state attributes over
  selectors that depend on DOM shape.
- Reuse `components/ui` primitives before adding a duplicate control pattern.

## Component Boundaries

- Keep `WriterStudio` responsible for orchestration, server interaction, and
  workspace state.
- Extract meaningful UI responsibilities with reusable behavior into nearby
  studio components; do not split trivial markup solely to reduce line count.
- Keep domain types in `components/workspace/studio/types.ts` and request
  helpers in `components/workspace/studio/api.ts`.

## Framework / Styling-System Specific Notes

- Server pages own data loading and navigation; interactive studio surfaces use
  client components.
- Use `@/` imports for cross-feature imports and relative imports within the
  studio feature.
- Use `lucide-react` icons already installed in the project; do not add an icon
  dependency for existing UI needs.

## Exceptions

- `app/library/story/page.tsx` intentionally uses a warm manuscript palette
  for chapter reading; it remains a page-level presentation exception.

## Cross-Skill Rule

This document remains authoritative when other frontend, design, or refactoring
skills modify the frontend.
