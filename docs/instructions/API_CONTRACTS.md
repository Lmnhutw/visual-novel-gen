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
- `POST /api/chapters/:chapterId/summarize`
- `POST /api/chapters/:chapterId/revise`
- `POST /api/memories/extract`
- `GET /api/memories/search`
- `POST /api/retrieval/context`
- `POST /api/continuity/check`

## Error Shape

```json
{
  "error": "message",
  "details": {}
}
```

## Response Rules

- Do not return OpenRouter request headers.
- Do not return API keys.
- Do not return raw private context unless the endpoint is explicitly a local context preview endpoint.
- Include `generationRunId` for generated drafts.

