# Retrieval System

Retrieval is hybrid: structured canon first, semantic recall second.

## Retrieval Order

1. Story settings and style guide.
2. Active character profiles and current states.
3. Current relationships and recent relationship history.
4. Recent chapters, scenes, and events.
5. Secrets and knowledge constraints.
6. Relevant lore.
7. Vector memories ranked by similarity, salience, recency, emotional weight, and entity match.
8. Continuity warnings and unresolved plot threads.

## What to Embed

- scene summaries
- chapter summaries
- event summaries
- lore entries
- character profile summaries
- relationship turning points
- extracted memories

## What Not to Trust to Embeddings Alone

- whether a character knows a secret
- current physical state
- current relationship status
- timeline order
- canonical lore rules
- age/adult status for mature content

## Similarity Thresholds

- `0.78+`: strong recall
- `0.70-0.78`: usable with entity or topic match
- below `0.70`: discard unless explicitly linked by structured filters

## Token Budget

Prioritize hard constraints and active canon over long-term recall. When the prompt is too large, compress or drop low-salience memories before dropping current character, relationship, or timeline state.

