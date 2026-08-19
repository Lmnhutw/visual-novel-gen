# Prompt System

Prompts are assembled in `lib/prompts/prompt-builder.ts`.

## Prompt Order

1. System instructions.
2. Mature-story boundaries and consent continuity.
3. Story bible and style guide.
4. Active characters, motivations, voice/speech rules, boundaries, and arc state.
5. Current location, goals, emotional state, and physical state.
6. Current relationships.
7. Secret knowledge constraints.
8. Recent timeline.
9. Relevant lore.
10. Retrieved memories.
11. User goal.
12. Output contract.

## Rules

- Canon beats creativity.
- Do not reset relationship progression.
- Do not invent secret knowledge.
- Do not erase injuries or emotional consequences.
- Mature romance requires adult confirmation and consent continuity.
- JSON extraction prompts must return JSON only.
- Continuity and memory-extraction JSON is parsed and validated through the
  shared structured-output boundary; one bounded schema retry is allowed.

## Change Policy

Prompt changes must explain why the change improves continuity, retrieval, storytelling quality, or structured output reliability.

