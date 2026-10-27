# Private import readiness — Forktactics

The repository currently reports **public** visibility (rechecked 2026-10-27).
Do **not** upload application source until Settings → General → Danger Zone → Change repository visibility → Private is completed.

## Latest verified local candidate
- Development pass: **43**; local commit `be48ddd` on `fix/catalog-input-boundaries`
- Source archive: `forktactics-pass-043.zip`
- SHA-256 (archive): `d84b043ed695edd200460e0c3e5a79f307adf1c318f9f68f2f1a7bf3e08942c2`
- Local Git bundle: `forktactics-pass-043.git.bundle`
- SHA-256 (bundle): `1ceb4a0e346b4b5c9048421bc8a329e2db7d849258d24805d5ba7cfb5eb5078e`
- Domain suite: **118/118 passed** on 2026-10-27, including a fresh extraction.
- Strict domain TypeScript compilation: **passed**.
- TypeScript/TSX syntax: **48 files, zero syntax errors**.
- Full React typecheck, lint, Vitest, browser tests, and production build: **NOT verified**.
- Lockfile: **missing**; npm registry/dependency installation not available in this environment.

## Pass 43 change
Direct grocery quoting now enforces the same 5,000-recipe and 10,000-product limits as import validation, and rejects malformed recipe/product/ingredient IDs before pricing. This prevents unbounded catalog processing and incidental JavaScript TypeErrors from malformed direct inputs. Two dependency-free regression tests and two corresponding Vitest cases were added.

## Safe import steps
1. Convert this repository to private. Recheck GitHub visibility.
2. Import the full source from pass 43 to a **new feature branch**, not directly to `main`. Exclude `*.tsbuildinfo`, `.domain-check/`, `node_modules/`, and `dist/`.
3. Generate and commit a reproducible `package-lock.json` using working npm registry access. Change CI to `npm ci`.
4. Run domain tests, TypeScript, ESLint, Vitest, production build, and browser checks; investigate failures before merging.
5. Review migration strategy for browser data before any Cloudflare cutover.
6. Open/review a source-code PR against `main`; merge only when checks pass.

The original `lunarlauren/YumPlan` repository and its live Cloudflare deployment must remain unchanged.
