# YumPlan → ForkTactics: functional migration contract

## Product decision
ForkTactics is a visual and interaction redesign of YumPlan, **not** a feature-reduced rewrite. Preserve YumPlan v3.4 functionality, calculations, safety behavior, and tests. Add card collection and cooking progression without compromising planning correctness.

## Current migration status (2026-11-08)
- **Preserved in this repository:** original YumPlan planning engine and modules under `legacy-yumplan/src/`, with a starter set of original regression tests under `legacy-yumplan/tests/`.
- **Not yet integrated:** the React ForkTactics UI in `src/App.tsx` still uses its simplified planner and shopping math. Files being copied does **not** make features available in the live app.
- **Not verified:** no successful end-to-end test or production deployment is established by these commits.

## Functional parity requirements
| Domain | Required parity | Current React UI |
| --- | --- | --- |
| Dinner discovery | Yum/Yuck, menu choices distinct from must-cook nights | Partial |
| Planning | budget, servings, strategy, must-have vs optional, feasible alternatives | Simplified, not equivalent |
| Groceries | package rounding, substitutions, basket comparison, prices frozen per purchased week | Simplified, not equivalent |
| Shopping | recorded acquisitions vs planned purchases, corrections, history, partial shopping | Missing |
| Tonight | show feasible available choices; forecast effects before committing to cook | Browsable catalog only |
| Midweek | recipe swaps, cooking forecast, recovery shopping, no unintended mutations | Missing |
| Continuity | reuse week, archive, transitions, backups, import validation, recovery | Mostly missing |
| Safety | corrupt-data recovery, stale-tab protection, no accidental overwrite | Missing |
| Mobile/offline | accessibility, PWA, offline behavior, responsive UI | Needs parity testing |
| Collection | card art, first cook gift, holo progression | ForkTactics addition |

## Implementation order
1. Preserve the rest of the original modules and regression tests, and run them unchanged.
2. Create a typed adapter mapping the YumPlan catalog, price book, and weekly plan to React UI models. Do not silently merge old localStorage schemas.
3. Replace ForkTactics' `shuffle`, basket and price calculations with tested engine calls.
4. Distinguish menu options, must-have dinners, acquired groceries, and remaining nights in app state.
5. Wire Tonight to actual cookability and read-only cooking consequences; require explicit confirmation to cook.
6. Port shopping, recovery, week history, backup import/validation, and safety mechanisms.
7. Test both migration from prior ForkTactics data and YumPlan backup import; never erase saved data without explicit consent.
8. Validate production build and mobile behavior before claiming parity.

## Non-negotiable invariants
- Viewing a recipe never commits dinner, purchases groceries, or records cooking.
- Yuck excludes auto-generated selections but does not retroactively corrupt an existing purchased week.
- Optional menu recipes are not all charged to the grocery basket.
- Recorded purchases, not hypothetical shopping items, determine actual cookability.
- Editing future prices does not rewrite a purchased week's price snapshot.
- User data is never silently discarded or reset.
