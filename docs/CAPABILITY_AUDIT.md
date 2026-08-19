# Capability Audit

This audit maps the proposed AI-storytelling stack to the current Inkwell
modular monolith. The rule is to strengthen existing seams before adding new
infrastructure.

## Decision Matrix

| Capability | Decision | Current implementation / next boundary |
|---|---|---|
| Story planning | Improve incrementally | Premise maps to `Story.description`; arcs to `PlotThread`; chapters to `Chapter`; scene direction and beats to persisted generation-job input; prose to `DraftVersion`. Dedicated arc/beat tables are deferred until reordering, dependency tracking, or multi-scene beat editing is required. |
| Story state | Keep | Relational character states, relationships/history, events, lore, secrets, knowledge tracking, and plot threads already model durable canon. Inventory should be added as a typed domain only when product workflows need item ownership/history; do not hide it in a generic graph. |
| Memory management | Keep and harden | Transient request/context is working memory; `Event`/`Memory` are episodic; optional pgvector supplies semantic recall; character-linked memories and plot threads cover character/narrative memory. Draft extraction remains proposal-first. |
| RAG / retrieval | Improve now | Relational-first and optional vector ranking already exist. Token-budget admission and retrieval logs now make context bounded and inspectable. |
| Character engine | Improve now | Profiles already hold personality, motivations, speech, boundaries, current state, and arc. Prompt context now carries these fields instead of only a personality summary. |
| Knowledge graph | Do not add a graph database | Existing typed relational edges cover characters, locations through state/events, relationships, secrets, and knowledge. Add explicit tables only for proven query patterns; Neo4j or a generic triples layer would duplicate truth and operations. |
| Context engine | Improve now | A deterministic 1,000–20,000 token budget preserves selected characters and admits lower-priority records in documented order. Preview exposes the estimate and omissions. |
| Consistency engine | Keep and harden | Deterministic rules remain authoritative; LLM review uses schema-validated structured output and a task-specific evaluation model. P0/P1 results route the job to continuity review rather than silently completing. |
| Memory extraction | Keep and harden | Structured extraction already proposes events, memories, relationship/state/secret/lore/thread changes. Invalid structured output gets one bounded retry; no proposal becomes canon without review. |
| AI orchestrator | Keep as a persisted workflow | `GenerationJob` + worker already cover intake, retrieval, writing, validation, extraction, cancellation, retry-safe claim, audit, and review. Automatic rewriting is intentionally deferred: the writer owns the draft and continuity findings can be ambiguous. |
| Structured output | Keep and centralize | Continuity and extraction share one JSON-object parser, Zod validation, and a bounded schema retry. Prose remains plain text by design. |
| Model routing | Add minimally | `GENERATION_MODEL`, `EVALUATION_MODEL`, and `EXTRACTION_MODEL` provide role routing. Missing role models fall back to generation, so existing deployments are unchanged. |
| Caching | Do not add yet | Canon and relationship state change frequently, and stale context is more harmful than a saved query. Add request-scoped deduplication or a short-lived cache only after traces show repeated identical retrieval within one workflow. |
| Evaluation | Improve now | Continuity severities produce a deterministic pass/review/rewrite recommendation recorded in draft metadata and the audit log. Human review remains the policy boundary. |
| Cost / latency | Improve observability first | Generation runs already store prompt/completion/total tokens; jobs store start/end timestamps. The Studio now displays token use, model, and elapsed time. Monetary estimates are deferred because provider/model pricing is external and time-varying. |

## Architecture Recommendation

Stay with the current Next.js + TypeScript + Prisma modular monolith. PostgreSQL
is the correct source of truth; pgvector remains an optional adapter, not the
canon model. Do not introduce Go/pgx, Python services, a graph database, Redis,
or microservices until an observed workload or ownership boundary requires one.

The intended workflow is:

```text
Human plan/brief
  -> persisted job
  -> bounded retrieval
  -> prompt/writer model
  -> deterministic + structured continuity evaluation
  -> review or rewrite recommendation
  -> structured canon proposals
  -> human acceptance
  -> canonical memory/state update
```

The next schema expansion should be evidence-led. Add dedicated `StoryArc` and
`SceneBeat` records only when the UI needs ordering, dependencies, status, or
cross-chapter navigation that `PlotThread`, `Chapter`, and persisted briefs
cannot express cleanly.
