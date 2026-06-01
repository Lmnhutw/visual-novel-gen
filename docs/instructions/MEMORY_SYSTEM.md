# Memory System

The memory system separates canonical truth from semantic recall.

## Persistent Canon

- character profile
- latest character state
- relationship state
- relationship history
- events
- lore
- secrets
- knowledge tracking
- chapter and scene summaries
- unresolved plot threads stored as memories

## Transient Context

- current generation request
- selected retrieval candidates
- unsaved draft text
- prompt assembly buffer

Transient data is not canon until a service persists it.

## Optional Embedding Rules

Embeddings are disabled by default. If explicitly enabled later, embed:

- scene summaries
- chapter summaries
- event summaries
- lore entries
- relationship turning points
- character memory summaries
- unresolved plot threads

Do not trust embeddings alone for:

- whether a character knows a secret
- adult confirmation
- current relationship state
- current physical state
- timeline order
- canon lore constraints

## Ranking

```text
score =
  semantic_similarity * 0.45 +
  salience * 0.20 +
  recency * 0.15 +
  emotional_weight * 0.10 +
  entity_match * 0.10
```

High salience includes betrayal, confession, injury, death, vow, intimacy change, secret reveal, lore rule change, or unresolved plot commitment.
