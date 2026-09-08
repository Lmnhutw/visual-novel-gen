# Prompt System

Prompts are assembled in `lib/prompts/prompt-builder.ts`.

## Prompt Order

1. System instructions.
2. Mature-story boundaries and consent continuity.
3. Compiled AI Writing Harness.
4. Story bible and canon context.
5. Active characters, motivations, voice/speech rules, boundaries, and arc state.
6. Current location, goals, emotional state, and physical state.
7. Current relationships.
8. Secret knowledge constraints.
9. Recent timeline.
10. Relevant lore.
11. Retrieved memories.
12. User goal.
13. Output contract.

## Rules

- Canon beats creativity.
- Do not reset relationship progression.
- Do not invent secret knowledge.
- Do not erase injuries or emotional consequences.
- Mature romance requires adult confirmation and consent continuity.
- Writing Harness settings are validated, versioned user data. Compile them into
  bounded instructions; never dump raw configuration into the prompt or let
  story data override system, safety, canon, ownership, or output constraints.
- Treat Story `styleGuide`, harness style goals, and sentence length as soft
  editorial guidance. Deterministic forbidden-character, forbidden-phrase,
  Markdown, wrapper, and blank-line checks remain authoritative.
- Repair a violating prose draft at most once with the same model, revalidate
  the result, and retain a usable `needs_review` draft if hard findings remain.
- Never initiate a paid repair without explicit approval.
- JSON extraction prompts must return JSON only.
- Continuity and memory-extraction JSON is parsed and validated through the
  shared structured-output boundary; one bounded schema retry is allowed.

## Change Policy

Prompt changes must explain why the change improves continuity, retrieval, storytelling quality, or structured output reliability.

