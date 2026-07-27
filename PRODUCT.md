# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are solo visual-novel and long-form fiction writers who need to hold a large cast, canon, timeline, and relationship state in their head while drafting scenes. They work for extended desktop sessions and need a usable responsive fallback when moving between devices.

## Product Purpose

Inkwell is a local-first writing workspace that helps an author plan a story, generate a draft from deliberate scene direction, inspect the retrieved canon, and review continuity before committing new story facts.

## Positioning

The product treats generation as an editorial workflow: a draft is not canon until the writer accepts it and approves the proposed changes to character state, relationships, timeline, lore, secrets, and memories.

## Operating Context

An author creates a story workspace, builds chapters and character records, selects a scene focus, writes a scene brief, reviews AI context and a generated draft, then accepts or revises the result. The workspace must make long-running AI work, failures, uncertainty, and saved work visible.

## Capabilities and Constraints

- Next.js, TypeScript, Prisma, Supabase PostgreSQL, pgvector, and OpenRouter are the current stack.
- The application is local-first today but must establish an ownership boundary compatible with future Supabase Auth.
- Mature-story support requires adult confirmation, consent continuity, and safe backend preflight checks.
- Canonical facts remain relational where they need history and flexible profile detail remains structured JSON.
- AI generation, retrieval, continuity checking, and memory extraction must remain server-side.

## Brand Commitments

- Product name: Inkwell.
- Voice: calm, editorial, direct, and writer-focused.
- The app is a working studio, not a marketing site or generic analytics dashboard.

## Evidence on Hand

- Current UI and shared primitives under `components/`.
- Story, canon, retrieval, continuity, and generation models under `prisma/` and `lib/`.
- No verified photography, logo package, customer claims, or external proof assets are available. Future UI must not fabricate them.

## Product Principles

- The writer stays in control of canonical truth.
- Context must be inspectable, not mysterious.
- Generation is a recoverable workflow, not a blocking button click.
- Continuity warnings should be actionable and evidenced.
- Dense writing tools should remain calm and legible.

## Accessibility & Inclusion

- Keyboard operation, visible focus, semantic controls, and understandable status feedback are required.
- Text and interaction density must remain usable at zoom and on narrow screens.
