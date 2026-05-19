# Database Schema

Supabase PostgreSQL is the source of truth. Prisma manages relational access. pgvector columns and vector indexes are handled by SQL migrations and raw SQL helpers.

## Database Rules

- Use UUID primary keys.
- Every story-owned table includes `story_id`.
- Every foreign key column must have an index.
- Use normalized tables for canon and current state.
- Use JSONB for flexible descriptive attributes that do not need frequent joins.
- Use vector columns only for semantic recall.
- Do not rely on vector search for secrets, physical state, current relationship state, or timeline order.
- Schema changes require migration notes in this file.

## pgvector

The initial migration enables:

```sql
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;
```

The default embedding dimension is `768`. If the embedding model changes dimensions, create a migration before inserting new vectors.

## Main Tables

- `stories`: story workspace.
- `story_settings`: genre, style, POV, model, and mature-content settings.
- `characters`: character identity and status.
- `character_profiles`: stable profile, personality, voice, appearance, boundaries.
- `character_states`: time-scoped emotional, physical, location, and goal state.
- `relationships`: current relationship state between two characters.
- `relationship_history`: relationship turning points.
- `chapters`: chapter content and summary.
- `scenes`: scene content, summary, POV, location, and story time.
- `events`: canonical timeline events.
- `event_impacts`: how events changed character, relationship, lore, or plot state.
- `lore_entries`: worldbuilding facts and rules.
- `secrets`: canonical secrets and reveal state.
- `knowledge_tracking`: which character knows which secret.
- `memories`: ranked semantic memory records.
- `embeddings`: generic chunk embeddings for future indexing.
- `continuity_issues`: saved warnings and blocking contradictions.
- `retrieval_logs`: debugging snapshots of retrieval decisions.
- `generation_runs`: generation request, prompt, model, output, and status.

## Migration Notes

- Initial schema: modular fiction-writing memory schema with pgvector support.
- Vector indexes use HNSW cosine search for the MVP.
- JSONB indexes are limited to fields likely to be filtered or inspected.

