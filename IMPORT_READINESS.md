# Private import readiness — Forktactics

**Status (2026-10-28):** The connected repository still reports **public** visibility. Do not upload application source until it is changed to **private** in Settings → General → Danger Zone → Change repository visibility.

## Latest locally verified source — Pass 49

- Archive: `forktactics-pass-049.zip`; SHA-256: `cfe4beff8b0e3c0fab3ee17a32bd8d591a419fd0eb390585f42b5bf8397af965`
- Git bundle: `forktactics-pass-049.git.bundle`; SHA-256: `fb268fcf5e764d7aa75fb29df64a57be13dbc0202df839ac357c23bcd229f84e`
- Local patch: `forktactics-pass-049.patch`; SHA-256: `896a091de0d86710bb5acfc700091231c2091170c580ae5dca7e92c0cca5eb95`
- Local feature branch: `feature/canonical-grocery-ids` (offline archive-derived working tree; local commit `f84222c`).
- Node domain tests: **131/131 passed** from a fresh extracted archive.
- Strict domain TypeScript compilation: **passed** (included in domain verification).
- TS/TSX parser: **48 files, zero syntax errors**.
- New regression failed on the original Pass 48 implementation and passed after the fix.
- Full React typecheck, Vitest, ESLint, browser tests, production build: **NOT verified**; npm registry access was unavailable.
- Dependency lockfile: **missing**; must be generated and committed before switching CI to `npm ci`.

## Pass 49 change

Direct whole-package grocery quotes now reject noncanonical recipe/product/ingredient IDs (padded, whitespace-only, >200 characters) before pricing. This prevents shopping and pantry keys changing after save/reload, while preserving delimiter-containing IDs. Earlier Pass 48 fixed package-reuse comparison overflow using `bigint`.

## Safe import plan

1. Change repository visibility to private; **verify** via GitHub metadata.
2. Import Pass 49 source onto a dedicated feature branch, not `main`. Exclude `.domain-check`, `*.tsbuildinfo` and local Git metadata.
3. Generate and commit a dependency lockfile using a working npm registry. Switch CI to `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser accessibility checks; investigate failures before merging.
5. Open a source import PR and merge only after required checks pass. Keep the existing `lunarlauren/YumPlan` repository and live Cloudflare deployment unchanged.

This is an import preparation PR, **not** a source-code PR or deployment approval.
