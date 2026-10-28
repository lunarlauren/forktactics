# Private import readiness — Forktactics

GitHub reports this repository as **public** (rechecked 2026-10-27).
**Do not upload application source** until Settings → General → Danger Zone → Change repository visibility → Private is completed.

## Latest verified local candidate

- Development pass: **46**; local commit `b0cd659aa80becb1d41121343ee16855dc108080` on `fix/skip-unaffordable-standalone-overflow`
- Source archive: `forktactics-pass-046.zip`
- SHA-256 (archive): `1141cbcca32e303bd95b5b40df60252b0087d9ac732016a43fe89f958e6a1322`
- Git bundle: `forktactics-pass-046.git.bundle`
- SHA-256 (bundle): `947c4432d636ee207562e92524879eaf514f85cf9491c17697c1fe552f8f4398`
- Dependency-free domain suite: **124/124 passed**, including a fresh archive extraction.
- Strict domain TypeScript compilation: **passed**.
- TypeScript/TSX syntax parse: **49 files, zero syntax errors**.
- Red regression: a Yucked expensive recipe failed with price overflow before the fix.
- Independent planner parity: **150/150** valid seeded scenarios matched the previous candidate.
- Full React typecheck, ESLint, Vitest, browser tests, production build: **not verified**.
- Dependency lockfile: **missing**; npm registry access is unavailable in this environment.

## Pass 46 change

The planner previously calculated standalone package prices for *all* recipes, including Yucked ones. A valid but extremely expensive recipe could overflow safe integer cents and abort the entire suggestion even when an affordable dinner was available. The planner now validates the **entire catalog** before filtering, prices only eligible recipes, and treats the specific safe-integer quote overflow as unaffordable rather than fatal. All other validation errors still fail closed.

## Safe import steps

1. Convert this repository to **private** and recheck its visibility.
2. Import the full source from pass 46 to a **new feature branch**, not directly to `main`. Exclude `*.tsbuildinfo`, `.domain-check/`, `node_modules/`, and `dist/`.
3. Generate and commit `package-lock.json` using working npm registry access. Change CI to `npm ci`.
4. Run domain tests, full TypeScript, ESLint, Vitest, production build, and browser checks; investigate failures before merging.
5. Review browser-data migration before any Cloudflare cutover.
6. Open/review a source-code PR against `main`; merge only when required checks pass.

The original `lunarlauren/YumPlan` repository and its live Cloudflare deployment must remain unchanged.
