# Private import readiness — Forktactics

**Verified 2026-10-29:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. Do not upload application source until the repository is **private** and visibility is independently rechecked. The original `lunarlauren/YumPlan` repository and Cloudflare deployment must not be modified.

## Latest locally verified source — Pass 57

- Archive: `forktactics-pass-057.zip`; SHA-256: `cbd80eae3b696dcdadfe64a73c2b7c3bcf39d7fca19168d60e6c4b0616dab0ec`
- Git bundle: `forktactics-pass-057.git.bundle`; SHA-256: `d67a7576ad2af07fb54005c00f79634f572e06c5f4b6f4f697ff2439ee33fde9`
- Incremental patch from Pass 56: `forktactics-pass-057.patch`; SHA-256: `c2e8690bfcd39c1569d8783c0fccaac1527a92ae0ca57d237337ebc0d5c9cd26`
- Local feature branch: `fix/safe-proposal-swaps`; commit `fc37f5a`.
- Domain tests: **142/142 passed** on working tree, fresh extracted archive and independently patched Pass 56 clone. Strict domain TypeScript compilation included.
- Regression **failed before the fix**. A valid but extremely expensive personal recipe could be swapped into a proposed week, triggering grocery quote overflow during React rendering. Swaps now preflight the full quote, reject unrepresentable prices with a clear error, and leave the existing proposal intact. Normal over-budget swaps still allow review.
- TypeScript/TSX syntax: **48 files, zero parse errors**.
- Full React typecheck was attempted but **blocked** by missing local Vite type definitions (`TS2688`). Vitest, ESLint, browser tests and production build remain **NOT verified**.

## Source-free CI preparation on GitHub

- The preparation branch contains `package.json`, the lockfile generation workflow, and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`).
- GitHub Actions run [40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from the public repository. Later CI gates were skipped. **Do not treat the preparation PR as passing CI.**

## Safe import checklist

1. Change repository visibility in GitHub Settings → General → Danger Zone → Change repository visibility; verify the GitHub API reports `private`.
2. Import the verified Pass 57 source onto a **new feature branch**, never directly onto `main`. Exclude local Git metadata and build artifacts.
3. Incorporate the preparation branch's generated `package-lock.json` and confirm `npm ci` uses the locked graph.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks; investigate all failures.
5. Open a source-import PR, review changes, and merge only after required checks pass. Do not deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
