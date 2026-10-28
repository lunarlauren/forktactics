# Private import readiness — Forktactics

**Status (2026-10-28):** The connected repository reports **public** visibility. Do not upload application source until it is changed to **private** in Settings → General → Danger Zone → Change repository visibility.

## Latest locally verified source — Pass 50

- Archive: `forktactics-pass-050.zip`; SHA-256: `428525290fa7d931e2de9c9fde5da6848e94231a168b922a8a9304efe3980f2c`
- Git bundle: `forktactics-pass-050.git.bundle`; SHA-256: `3d885ce0d5ae32593f4ae748065bde8ba5bb37366457980e5063904f9525382b`
- Incremental patch: `forktactics-pass-050.patch`; SHA-256: `d241f677ecf367c7eefdcb3096a6e6c28a74ad798256b5fba8ecec8abc946df3`
- Local feature branch: `fix/pantry-package-overflow`; commit `a0df46262a0295c7bc9d598657351ca9576c7d1f`.
- Node domain tests: **132/132 passed** from a fresh extracted archive, and from a separately applied incremental patch.
- Strict domain TypeScript compilation: **passed** (included in domain verification).
- TS/TSX parser: **48 files, zero syntax errors**.
- New regression failed on original Pass 49 source and passed after fix.
- Full React typecheck, Vitest, ESLint, browser tests, production build: **NOT verified**; npm registry resolution returned `EAI_AGAIN`.
- Dependency lockfile: **missing**; must be generated and committed before switching CI to `npm ci`.

## Pass 50 change

The whole-package quote no longer calculates purchase counts for ingredients marked **Have it**. Previously, a valid but extremely small package quantity could overflow division and prevent even a zero-dollar pantry-covered dinner from being planned. Purchase count overflow still fails closed for **Need it** ingredients.

## Safe import plan

1. Change repository visibility to private; **verify** via GitHub metadata.
2. Import Pass 50 source onto a dedicated feature branch, not `main`. Exclude `.domain-check`, `*.tsbuildinfo`, and local Git metadata.
3. Generate and commit a dependency lockfile using a working npm registry. Switch CI to `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser accessibility checks; investigate failures before merging.
5. Open a source import PR and merge only after required checks pass. Keep the existing `lunarlauren/YumPlan` repository and live Cloudflare deployment unchanged.

This is an import preparation PR, **not** a source-code PR or deployment approval.
