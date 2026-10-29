# Private import readiness — Forktactics

**Verified 2026-10-28:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. Do not upload application source until the repository is **private** and visibility is independently rechecked. The original `lunarlauren/YumPlan` repository and Cloudflare deployment must not be modified.

## Latest locally verified source — Pass 56

- Archive: `forktactics-pass-056.zip`; SHA-256: `c9d810ac2374c0d9a3de47ee7131dd6e9e951318ee820ab1c3cdcf555b4cec7c`
- Git bundle: `forktactics-pass-056.git.bundle`; SHA-256: `239f6ab58ab09516dbcf11c23100a6f2eab6a41bbf39e333e271ff7e83d674f4`
- Incremental patch from Pass 55: `forktactics-pass-056.patch`; SHA-256: `c226288fa97c36b6029c6c375e8e2c06580b9b1550d5dee7bdc113124a12d83b`
- Local feature branch: `fix/reject-noncanonical-import-ids`; commit `1bec392`.
- Domain tests: **141/141 passed** on working tree, fresh extracted archive and independently patched Pass 55 clone. Strict domain TypeScript compilation included.
- Regression **failed before the fix**. Catalog imports and backup restores now reject padded durable recipe/product/ingredient IDs rather than silently renaming them. Display labels still trim; valid delimiter-containing IDs still work.
- Valid-catalog parity: **300/300 matched Pass 55**.
- TypeScript/TSX syntax: **48 files, zero parse errors**.
- Full React typecheck and build were attempted but **blocked** by missing local Vite type definitions (`TS2688`). Vitest, ESLint, browser tests and production build remain **NOT verified**.

## Source-free CI preparation on GitHub

- The preparation branch contains `package.json`, the lockfile generation workflow, and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`).
- GitHub Actions run [40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from the public repository. Later CI gates were skipped. **Do not treat the preparation PR as passing CI.**

## Safe import checklist

1. Change repository visibility in GitHub Settings → General → Danger Zone → Change repository visibility; verify the GitHub API reports `private`.
2. Import the verified Pass 56 source onto a **new feature branch**, never directly onto `main`. Exclude local Git metadata and build artifacts.
3. Incorporate the preparation branch's generated `package-lock.json` and confirm `npm ci` uses the locked graph.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks; investigate all failures.
5. Open a source-import PR, review changes, and merge only after required checks pass. Do not deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
