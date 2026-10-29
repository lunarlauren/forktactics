# Private import readiness — Forktactics

**Verified 2026-10-29:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. Do not upload application source until the repository is **private** and visibility is independently rechecked. The original `lunarlauren/YumPlan` repository and Cloudflare deployment must not be modified.

## Latest locally verified source — Pass 60

- Archive: `forktactics-pass-060.zip`; SHA-256: `2a5c03fe812ce767a4854edef1ce6b36159e80aa95da87b35d83d182bd1926d0`
- Git bundle: `forktactics-pass-060.git.bundle`; SHA-256: `ace349ebc81e48ce38ba3ed1e74a4df1d536f26afcc4f95257621bf39945b06a`
- Incremental patch from Pass 59: `forktactics-pass-060.patch`; SHA-256: `c84f90437b10826d99acef560434ceec144300e44d52ceaefe3c59ddbbe279ac`
- Local feature branch: `fix/planner-tiny-package-overflow`; commit `f5753a5`.
- Domain tests: **146/146 passed** on working tree, fresh extracted archive, and independently patched Pass 59 checkout. Strict domain TypeScript compilation included.
- Regression coverage: the planner now skips otherwise valid recipes whose tiny grocery package size makes package-count division overflow, preserving affordable alternatives and deterministic recipe ordering. The new Node regression failed before the fix and passed afterward. Matching Vitest test added but **not executed**.
- TypeScript/TSX syntax: **49 files, zero parse errors**.
- Full React typecheck, Vitest, ESLint, browser tests and production build are **NOT verified**: the local archive lacks installed dependencies and the GitHub-generated lockfile. A previous typecheck attempt failed due to missing local Vite type definitions (`TS2688`).

## Source-free CI preparation on GitHub

- The preparation branch contains `package.json`, lockfile generation workflow, and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`).
- GitHub Actions run [40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from the public repository. Later CI gates were skipped. **Do not treat the preparation PR as passing CI.**

## Safe import checklist

1. Change repository visibility in GitHub Settings → General → Danger Zone → Change repository visibility; verify the GitHub API reports `private`.
2. Import the verified Pass 60 source onto a **new feature branch**, never directly onto `main`. Exclude local Git metadata and build artifacts.
3. Incorporate the preparation branch's generated `package-lock.json` and confirm `npm ci` uses the locked graph.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks; investigate all failures.
5. Open a source-import PR, review changes, and merge only after required checks pass. Do not deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
