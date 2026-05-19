# Prompt System

Prompts are assembled by `lib/prompts/prompt-builder.ts`. Do not hardcode generation prompts in route handlers.

## Prompt Order

1. System instructions.
2. Mature-content and consent constraints.
3. Story bible and style guide.
4. Active character profiles.
5. Current character states.
6. Current relationship states.
7. Recent timeline events.
8. Relevant lore.
9. Retrieved long-term memories.
10. Unresolved plot threads.
11. Scene or chapter task.
12. Output format.

## Prompt Rules

- Preserve canon over improvisation.
- Do not invent facts that contradict retrieved context.
- Do not reset emotional or relationship progression.
- Do not reveal secrets to characters unless knowledge tracking permits it.
- Mature romance requires adult characters and must respect stored consent, boundaries, and relationship stage.
- Extraction prompts must return JSON only.

## Change Log

- Initial prompt builder defines generation, extraction, and continuity review prompt formats.

