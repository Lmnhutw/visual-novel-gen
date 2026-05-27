# Continuity Rules

Continuity checks combine deterministic rules with LLM review through OpenRouter.

## Categories

- personality
- emotional state
- physical state
- relationship continuity
- timeline
- secret knowledge
- lore
- unresolved plot threads
- mature-content boundaries

## Severity

- `P0`: blocking contradiction.
- `P1`: major issue requiring review.
- `P2`: soft inconsistency.
- `P3`: advisory warning.

## Deterministic Checks

- Mature mode requires active characters to be confirmed adults.
- Dead or unconscious characters cannot act without explicit exception.
- Secret references must match knowledge tracking.
- Relationship jumps should have a recorded turning point.
- Timeline order must be preserved unless flashback is explicit.
- Physical injuries persist until updated.

## LLM Review

The LLM checker receives compact canon context and draft text. It must return structured issue JSON only.

<!--  -->