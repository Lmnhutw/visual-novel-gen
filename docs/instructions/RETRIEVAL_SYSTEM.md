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
10. Trim to token budget.

## Vector Retrieval

Supabase PostgreSQL uses pgvector for semantic memory retrieval. Embeddings are disabled by default with `ENABLE_EMBEDDINGS=false`; when enabled, vector writes and cosine similarity search stay isolated in `lib/memory/memory-service.ts` and `lib/retrieval/vector-search.ts`.

## Token Priority

1. non-negotiable safety and canon rules
2. current character state
3. relationship state
4. secret knowledge constraints
5. recent timeline
6. lore
7. high-scoring long-term memories
