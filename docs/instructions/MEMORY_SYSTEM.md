# Memory System

The memory system preserves story continuity across chapters by combining normalized canon, summaries, and semantic recall.

## Canon vs Recall

Canonical truth lives in normalized tables:

- characters
- character states
- relationships
- relationship history
- events
- lore
- secrets
- knowledge tracking

Semantic recall lives in:

- memories
- embeddings
- chapter summaries
- scene summaries

Vector search can suggest relevant context. It cannot override canonical relational state.

## Persistent Memory

- Character memory: stable profile, voice, boundaries, motivations, current emotional and physical state.
- Relationship memory: current trust, intimacy, conflict, status, boundaries, and turning points.
- Event memory: timeline events and their impacts.
- Lore memory: world rules, factions, locations, magic systems, culture, history.
- Secret memory: truth, reveal state, and per-character knowledge.
- Plot memory: unresolved promises, foreshadowing, open conflicts, goals.

## Transient Memory

- current user instruction
- generated draft before save
- retrieval candidates before final prompt assembly
- continuity checker intermediate notes

Transient memory is not canon until explicitly saved by a service.

## Scoring

Memory ranking uses:

```text
final_score =
  semantic_similarity * 0.45 +
  salience * 0.20 +
  recency * 0.15 +
  emotional_weight * 0.10 +
  entity_match * 0.10 -
  contradiction_risk
```

Increase salience for:

- death
- injury
- betrayal
- confession
- intimacy change
- secret reveal
- vow or promise
- relationship status change
- world-rule change
- unresolved plot commitment

