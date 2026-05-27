# State Management

The MVP uses simple state ownership.

## Rules

- Use local React state for editor controls and temporary form values.
- Use server responses for canonical data.
- Do not add a global state library until multiple screens need shared client state.
- Do not duplicate database-derived state in long-lived client stores.
- Persist story truth through API calls, not browser state.

## Current UI State

- active workspace tab
- story id input
- scene goal input
- maturity mode
- draft output
- context preview
- continuity warnings
- loading and error state

