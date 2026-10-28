# Private import readiness — Forktactics

**Status (2026-10-28):** The connected repository reports **public** visibility. Do not upload application source until it is changed to **private** in Settings → General → Danger Zone → Change repository visibility.

## Latest locally verified source — Pass 51

- Archive: `forktactics-pass-051.zip`; SHA-256: `92d6b2b9235cd90b97b7f6eb1c6fe0ddd5e46774e588344696fe22053a189c29`
- Git bundle: `forktactics-pass-051.git.bundle`; SHA-256: `4a536682a1b1450c4902aed684df8c73e59f5efdb805c3695cc28049e856118e`
- Incremental patch: `forktactics-pass-051.patch`; SHA-256: `e9d8ca0440b1a3ab82bc41cf65117ab56be4151428e7ba6fd03f372ce6a8f844`
- Local feature branch: `fix/canonical-preference-ids`; commit `eaab64d6dca0d9643e0e30702c222f2ce5274c3f`.
- Node domain tests: **133/133 passed** from a fresh extracted archive, including strict domain TypeScript compilation.
- New regression **failed before fix** and passed afterward.
- TS/TSX parser: **49 files, zero syntax errors**.
- CI YAML: parsed and checked for lockfile requirement, read-only permissions, locked installation and all quality gates.
- Full React typecheck, Vitest, ESLint, browser tests and production build: **NOT verified**; npm registry returned `EAI_AGAIN`.
- Dependency lockfile: **missing**; must be generated and committed before CI can pass.

## Pass 51 changes

- The direct weekly planner now rejects padded or overlong preference IDs instead of silently ignoring an invalid Yuck. Canonical IDs from previous weeks remain supported.
- A **source-free CI workflow** has been added to this import-preparation branch at `.github/workflows/ci.yml`. It explicitly requires `package-lock.json`, runs `npm ci`, domain tests, full TypeScript, ESLint, Vitest and the production build.
- **CI is not green**: the source and lockfile are deliberately absent from this public repository. Do not merge this draft PR as a production-ready change.

## Safe import plan

1. Change repository visibility to private; **verify** via GitHub metadata.
2. Import Pass 51 source onto a dedicated feature branch, not `main`. Exclude `.domain-check`, `*.tsbuildinfo`, and local Git metadata.
3. Generate and commit `package-lock.json` using a working npm registry.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser accessibility checks; investigate failures before merging.
5. Open a source import PR and merge only after required checks pass. Keep the existing `lunarlauren/YumPlan` repository and live Cloudflare deployment unchanged.

This is an import preparation PR, **not** a source-code PR or deployment approval.
