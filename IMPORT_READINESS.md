# Private import readiness — Forktactics

**Verified 2026-10-29:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. Do not upload application source until the repository is **private** and visibility is independently rechecked. The original `lunarlauren/YumPlan` repository and Cloudflare deployment must not be modified.

## Latest locally verified source — Pass 59

- Archive: `forktactics-pass-059.zip`; SHA-256: `52804dbbf3bb62b78dd502c8b3400f5e5b8c2d76372d2d13219450feaff513e2`
- Git bundle: `forktactics-pass-059.git.bundle`; SHA-256: `9d17cde8bec5d3b2120b7bda774e48503369d90aa82ac7efc27d5f90a66ba041`
- Incremental patch from Pass 58: `forktactics-pass-059.patch`; SHA-256: `c5346d642ba36df7e5811acabfec9e01149a3f3a4e5606dd23a7334aa65b3285`
- Local feature branch: `fix/safe-planner-regression`; commit `134a288`.
- Domain tests: **145/145 passed** on working tree, fresh extracted archive, and independently patched Pass 58 checkout. Strict domain TypeScript compilation included.
- Regression coverage: cooked dinners now serialize in available-card order regardless of toggle order; week cards reject padded/overlong IDs, non-array input, and nonboolean cooked updates. Both new Node tests failed before the fix and passed afterward. Matching Vitest tests added but **not executed**.
- TypeScript/TSX syntax: **48 files, zero parse errors**.
- Full React typecheck attempted but **blocked** by missing local Vite type definitions (`TS2688`). The source archive lacks the existing GitHub-generated lockfile, so local `npm ci` remains unavailable. Vitest, ESLint, browser tests and production build are **NOT verified**.

## Source-free CI preparation on GitHub

- The preparation branch contains `package.json`, lockfile generation workflow, and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`).
- GitHub Actions run [40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from the public repository. Later CI gates were skipped. **Do not treat the preparation PR as passing CI.**

## Safe import checklist

1. Change repository visibility in GitHub Settings → General → Danger Zone → Change repository visibility; verify the GitHub API reports `private`.
2. Import the verified Pass 59 source onto a **new feature branch**, never directly onto `main`. Exclude local Git metadata and build artifacts.
3. Incorporate the preparation branch's generated `package-lock.json` and confirm `npm ci` uses the locked graph.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks; investigate all failures.
5. Open a source-import PR, review changes, and merge only after required checks pass. Do not deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
