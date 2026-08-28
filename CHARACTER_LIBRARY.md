# Character Library and Narrative Focus

## Architecture and ownership

`CharacterTemplate` is the reusable, owner-scoped Library model. `Character`
remains the Story-specific canonical model; it is not promoted into a shared
object. Template routes authorize the template owner, and copy/duplicate
operations authorize the destination Story in the same database transaction.

The application remains a Next.js modular monolith using Prisma and PostgreSQL.
No new service, queue, vector store, agent, or synchronization process is
introduced.

## Database and migration

Migration `0007_character_library_and_primary_protagonist` creates
`character_templates`, adds nullable `characters.source_template_id`, and adds
nullable `stories.primary_protagonist_id` with `ON DELETE SET NULL`.

`sourceTemplateId` is deliberately lineage metadata without a foreign key:
deleting a Library item cannot delete or invalidate a Story character. Existing
characters, profiles, states, relationships, memories, secrets, scenes, and
POV references are unchanged. Existing stories begin with no primary
protagonist. `character_templates(owner_id, name)` indexes the owner-scoped
Library list/search query.

## Copy and duplicate boundaries

Adding from the Library creates a new `Character` and `CharacterProfile` for
the selected Story. It snapshots reusable identity/profile fields only:
identity, aliases, age, race, occupation, archetypes, personality,
appearance, speech, talents, relationship preferences, background, and generic
arc setup. Completed arc milestones are reset.

It never copies current state, relationships or their history, memories,
secrets or knowledge tracking, scene/chapter/POV participation, events,
continuity issues, canon proposals, or audit history. Editing either side
therefore has no propagation path. `Duplicate & Edit` returns the same safe
create payload with a conflict-safe `Name Copy` default, `SUPPORTING` role, and
`ACTIVE` status; the normal character-create endpoint performs the eventual
validation and uniqueness check.

## API

- `GET` / `POST /api/character-templates` lists/searches or creates the
  caller's Library entries.
- `PATCH` / `DELETE /api/character-templates/:templateId` updates or deletes
  only a caller-owned entry.
- `POST /api/stories/:storyId/characters/from-template` accepts `templateId`
  and an optional validated Story role, then creates one independent copy.
- `POST /api/characters/:characterId/duplicate` returns a safe prefilled
  create payload; it does not mutate the source.
- `PATCH /api/stories/:storyId` accepts nullable `primaryProtagonistId`.

## Primary protagonist, POV, and active characters

A Story can have many `PROTAGONIST` characters and zero or one primary one. In
the Story update transaction, a non-null primary must be a `PROTAGONIST` in the
same Story. Demoting the current primary is rejected until it is replaced or
cleared. Database `SET NULL` clears the Story reference when that character is
deleted.

Generation resolves focus in this order: explicit request, persisted scene or
chapter setting when supplied by the caller, primary fallback, then no inferred
character. An explicit `povCharacterId` wins. `activeCharacterIds: []` remains
empty; only omitted `activeCharacterIds` receives the primary fallback. The
selected primary ID is persisted with generation input and retrieval-log filters
for explainability.

## Retrieval, prompt, memory, and canon boundaries

Primary protagonist is not a retrieval-ranking or canon-authority rule.
Retrieval remains Story-scoped and continues to prioritize explicit active
characters, relevance, entity match, salience, recency, and emotional weight.
Prompt assembly receives the resolved active/POV selection; it does not read
Library templates or use template lineage. Memory, secret, relationship, and
canon writes remain tied to `storyId`, so changing a template or primary cannot
rewrite past Story state.

## UI and deferred scope

The Studio has separate `Create character` and `Add from library` paths, an
owner-scoped searchable Library, profile previews, Story-role choice, copy
warning, `Duplicate & Edit`, primary badges, replace/clear actions, and a
non-blocking no-primary warning during generation. Portrait/asset storage,
Library sharing, and Save to Library are intentionally deferred: they require a
separate asset/visibility contract and are not needed for safe copy semantics.
