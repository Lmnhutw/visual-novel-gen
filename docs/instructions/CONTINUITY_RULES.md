# Continuity Rules

Continuity checking is rule-based first and LLM-assisted second.

## Categories

- personality
- timeline
- relationship
- secret knowledge
- lore
- physical state
- emotional state
- unresolved plot threads

## Severity

- `P0`: blocking contradiction. Do not save as canon without user action.
- `P1`: major continuity risk. User should review.
- `P2`: soft inconsistency.
- `P3`: low-risk style or context warning.

## Rule-Based Checks

- A character cannot use knowledge of a secret unless `knowledge_tracking` says they know it.
- A character cannot act in a scene if their state says they are absent, unconscious, or dead.
- Relationship intimacy should not jump sharply without a relationship history event.
- Injuries and physical constraints persist until changed by an event or state update.
- Lore entries with high canon level override generated prose.
- Story time must move forward unless the scene is explicitly marked as flashback.
- Unresolved plot threads should not disappear silently.

## LLM-Assisted Checks

The LLM checker compares a draft against compact canon context and returns structured issues. It is advisory unless paired with deterministic rule evidence.

