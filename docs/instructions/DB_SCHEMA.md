# Database Schema

The app uses Supabase PostgreSQL through Prisma.

```text
DATABASE_URL="<supabase pooled connection string>"
DIRECT_URL="<supabase direct connection string>"
```

## Supabase PostgreSQL Strategy

- Use `String` IDs with `cuid()`.
- Use `DateTime` for timestamps.
- Store flexible structured data as JSON text columns.
- Serialize and parse JSON through `lib/db/json.ts`.
- Store embeddings in pgvector columns with the `vector` extension installed in the `extensions` schema.
- Use raw SQL for vector writes and cosine similarity search because Prisma treats pgvector as `Unsupported("vector")`.
- Normalize canonical state into tables.
- Use JSON text only for flexible attributes that do not need joins.

## Main Tables

- `stories`: story workspace and metadata.
- `story_settings`: genre, tone, POV, style, maturity policy, model config, and
  the full versioned AI Writing Harness JSON snapshot.
- `characters`: identity, role, status, adult confirmation.
- `character_profiles`: personality, voice, backstory, appearance, boundaries.
- `character_states`: emotional, physical, location, and goals over time.
- `relationships`: current relationship trust, intimacy, conflict, and boundaries.
- `relationship_history`: turning points and relationship deltas.
- `chapters`: chapter content and summaries.
- `scenes`: scene content, POV, location, and story time.
- `events`: canonical timeline events.
- `lore_entries`: worldbuilding facts and rules.
- `secrets`: secret truth and reveal status.
- `knowledge_tracking`: what each character knows.
- `memories`: durable memory records and optional pgvector embedding.
- `embeddings`: generic chunk embeddings for future indexing.
- `continuity_issues`: saved warnings and contradictions.
- `generation_runs`: prompts, outputs, token usage, model, status.
- `generation_jobs`: idempotent queue state, progress, attempts, cancellation,
  and links to persisted runs and drafts.
- `draft_versions`: provisional generated prose with explicit acceptance state.
- `canon_change_proposals`: reviewable changes extracted from a generated draft.
- `audit_logs`: append-only workflow and review actions.

## Constraints

- Unique character names per story.
- Unique chapter numbers per story.
- Unique scene numbers per chapter.
- Relationship pairs cannot target the same character.
- Knowledge tracking is unique per secret and character.
- Memory salience and emotional weight are clamped from `0` to `1`.
- Generation progress stays within `0..100`; attempt counts cannot be negative.
- Draft version numbers start at `1`; proposal confidence stays within `0..1`.
- Writing Harness audit data uses existing fields: the generation snapshot and
  evaluation are stored in `generation_runs.input`, the effective queued
  context and compiled instructions remain in
  `generation_jobs.context_snapshot` and `generation_jobs.prompt`, and final
  evaluation/repair metadata is stored in `draft_versions.metadata`. No
  separate harness-audit table is required.
- Data API roles do not have direct privileges on application workflow tables;
  server-side Prisma routes enforce ownership and RLS remains defense in depth.
