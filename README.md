# Narrative Studio

**English** | [Tiếng Việt](README.vi.md)

A Next.js application for story planning, prose generation, retrieval, memory,
continuity review, and manuscript reading.

The stack is Next.js, React, TypeScript, Prisma, PostgreSQL (Supabase or local
Docker), pgvector schema support, and a server-side OpenRouter adapter. There is
no local LLM inference by default. See [model routing](#model-calls) for source
defaults and cost boundaries.

## Read the architecture and core workflows

The [architecture guide](#architecture-guide) includes nine diagrams and source links:

1. [System architecture and responsibilities](#system-overview)
2. [User journey, stories, and characters](#user-flow)
3. [Draft generation from UI to worker and LLM](#generation-flow)
4. [Retrieval, context budget, and prompts](#context-prompt)
5. [Job states, cancellation, retry, and paid fallback](#job-lifecycle)
6. [Draft review and manuscript acceptance](#draft-acceptance)
7. [Continuity, memory, and canon review](#canon-review)
8. [Continuation, chapter ending, and handoff](#chapter-loop)
9. [Core data model and Reader access](#core-data)

The language links switch complete README files and corresponding diagrams.
They are static documentation links, not an application language setting.
Both versions describe repository code, without claiming live verification of
production or external models.

## Local setup

1. Copy `env/.env.example` to `env/.env.local`.
2. Set database connections, Supabase keys as needed, and `OPENROUTER_API_KEY`.
3. Install dependencies, generate the Prisma client, and run migrations:

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate
```

`prisma:migrate` is interactive and intended for local development. In deployment,
apply committed migrations without creating new ones:

```bash
node run-with-project-env.mjs prisma migrate deploy
```

Check Supabase connectivity, then start the app:

```bash
npm run supabase:check
npm run dev
```

Outside Docker, run the worker in another terminal so queued jobs do not depend
on a browser triggering execution:

```bash
npm run generation:worker
```

Useful checks:

```bash
npm run typecheck
npm test
npm run lint
```

## Docker for local development

Compose starts Next.js, PostgreSQL with pgvector, and the generation worker.
Copy `env/.env.example` to `env/.env`, set at least `OPENROUTER_API_KEY`, then run:

```bash
docker compose up --build
```

Open `http://localhost:3000`. Compose supplies local database URLs. Migrations run
after the DB health check; mounted source changes reload automatically.
Press `Ctrl+C` to stop. Data persists in the `postgres_data` volume.

To delete the local Compose database and start fresh:

```bash
docker compose down -v
```

This removes Compose volumes and their data. Keep production data out of this
development stack. Supabase remains available when running outside Docker.

## Environment

Local npm scripts load `env/.env.local` first, then `env/.env`. Existing shell,
CI, or Docker variables take precedence. The test runner imports only database
connection variables from those files, not local feature settings.

The example file contains placeholders, not secrets:

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
GENERATION_MODEL=qwen/qwen-2.5-72b-instruct
FREE_GENERATION_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
PAID_FALLBACK_MODEL=qwen/qwen-2.5-72b-instruct
EVALUATION_MODEL=
EXTRACTION_MODEL=
GENERATION_WORKER_POLL_MS=5000

ENABLE_EMBEDDINGS=false
REQUIRE_AUTH=false

DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit real `env/.env`, `env/.env.local`, or production secret files.
The example uses `REQUIRE_AUTH=false` for trusted local development with
unassigned data. See [account setup and legacy data](docs/SETUP.md#account-setup-and-legacy-data).

## Stories, Library, and Reader URLs

Each Story has a unique `stories.slug` generated from its title. Duplicate slugs
receive a suffix such as `test2-2`. CUIDs remain internal API identifiers; new
Reader links use the slug and optional chapter number:

```text
/library/story?story=the-last-heir-of-the-forgotten-realm
/library/story?story=the-last-heir-of-the-forgotten-realm&chapter=2
```

Legacy CUID and earlier title-plus-ID references resolve and redirect to the
canonical slug URL. Migration `0013_story_slugs` backfills stories and adds the
unique index.

Library shows a full content skeleton initially. Switching Story keeps the list
visible, temporarily blocks interaction, and replaces the preview with a skeleton.
A failed Story request clears loading and shows an error toast.

Authors with [publishing permission](docs/SETUP.md#story-store-publishing-permission)
can publish selected completed chapters from Studio. Guests browse and read
published copies at `/store`. Studio edits reach readers when the author updates
the publication.

## Retrieval and Writing Harness

PostgreSQL is the source of truth. pgvector columns and search code exist, but
the current OpenRouter `embedText()` throws an unsupported-feature error.
`ENABLE_EMBEDDINGS=true` alone does not enable semantic retrieval; search falls
back to keyword, salience, recency, and emotional-weight ranking.

Context uses a 6,000-token estimate by default. Required data may exceed it;
preview exposes `overBudget` and omitted counts. This is not a hard limit on the
entire provider prompt. See [context assembly](#context-prompt).

Each Story has a versioned Harness in `story_settings.writing_harness`: language,
readability, style goals, required rules, forbidden characters/phrases, advisory
sentence length, prose/Markdown rules, blank-line limits, and repair policy.
Empty legacy settings use the complete version 1 default; saves persist a full
validated snapshot. `styleGuide` remains a soft preference.

Generation compiles preferences into instructions, normalizes prose, and checks
supported hard rules. When enabled and allowed, one focused repair uses the same
model. Remaining hard violations retain the result as `needs_review`.
Effective settings, prompt version, findings, repair attempt/model, and outcome
are recorded in run input, job context/prompt snapshots, and draft metadata.
Language, style, sentence length, and arbitrary instructions are not fully
guaranteed by deterministic checks.

## Generation jobs and ownership

Studio persists `generation_jobs` before execution. Workers claim atomically
and save reviewable drafts/proposals. Failed or cancelled work can retry on the
same job. Conditional stage/completion writes prevent late results from
overwriting a cancelled job.

Studio and Reader use a verified Supabase session cookie. API clients may
also use Supabase bearer tokens. Story requests are scoped to `stories.owner_id`.
Sign-in is required by default and in production. With `REQUIRE_AUTH=false` in
development, unsigned requests can access unassigned stories and local templates.
Public tables retain deny-by-default RLS, with Prisma handling data on the server.

## Canon review and reusable characters

Canon separates contradictions, new-fact proposals, and editorial advisories.
Open P0 blocks draft acceptance; open P1 needs explicit override. Resolving or
dismissing an issue removes it from those gates, but mature-content issues cannot
be dismissed. Proposals/advisories do not block acceptance. Only Memory/Event
proposals are written after explicit approval; other types need manual application.

`character_templates` holds owned reusable profiles. Copying into a Story creates
an independent Character without memories, relationships, secrets, scene history,
or canon. `source_template_id` is lineage only; deleting a template leaves copied
characters intact.

Stories allow multiple protagonists and an optional primary protagonist, who must
be a `PROTAGONIST` in the same Story. Deletion clears the reference. Role demotion
is rejected until the primary designation is cleared or moved.
Explicit POV/active selections override primary fallback. An empty active list
suppresses that fallback, but retrieval treats an empty filter as all Story
characters, subject to query limits and context budget.

<a id="architecture-guide"></a>
## Architecture and workflow guide

Scope: understanding the current prose planning/writing/reading application.
The repository does not implement a visual-novel game runtime. Local setup does
not establish production traffic or reliability targets.

| Concept | Role |
| --- | --- |
| Story / canon | The story and stored characters, relationships, events, lore, secrets, and threads |
| Chapter / Scene | A chapter and its ordered manuscript segments |
| DraftVersion | An editable draft awaiting review; generation alone does not add manuscript content |
| Chapter Brief | Original intent, progress, completed beats, facts, open threads, and next direction |
| Memory | Durable database recall supporting retrieval, not the model's internal memory |
| Writing Harness | Story writing preferences compiled into instructions and output checks |
| GenerationJob / GenerationRun | A persisted workflow job and a generation-attempt record; statuses mean different things |

<a id="system-overview"></a>
### 1. System architecture and responsibilities

![System architecture and integrations](docs/diagrams/en/01-architecture.svg)

This is a **modular monolith**: Next.js hosts UI/API, services live in `lib/`,
and a separate worker shares code/database. Generation follows a fixed sequence;
models do not select tools or coordinate agents.

| Component | Responsibility and source |
| --- | --- |
| Presentation | [`WriterStudio`](components/workspace/studio/writer-studio.tsx) owns workspace state, API calls, and polling; panels expose forms, context, and review |
| API boundary | [`app/api/`](app/api/) parses input, checks authentication/ownership, invokes services, returns JSON/errors |
| Services | [Stories](lib/stories/), [characters](lib/characters/), [chapters](lib/chapters/), and [generation](lib/generation/) own workflows/transactions |
| Shared AI pipeline | [`generation-pipeline.ts`](lib/generation/generation-pipeline.ts) serves queued jobs and direct generation |
| Infrastructure | [Prisma](lib/db/prisma.ts), [OpenRouter](lib/ai/openrouter.ts), [Supabase clients](lib/supabase/), [ownership](lib/security/ownership.ts) |
| Worker | [`run-generation-worker.ts`](scripts/run-generation-worker.ts) polls every 5 seconds by default, taking at most one job per tick |
| Local deployment | [`compose.yaml`](compose.yaml): app, worker, PostgreSQL/pgvector and persistent volumes |

PostgreSQL stores business data and the queue. Current flows need no additional
Redis, queue broker, vector database, agent framework, or microservices.
Project rules live in [`docs/instructions/`](docs/instructions/).

<a id="user-flow"></a>
### 2. User journey, stories, and characters

![Story setup, character preparation, writing, review, and reading](docs/diagrams/en/02-user-flow.svg)

`/` redirects to `/library`. Library uses WriterStudio for Story selection/creation
and writing, character, canon, and settings views. Creating a Story also creates
settings and a unique slug. Reader URLs use slugs; workflow APIs use internal IDs.

Templates are reusable per owner; Story Characters are independent copies.
Random profiles use local data/templates and functions in
[`lib/character-generation/`](lib/character-generation/), not an LLM.
[`resolveNarrativeFocus`](lib/generation/narrative-focus.ts) applies primary fallback;
[`character-template-service.ts`](lib/characters/character-template-service.ts)
handles template ownership/copying.

<a id="generation-flow"></a>
### 3. Draft generation from UI to worker and LLM

![Create a job, execute the pipeline, persist results, and poll](docs/diagrams/en/03-generation-sequence.svg)

1. UI posts Story, goal, chapter, POV, active characters, and options to
   `/api/generation/jobs`. Server checks scope, mature-content requirements,
   and hard word limit, selects/creates an active chapter, and initializes a
   missing Brief.
2. `createGenerationJob` saves before calling a model. The same Story and
   `idempotencyKey` reuse a job; a unique constraint handles concurrent duplicates.
3. Worker or `POST /api/generation/jobs/:id/run` claims by conditional update.
   Only the claimant executes. UI also triggers run after creation; production
   needs the worker to continue without a browser.
4. Pipeline retrieves context, builds a prompt, generates prose, checks Harness,
   optionally repairs once, checks continuity, and extracts structured proposals.
5. A transaction saves DraftVersion, issues, proposals, run output, and
   `READY_FOR_REVIEW`. UI polls every 1.8 seconds while any job is active.

`GenerationRun.SUCCEEDED` means output was saved, not that every quality check
passed. Extraction failure retains the draft and is audited. LLM continuity
failure keeps rule checks and adds a checker warning.

Direct APIs `POST /api/generation/scene`, `/api/generation/chapter`, and
`/api/chapters/:id/revise` share the pipeline through
[`generation-service.ts`](lib/generation/generation-service.ts), inside the request.
They return draft/extraction candidates without the full job, DraftVersion, and
proposal queue used by Studio. `previewOnly` prepares prompt/context without prose
generation; it still reads DB and uses retrieval.

<a id="model-calls"></a>
#### Model calls and cost boundaries

| Step | Routing in code |
| --- | --- |
| Initial draft, including direct generation | `FREE_GENERATION_MODEL`; default `nvidia/nemotron-3-ultra-550b-a55b:free` |
| Queued-job paid fallback | `PAID_FALLBACK_MODEL`; default `qwen/qwen-2.5-72b-instruct`; time-limited approval required |
| Harness repair | Same writing model, at most one repair request; paid repair enabled for a confirmed paid attempt |
| LLM continuity | `EVALUATION_MODEL`, falling back to `GENERATION_MODEL` |
| Memory/canon/Brief extraction | `EXTRACTION_MODEL`, falling back to `GENERATION_MODEL` |
| Chapter summary | Default provider model, `GENERATION_MODEL` |

**A free writing step does not make the job free.** Evaluation/extraction can use
paid models without the writing fallback confirmation. Names above are source
defaults, not verified live availability/pricing. See
[`model-config.ts`](lib/ai/model-config.ts) and [`model-routing.ts`](lib/ai/model-routing.ts).

The adapter uses server-side `fetch` to `/chat/completions` without streaming.
Its fetch timeout defaults to 60 seconds, with two retries after the first attempt.
The timer clears when `fetch` returns; it is not a deadline for reading the whole
body or completing a job. Structured output uses JSON response format, parsing,
and Zod. Invalid schema output normally gets one extra attempt, configurable up
to two. Provider/schema retries can multiply conceptual calls shown in diagrams.

<a id="context-prompt"></a>
### 4. Retrieval, context budget, and prompts

![Canon retrieval, memory ranking, context selection, and prompts](docs/diagrams/en/04-context-prompt.svg)

[`retrieveContext`](lib/retrieval/retrieval-service.ts) loads Story/settings,
profiles/states, relationships/history, events, lore, secrets/knowledge, open
threads, Brief, and recent approved Scenes. Memory search uses Story/goal and
ranks keyword matches with salience, recency, and emotional weight.
If memory retrieval throws during context assembly, fallback uses salience/recency.

[`applyContextBudget`](lib/retrieval/context-budget.ts) estimates tokens from
character count: default 6,000, requested range clamped to 1,000–20,000.
Story/settings/chapter and required characters stay first. Up to three approved
Scenes contribute their last 4,000 characters each, fitted to remaining space.
Optional characters, relationships, secrets, events, threads, lore, and memories
follow. Required data can produce `overBudget=true`. This is not a real tokenizer
or a hard quota for the full prompt.

[`buildGenerationPrompt`](lib/prompts/prompt-builder.ts) assembles:

```text
System / canon protection
Mature Content Rules, when applicable
Writing Harness: required rules, deterministic rules, style goals
Story / settings / approved manuscript / characters / relationships
Timeline / lore / secrets and knowledge / threads / memories / Brief
Previous draft, when supplied; closing budget and continuation instructions
Task: mode, goal, scene goal, POV
Output contract: prose according to effective preferences
```

Priority is expressed in prompt text. The adapter normally sends this as
**one `role: user` message**; a `System` heading is not a separate message role.
Server code enforces ownership/writes. Harness is Story configuration, not a
Codex skill or a model that learns after each run. Supported hard rules are
checked mechanically; style, language, sentence length, and arbitrary
instructions still need editorial review.

<a id="job-lifecycle"></a>
### 5. Job states, cancellation, retry, and fallback

![Generation job state transitions](docs/diagrams/en/05-job-lifecycle.svg)

`status` describes lifecycle; `stage` exposes detailed progress:

```text
RETRIEVING_CONTEXT → BUILDING_PROMPT → GENERATING → VALIDATING_HARNESS
→ REPAIRING_HARNESS (optional) → CHECKING_CONTINUITY
→ EXTRACTING_BRIEF_AND_CANON → SAVING_DRAFT → applicable review stage
```

Eligible writing failures (timeout, connection, HTTP 408/429/5xx, or empty output)
pause the free attempt at `AWAITING_FALLBACK_CONFIRMATION`. Paid approval has a
five-minute window. Declining cancels; worker polling cancels expired confirmations.
Retrying `FAILED`/`CANCELLED` reuses the job and restarts free generation without
keeping earlier paid approval.

Cancellation updates DB state. Job prose requests poll cancellation/use AbortSignal;
checkpoints recheck status. Final writes require `RUNNING`, so late results cannot
overwrite a cancelled job. This does not guarantee no provider charge, or immediate
cancellation of an ongoing review/extraction call.

Source: [`generation-job-service.ts`](lib/generation/generation-job-service.ts),
[`job-state.ts`](lib/generation/job-state.ts), [`openrouter.ts`](lib/ai/openrouter.ts).

<a id="draft-acceptance"></a>
### 6. Draft review and manuscript acceptance

![Acceptance gates and DraftVersion-to-Scene commit](docs/diagrams/en/06-draft-acceptance.svg)

Save edits only an uncommitted DraftVersion. Accept calls
`POST /api/draft-versions/:id/accept` and
[`commitDraftToChapter`](lib/chapters/chapter-service.ts):

- Already committed: return the existing Scene without adding it again.
- A Brief proposal requires approve/discard. Approve merges the reviewed update;
  discard keeps the current Brief.
- Fix hard Harness violations and open P0. Open P1 requires explicit override,
  or resolve/dismiss the issue. Mature-content issues cannot be dismissed.
- Chapter must be active; content must contain words. Empty content produces 422;
  review/chapter/word-limit conflicts produce 409. Projected chapter words must
  stay within the hard limit.
- A serializable transaction creates the ordered Scene, marks the draft `ACCEPTED`,
  updates word/token counts and approved Brief. Conflicts allow **three total
  attempts**, not three retries after the first.

These checks run at the server. Committed draft history cannot be edited through
save draft. Prose acceptance and canon acceptance are separate decisions.

<a id="canon-review"></a>
### 7. Continuity, memory, and canon review

![Review proposals before persistence or manual application](docs/diagrams/en/07-canon-review.svg)

Continuity uses rules plus schema-validated LLM review. UI separates contradictions,
new facts, and advisories; a new detail is not automatically a contradiction.
`evaluateDraft` recommends rewrite for P0, review for P1, pass otherwise.
Commit still enforces separate acceptance gates.

Extraction returns memory, events, state/relationship changes, secrets, lore,
threads, and Brief updates. Queued-job canon candidates become `PENDING`;
**model output alone does not change canon**.

After draft acceptance, the writer can approve individual proposals:

- Memory/Event `AUTO_APPLY`: transaction writes the record, marks `ACCEPTED`, and
  audits the decision. Explicit user approval is still required.
- State, relationship, secret, lore, and thread proposals become
  `NEEDS_MANUAL_APPLICATION`; this endpoint does not apply their data to those tables.
- Reject marks the proposal and audits. Proposals do not block draft acceptance.

Brief updates are reviewed with draft acceptance, outside the canon queue.
Utility `POST /api/memories/extract` can persist memories directly with
`persist=true`; it is not the Studio approval workflow.

Source: [`continuity-service.ts`](lib/continuity/continuity-service.ts),
[`memory-extractor.ts`](lib/memory/memory-extractor.ts),
[`reviewCanonChangeProposal`](lib/generation/generation-job-service.ts).

<a id="chapter-loop"></a>
### 8. Continuation, chapter ending, and handoff

![Generate, review, commit, and hand off to a new chapter](docs/diagrams/en/08-chapter-loop.svg)

Defaults are **5,000 / 5,500 / 6,000 words** for target/soft/hard limits, with
auto-advance enabled. Automatic mode becomes `CLOSING` at the soft limit or when
at most 1,200 words remain. With defaults, closing can start at 4,800 words.
Output-token allowance considers remaining words; commit checks actual word
count and does not mechanically truncate prose.

Accept with `action=end_chapter` ends the chapter. Auto-advance requires the
setting, `CLOSING` mode, and projected words reaching target.
`POST /api/chapters/:id/end` separately refuses an active chapter with queued,
running, retrying, or fallback work. Next chapter is created/reused if not closed.

Brief handoff carries recent progress, character changes, facts, and open threads.
New intent follows the supplied opening direction or suggested next direction.
Continue uses approved Brief and Scene excerpts. Summarize is a separate LLM
command storing `chapter.summary`; chapter ending does not call it.

Source: [`chapter-lifecycle.ts`](lib/chapters/chapter-lifecycle.ts),
[`chapter-service.ts`](lib/chapters/chapter-service.ts),
[`chapter-brief.ts`](lib/chapters/chapter-brief.ts).

<a id="core-data"></a>
### 9. Core data model and Reader access

![Selected Story and generation relationships](docs/diagrams/en/09-core-data.svg)

This map selects relationships from [`schema.prisma`](prisma/schema.prisma),
not the full schema. Relationship/history, events, lore, secrets/knowledge, threads,
embeddings, retrieval logs, and audit logs add canon/traceability.
Templates live outside Story; `sourceTemplateId` is lineage, not profile syncing.
Optional cardinalities reflect nullable foreign keys, including an issue that
can exist without a GenerationRun.

[Reader](app/library/story/page.tsx) calls `getLibraryStory` directly on the server,
resolves slug/legacy references, and redirects to the canonical URL.
It prefers manuscript assembled from ordered Scenes, supports legacy
`chapter.content`, then falls back to the latest accepted draft or summary.
New unaccepted drafts do not automatically become chapter reading content.

<a id="operational-limits"></a>
### Operational limits

| Situation | Current behavior and consequence |
| --- | --- |
| Embeddings enabled | Adapter throws; search falls back to keywords. pgvector schema does not prove semantic retrieval works. |
| Worker dies after claim | Persisted jobs/atomic claims do not recover stale `RUNNING` work. Worker selects `QUEUED`/`RETRYING`, without lease, heartbeat, or stale recovery. |
| Prose edited after review | Commit rechecks hard Harness rules, but continuity/extraction remain from generation. Substantial edits need renewed review and comparison with existing proposals. |
| Cost tracking | Run records writing/repair model, prompt, output, usage; jobs add snapshots, retrieval logs, audit. This is not total cost because evaluation/extraction have separate calls. |
| Failure/load | Timeout/retry and persisted stages exist. The generation path reviewed has no rate limiter, global concurrency quota, or spend cap. Local Docker does not establish production capacity. |

Keep the current architecture. Complete session/access and cost policy before
expanding usage; add recovery for long-running workers. Implement an embedding
provider only when measured keyword retrieval is insufficient. Separate the
queue/services only when traffic or operations show the database queue is a bottleneck.

### Maintaining both language versions

English: `README.md`. Vietnamese: `README.vi.md`.
Vietnamese sources/SVGs remain in [`docs/diagrams/`](docs/diagrams/);
English counterparts are in [`docs/diagrams/en/`](docs/diagrams/en/).
Both use **github-light**, **Arial**, matching diagram IDs, and stable section
anchors. SVG embeds need no Mermaid-capable Markdown renderer.
[Open the matching Vietnamese architecture guide](README.vi.md#architecture-guide).

When a flow changes, update both READMEs and both `.mmd` files, render SVGs with
Pretty Mermaid, and check links, labels, arrows, cardinalities, and layout.
Manual canon application is a required action, not a promise that every canon
entity already has its own editor.

Maintenance prompt based on Coding Prompt Builder:

```text
Purpose: Update architecture/workflow documentation from current code.
Assumptions: Preserve behavior; keep English and Vietnamese in sync.
Final Prompt:
Read AGENTS.md, both READMEs, and connected source. Use GitNexus query/context
for callers and execution flows; run impact before edits. Trace UI, API, services,
DB, worker, prompts, and model calls. Update both READMEs and matching Mermaid/SVGs.
Distinguish implemented behavior, fallback, limits, and future proposals.
Keep valid setup instructions. Add no runtime feature, dependency, or refactor.
Verify language links, local links/anchors, rendering, labels, relationships,
and final diff. Report changes, checks, and anything not verified live.
```
