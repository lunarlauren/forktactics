# Private import readiness — Forktactics

**Verified 2026-10-29:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. Do not upload application source until the repository is **private** and visibility is independently rechecked. The original `lunarlauren/YumPlan` repository and Cloudflare deployment must not be modified.

## Latest locally verified source — Pass 58

- Archive: `forktactics-pass-058.zip`; SHA-256: `ccb400b8c82940f2065b0424ef0cd0e3dd1f9a0eff00feab03fc2ce7f4047f78`
- Git bundle: `forktactics-pass-058.git.bundle`; SHA-256: `680c561a3f57959da03a2355220bcc89c04c9ecde4e85d8698952e54a1948b2b`
- Incremental patch from Pass 56: `forktactics-pass-058.patch`; SHA-256: `cde2a4b273742b31a4a7033b8a128811fe50d5a509d61f9c995fd44d03000d5f`
- Local feature branch: `fix/safe-pantry-toggles`; commit `64c128e`.
- Domain tests: **143/143 passed** on working tree, fresh extracted archive and independently patched Pass 56 clone. Strict domain TypeScript compilation included.
- Regression coverage: toggling a pantry-covered ingredient to `Need it` could make a previously quotable confirmed or proposed menu overflow during React rendering. A new domain action now preflights both selected baskets, rejects unsafe quotes without changing state, and shows an actionable error. Ordinary over-budget changes remain reviewable. One new Node regression passed; two matching Vitest cases were added but Vitest itself is not yet verified.
- TypeScript/TSX syntax: **49 files, zero parse errors**.
- Full React typecheck was attempted but **blocked** by missing local Vite type definitions (`TS2688`). `npm ci` on the local source archive is blocked by the absent lockfile; the lockfile is already on the GitHub preparation branch. Vitest, ESLint, browser tests and production build remain **NOT verified**.

## Source-free CI preparation on GitHub

- The preparation branch contains `package.json`, the lockfile generation workflow, and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`).
- GitHub Actions run [40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from the public repository. Later CI gates were skipped. **Do not treat the preparation PR as passing CI.**

## Safe import checklist

1. Change repository visibility in GitHub Settings → General → Danger Zone → Change repository visibility; verify the GitHub API reports `private`.
2. Import the verified Pass 58 source onto a **new feature branch**, never directly onto `main`. Exclude local Git metadata and build artifacts.
3. Incorporate the preparation branch's generated `package-lock.json` and confirm `npm ci` uses the locked graph.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks; investigate all failures.
5. Open a source-import PR, review changes, and merge only after required checks pass. Do not deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
