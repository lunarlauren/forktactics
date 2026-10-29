# Private import readiness — Forktactics

**Verified 2026-10-28:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. Do not upload application source until the repository is **private** and visibility is independently rechecked. The original `lunarlauren/YumPlan` repository and Cloudflare deployment must not be modified.

## Latest locally verified source — Pass 55

- Archive: `forktactics-pass-055.zip`; SHA-256: `c646079ca69b66b3dad6183c2f0f0c6b85eb54d99977724de36b43b3b0f579bd`
- Git bundle: `forktactics-pass-055.git.bundle`; SHA-256: `9f5f2af4da3f79388ab12bdc234ad0e817d6371da4dbdc230a91fb52dff1d6ab`
- Incremental patch from Pass 54: `forktactics-pass-055.patch`; SHA-256: `f25ec7f1b8a5947ce119aab631aaaa0b61c30564e7c1e187f52937a390592046`
- Local feature branch: `fix/canonical-discovery-recipe-ids`; commit `0e665d0`.
- Domain tests: **139/139 passed** on working tree, fresh extracted archive and independently patched Pass 54 clone. The domain test script includes strict TypeScript compilation.
- New discovery regression **failed before the fix** and passed afterward. Swipe/reset actions now reject padded, overlong or non-string recipe IDs before storing invalid preferences; valid delimiter-containing IDs still work.
- TypeScript/TSX syntax: **48 files, zero parse errors**.
- Full React typecheck, Vitest, ESLint, browser tests and production build: **NOT verified**. Project dependencies are not installed in the local environment.

## Source-free CI preparation on GitHub

- The preparation branch contains `package.json`, the lockfile generation workflow, and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`).
- GitHub Actions run [40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from the public repository. Later CI gates were skipped. **Do not treat the preparation PR as passing CI.**

## Safe import checklist

1. Change repository visibility in GitHub Settings → General → Danger Zone → Change repository visibility; verify the GitHub API reports `private`.
2. Import the verified Pass 55 source onto a **new feature branch**, never directly onto `main`. Exclude local Git metadata and build artifacts.
3. Incorporate the preparation branch's generated `package-lock.json` and confirm `npm ci` uses the locked graph.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks; investigate all failures.
5. Open a source-import PR, review changes, and merge only after required checks pass. Do not deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
