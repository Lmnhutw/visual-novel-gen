# Retrieval System

Retrieval is hybrid: relational SQLite queries first, semantic vector ranking second.

## Retrieval Flow

1. Load story settings.
2. Load active characters and latest states.
3. Load current relationships and recent history.
4. Load recent events.
5. Load relevant lore.
6. Load secrets and knowledge constraints.
7. Embed the generation query with OpenRouter.
8. Compare query embedding against stored memory embeddings in TypeScript.
9. Merge and rank context.
10. Trim to token budget.

## SQLite Vector Workaround

SQLite has no built-in vector index in this MVP. Embeddings are stored as JSON-array text and cosine similarity is computed in TypeScript. This is acceptable for personal stories under roughly 100 chapters. If memory volume grows, add `sqlite-vec` or move retrieval to a dedicated vector store later.

## Token Priority

1. non-negotiable safety and canon rules
2. current character state
3. relationship state
4. secret knowledge constraints
5. recent timeline
6. lore
7. high-scoring long-term memories
