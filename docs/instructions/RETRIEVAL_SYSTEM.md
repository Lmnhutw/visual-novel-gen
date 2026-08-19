# Retrieval System

Retrieval is relational-first. The app uses Supabase PostgreSQL queries plus keyword, recency, salience, emotional-weight, entity-match, and optional pgvector ranking.

## Retrieval Flow

1. Load story settings.
2. Load active characters and latest states.
3. Load current relationships and recent history.
4. Load recent events.
5. Load relevant lore.
6. Load secrets and knowledge constraints.
7. If embeddings are enabled, compare the query vector against stored memory vectors with pgvector.
8. Otherwise, rank stored memories by keyword match, salience, recency, emotional weight, and entity match.
9. Merge and rank context.
10. Admit context by priority until the token budget is reached.

## Context Budget

- Default: 6,000 estimated tokens; API callers may request 1,000–20,000.
- Explicitly selected characters are never silently removed.
- Remaining priority is characters, relationships, secrets, timeline, open plot
  threads, lore, then long-term memories.
- The returned context includes estimated usage and omitted counts so the writer
  can inspect what will be sent.
- Retrieval logs store the budget, selected character IDs, and memory IDs rather
  than duplicating the full private context snapshot.

## Vector Retrieval

Supabase PostgreSQL uses pgvector for semantic memory retrieval. Embeddings are disabled by default with `ENABLE_EMBEDDINGS=false`; when enabled, vector writes and cosine similarity search stay isolated in `lib/memory/memory-service.ts` and `lib/retrieval/vector-search.ts`.

This is PostgreSQL with the pgvector extension, not a separate vector-database
service. The current vector columns permit model-dependent dimensions, so an
HNSW index is intentionally deferred until one embedding model, dimension, and
distance operator are fixed and existing rows are backfilled consistently.

## Token Priority

1. non-negotiable safety and canon rules
2. current character state
3. relationship state
4. secret knowledge constraints
5. recent timeline
6. lore
7. high-scoring long-term memories
