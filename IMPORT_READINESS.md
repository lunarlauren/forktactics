# Private import readiness — Forktactics

GitHub reports this repository as **public** (rechecked 2026-10-28).
**Do not upload application source** until Settings → General → Danger Zone → Change repository visibility → Private is completed.

## Latest verified local candidate

- Development pass: **47**; local commit `f9cfaff7bebe1a169229c63f8659a1e0f86aa8d3` on `fix/overflowing-combined-baskets`
- Source archive: `forktactics-pass-047.zip`
- SHA-256 (archive): `c74c7e4479daf8e12e3c1bd5c1ca3ed680b08c41e6fdb858dc10a8c3744bda24`
- Git bundle: `forktactics-pass-047.git.bundle`
- SHA-256 (bundle): `4b74b5a664e1c9a29feeb695f1dda193f2f103df70b4166eb17418b11e55e403`
- Dependency-free domain suite: **127/127 passed**, including a fresh archive extraction and independently applied patch.
- Strict domain TypeScript compilation: **passed**.
- TypeScript/TSX syntax parse: **49 files, zero syntax errors**.
- Red regressions: two combined-quote overflow cases failed before the fix (124/126 tests passed); both pass after the fix.
- Independent planner parity: **250/250** valid seeded ordinary-price scenarios matched pass 46.
- Full React typecheck, ESLint, Vitest, browser tests, production build: **not verified**.
- Dependency lockfile: **missing**; npm registry access is unavailable in this environment.

## Pass 47 change

Even if individual dinners are affordable, a combination can exceed safe integer cents. Previously a single overflowing combination aborted planning and hid other affordable weeks. The planner now skips only combinations with the two known price arithmetic overflow errors in both the main search and feasibility fallback. All other errors still fail closed. New tests cover separate-product and shared-product overflow, plus a 17-recipe beam-search case.

## Safe import steps

1. Convert this repository to **private** and recheck its visibility.
2. Import the full source from pass 47 to a **new feature branch**, not directly to `main`. Exclude `*.tsbuildinfo`, `.domain-check/`, `node_modules/`, and `dist/`.
3. Generate and commit `package-lock.json` using working npm registry access. Change CI to `npm ci`.
4. Run domain tests, full TypeScript, ESLint, Vitest, production build, and browser checks; investigate failures before merging.
5. Review browser-data migration before any Cloudflare cutover.
6. Open/review a source-code PR against `main`; merge only when required checks pass.

The original `lunarlauren/YumPlan` repository and its live Cloudflare deployment must remain unchanged.
