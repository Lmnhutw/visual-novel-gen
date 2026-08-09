---
target: writer studio UX/UI review
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 4
timestamp: 2026-08-09T15-33-14Z
slug: components-workspace-studio-writer-studio-tsx
---
Method: dual-agent (A: /root/ux_design_assessment · B: /root/technical_ui_assessment)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Job state and progress are visible; workspace failure messaging is not actionable. |
| 2 | Match between system and real world | 3 | Writer-native language, but content rating and canon visibility are bundled together. |
| 3 | User control and freedom | 2 | Cancel and edit exist, but context cannot be reviewed before generation and acceptance is not clearly reversible. |
| 4 | Consistency and standards | 3 | Surface patterns are consistent; prose acceptance and canon acceptance look too similar. |
| 5 | Error prevention | 2 | Mature eligibility and acceptance consequences are not clear enough before action. |
| 6 | Recognition rather than recall | 2 | Run identity and generation context are too generic after work accumulates. |
| 7 | Flexibility and efficiency | 1 | No visible keyboard shortcuts, quick navigation, filtering, or batch review. |
| 8 | Aesthetic and minimalist design | 4 | Calm editorial hierarchy and warm manuscript surface are distinctive and restrained. |
| 9 | Help users recover from errors | 2 | Errors surface, but recovery paths are sparse. |
| 10 | Help and documentation | 2 | Guardrail copy exists, but first-run and canon-review guidance are missing. |
| **Total** | | **24/40** | Promising editorial studio; primary workflow needs explicit guidance and trust controls. |

## Design Specificity Verdict

The interface feels authored for a visual-novel editor rather than interchangeable dashboard software. The graphite shell and warm-paper draft area give the writer a useful mode shift. The main weakness is structural: the experience is a set of capable panels, not one guided editorial journey.

The deterministic detector returned zero findings for `writer-studio.tsx`. Manual technical inspection nevertheless found modal focus-management gaps, missing focus-visible replacements, progress semantics, reduced-motion omissions, small mobile targets, and user-visible mojibake. These findings are outside the detector's narrow pattern coverage.

## Overall Impression

The visual world is strong. The highest-value improvement is to make Inkwell tell a new writer what to do next, show exactly what context will be sent before generation, and make draft versus canon decisions visibly distinct.

## What's Working

- Drafts are visually treated as prose rather than dashboard data; the manuscript surface is the right anchor.
- Generation is presented as recoverable work with status, progress, and cancellation.
- The product correctly distinguishes provisional draft prose from approved canon.

## Priority Issues

### P0 — No next-best action for a new writer

The Studio opens into a broad scene-brief form while cast and chapters live elsewhere. An empty cast prompt does not take the user to the next setup step. Replace the blank-state experience with a four-step readiness checklist: story premise, one or two characters, chapter/scene anchor, and scene brief. Each item must deep-link to its action and show completion; collapse it after the first ready generation.

### P0 — Context is promised as inspectable but is not inspectable before generation

The writer needs to trust the facts sent to the model. Add a pre-generation “Context to send” drawer that shows character state, retrieved memories, active threads, secret inclusion, and exclusions. Allow pinning/removing individual facts before running generation.

### P1 — Draft acceptance and canon approval are ambiguous high-consequence decisions

Replace the adjacent Save/Accept actions with an explicit sequence: Edit draft → Accept prose → Review N proposed facts. Proposal rows need affected entity, before/after values, source excerpt, confidence/rationale, and a reversible decision path.

### P1 — Long-session orientation weakens as generation history grows

Recent runs are generic stage/date rows. Turn this into descriptive run history: scene brief title, chapter, cast, result state, and filters for draft, reviewed, and failed. Preserve the selected run across navigation.

### P1 — Content safety, secret scope, and eligibility are compressed into toggles

Separate content rating from canon visibility. Before the action, show a plain-language eligibility summary such as “2 selected characters; 1 requires adult confirmation,” plus a direct repair action.

### P1 — Modal and keyboard accessibility require a baseline repair

The custom dialogs need focus trapping, Escape-to-close, focus restoration, and consistent dialog semantics. Restore visible `focus-visible` styles. Give generation progress a `progressbar` role and values, respect reduced-motion preferences, and raise primary mobile touch targets toward 44px.

## Persona Red Flags

- **First-time writer:** faces a large brief form before understanding which setup is required; unfamiliar canon and secrecy controls appear too early.
- **Long-session author:** cannot reliably rediscover a prior generation by scene/chapter/cast, or see what changed since the previous session.
- **Keyboard/power user:** no shortcut or quick-navigation system is visible, and modal focus can escape into background content.

## Minor Observations

- The mobile `Menu` icon implies a drawer but does not open one.
- Fix literal encoding artifacts such as “Loading workspaceâ€¦” and “words Â·”.
- Link continuity issues to the affected draft, chapter, or character so the ledger is actionable.

## Questions to Consider

- Should the default screen be “continue this story” rather than an always-open generation form?
- What proof must a writer see before trusting AI context enough to generate prose?
- Should accepting prose and accepting canon ever happen in the same step?
