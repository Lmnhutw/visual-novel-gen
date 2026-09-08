# API Contracts

API routes live under `app/api`. They validate input with Zod and call service modules.

## Main Endpoints

- `POST /api/stories`
- `PATCH /api/stories/:storyId`
- `POST /api/characters`
- `PATCH /api/characters/:characterId`
- `POST /api/characters/:characterId/state`
- `POST /api/relationships`
- `PATCH /api/relationships/:relationshipId`
- `POST /api/generation/scene`
- `POST /api/generation/chapter`
- `GET /api/generation/jobs?storyId=:storyId`
- `POST /api/generation/jobs`
- `GET /api/generation/jobs/:jobId`
- `POST /api/generation/jobs/:jobId/run`
- `POST /api/generation/jobs/:jobId/cancel`
- `POST /api/generation/jobs/:jobId/retry`
- `PATCH /api/draft-versions/:draftVersionId`
- `POST /api/draft-versions/:draftVersionId/accept`
- `POST /api/canon-proposals/:proposalId`
- `POST /api/chapters/:chapterId/summarize`
- `POST /api/chapters/:chapterId/revise`
- `POST /api/memories/extract`
- `GET /api/memories/search`
- `POST /api/retrieval/context`
- `POST /api/continuity/check`

## Error Shape

```json
{
  "error": "Human-readable message",
  "code": "OPTIONAL_STABLE_ERROR_CODE",
  "details": {}
}
```

Every API response includes an `x-request-id` header. The browser client exposes
the HTTP status, stable code, details, and request ID through `ApiRequestError`
so the UI can present actionable failures without parsing message strings.

## Generation Job Rules

- Job creation is idempotent when the same idempotency key is reused.
- Only `FAILED` and `CANCELLED` jobs may be retried.
- Cancellation is terminal and is propagated to the active OpenRouter request.
- Draft acceptance and canon-proposal decisions are explicit review actions.
- `POST /api/canon-proposals/:proposalId` accepts a validated `decision` value.
- Scene, chapter, revision, and queued-job generation all use the Story's
  effective AI Writing Harness. Deterministic hard findings may trigger one
  same-model repair when policy and paid-model approval allow it.
- A usable draft with unresolved hard findings is persisted for editorial review
  with Writing Harness status `needs_review`; a successful repair is reported as
  `repaired_and_passed`.

## Story Writing Harness

`POST /api/stories` and `PATCH /api/stories/:storyId` accept an optional full
version 1 `writingHarness` object. Lists and strings are trimmed, duplicate list
items are removed, bounds are enforced, empty entries and unknown versions are
rejected, and unknown object keys are not accepted. Omitting the field preserves
the existing/default setting. Reset sends the complete default object rather
than deleting the stored value.

## Response Rules

- Do not return OpenRouter request headers.
- Do not return API keys.
- Do not return raw private context unless the endpoint is explicitly a local context preview endpoint.
- Include `generationRunId` for generated drafts.
- Send `Authorization: Bearer <supabase-access-token>` when `REQUIRE_AUTH=true`.
