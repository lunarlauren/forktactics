# Private import readiness — Forktactics

GitHub reports this repository as **public** (rechecked 2026-10-27).
**Do not upload application source** until Settings → General → Danger Zone → Change repository visibility → Private is completed.

## Latest verified local candidate

- Development pass: **45**; local commit `6e2d600dc300b29c3cfca621444c4439479b79aa` on `fix/planner-malformed-catalog-boundary`
- Source archive: `forktactics-pass-045.zip`
- SHA-256 (archive): `6eeece9c6cb26f58c430deee6302259b09fe579855c8b49f4433c450947da96f`
- Git bundle: `forktactics-pass-045.git.bundle`
- SHA-256 (bundle): `03ac0b49610078a78c39e5f8c44754721d0d8fb6bb954b67054e862a8832ad72`
- Zero-dependency domain suite: **121/121 passed** on 2026-10-27, including a fresh archive extraction.
- Strict domain TypeScript compilation: **passed**.
- TypeScript/TSX syntax parse: **48 files, zero syntax errors**.
- New regression tests: **2 failed before the fix and passed afterward**.
- Full React typecheck, ESLint, Vitest, browser tests, production build: **not verified**.
- Dependency lockfile: **missing**; npm registry access is unavailable in this environment.

## Pass 45 change

The direct `suggestWeek` entry point previously accessed `recipe.id.trim()` before verifying the catalog shape. Invalid JSON-like input could throw a raw TypeError. It now validates the array size and recipe ID types before iterating and computing standalone quotes. Existing planning and grocery behavior remains unchanged for valid inputs.

## Safe import steps

1. Convert this repository to **private** and recheck its visibility.
2. Import the full source from pass 45 to a **new feature branch**, not directly to `main`. Exclude `*.tsbuildinfo`, `.domain-check/`, `node_modules/`, and `dist/`.
3. Generate and commit `package-lock.json` using working npm registry access. Change CI to `npm ci`.
4. Run domain tests, full TypeScript, ESLint, Vitest, production build, and browser checks; investigate failures before merging.
5. Review browser-data migration before any Cloudflare cutover.
6. Open/review a source-code PR against `main`; merge only when required checks pass.

The original `lunarlauren/YumPlan` repository and its live Cloudflare deployment must remain unchanged.
