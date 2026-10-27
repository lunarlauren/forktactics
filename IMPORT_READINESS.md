# Private import readiness — Forktactics

The repository currently reports **public** visibility (rechecked 2026-10-27).
**Do not upload application source** until Settings → General → Danger Zone → Change repository visibility → Private is completed.

## Latest verified local candidate
- Development pass: **44**; local commit `f2987cb75c609f9d0f150d28b0da7dc911a6f725` on `fix/deterministic-grocery-quantities`
- Source archive: `forktactics-pass-044.zip`
- SHA-256 (archive): `1fab7d2c7639d55a4bad549e659c5cdee448f58ac9cd7c93dd13da1fcee1a07f`
- Local Git bundle: `forktactics-pass-044.git.bundle`
- SHA-256 (bundle): `fc8312692c7895490a4b369c4e1a37180aedaae156113e167c514c43c7978412`
- Domain suite: **119/119 passed**, including a fresh extraction on 2026-10-27.
- Order-invariance check: **3,000 reordered quotes matched** across 250 seeded catalogs.
- Strict domain TypeScript compilation: **passed**.
- TypeScript/TSX syntax: **48 files, zero syntax errors**.
- Full React typecheck, lint, Vitest, browser tests, and production build: **NOT verified**.
- Lockfile: **missing**; npm registry returned `EAI_AGAIN` in this environment.

## Pass 44 change
`quoteBasket` previously accumulated floating-point ingredient requirements in recipe order, so rearranging the same dinners could alter displayed quantities and leftovers. Contributions are now summed in a canonical, order-independent sequence. The new regression test failed before the fix and passed afterward; a corresponding Vitest test is included but not yet executed.

## Safe import steps
1. Convert this repository to **private** and recheck its visibility.
2. Import the full source from pass 44 to a **new feature branch**, not directly to `main`. Exclude `*.tsbuildinfo`, `.domain-check/`, `node_modules/`, and `dist/`.
3. Generate and commit a reproducible `package-lock.json` with working npm registry access. Change CI to `npm ci`.
4. Run domain tests, full TypeScript, ESLint, Vitest, production build, and browser checks; investigate failures before merging.
5. Review browser-data migration before any Cloudflare cutover.
6. Open/review a source-code PR against `main`; merge only when all required checks pass.

The original `lunarlauren/YumPlan` repository and its live Cloudflare deployment must remain unchanged.
