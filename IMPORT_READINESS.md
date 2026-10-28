# Private import readiness — Forktactics

GitHub reports this repository as **public** (rechecked 2026-10-28).
**Do not upload application source** until Settings → General → Danger Zone → Change repository visibility → Private is completed.

## Latest verified local candidate

- Development pass: **48**; local commit `c55e29c71d8dc31fe8349b763f7920388c78f1e8` on `fix/overflowing-reuse-estimates`
- Source archive: `forktactics-pass-048.zip`
- SHA-256 (archive): `0a1219de8d46cabb86b75d60320d5eec248fd57314f2ee80e9deafd28740c232`
- Git bundle: `forktactics-pass-048.git.bundle`
- SHA-256 (bundle): `d8d9dd801c7f68660b4279b4589140001e99e5af086dc73963680b37091bb60f`
- Dependency-free domain suite: **130/130 passed**, including a fresh archive extraction and independently applied patch.
- Strict domain TypeScript compilation: **passed**.
- TypeScript/TSX syntax parse: **48 files, zero syntax errors**.
- Red regressions: two separate-purchase overflow cases failed before the fix (126/128 tests passed); all passed after the fix.
- Independent parity: **300/300** seeded ordinary-price planning and package-reuse comparisons matched pass 47.
- Full React typecheck, ESLint, Vitest, browser tests, production build: **not verified**.
- Dependency lockfile: **missing**; npm registry returned `EAI_AGAIN` on 2026-10-28.

## Pass 48 change

A valid consolidated grocery basket can be affordable even when hypothetical separate package purchases exceed JavaScript's maximum safe integer. Previously, the planner or reuse-comparison UI could throw and hide the valid week. Internal reuse ranking now uses exact `bigint` cents; unrepresentable comparison figures are returned as `null` and explained in the UI, rather than crashing or displaying rounded money. Actual basket prices and budget checks remain safe integer cents. New tests cover exact search, 17-recipe beam search, and unavailable comparison values.

## Safe import steps

1. Convert this repository to **private** and recheck its visibility.
2. Import the full source from pass 48 to a **new feature branch**, not directly to `main`. Exclude `*.tsbuildinfo`, `.domain-check/`, `node_modules/`, and `dist/`.
3. Generate and commit `package-lock.json` using working npm registry access. Change CI to `npm ci`.
4. Run domain tests, full TypeScript, ESLint, Vitest, production build, and browser checks; investigate failures before merging.
5. Review browser-data migration before any Cloudflare cutover.
6. Open/review a source-code PR against `main`; merge only when required checks pass.

The original `lunarlauren/YumPlan` repository and its live Cloudflare deployment must remain unchanged.
