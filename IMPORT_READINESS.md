# Private import readiness — Forktactics

**Verified 2026-10-31 (Pass 77):** Connected `lunarlauren/forktactics` remains **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 77

- Local feature branch: `fix/exact-large-currency-display`; commit `ad043c305d6532e5c56723f49d4876ddb26c5e17`.
- ZIP: `forktactics-pass-077.zip`; SHA-256 `073c5fda5890eba6864031184e28b426db5ce3cd446b07c689486d630f8cb9e6`.
- Patch from Pass 76: `forktactics-pass-077.patch`; SHA-256 `923d988be39cefa57b9aa327000c84f37cb990f04daf10895636562d089bc434`.
- Complete Git bundle: `forktactics-pass-077.git.bundle`; SHA-256 `9ad596e9d721182a320d18f30b9c64a477eab2d0b4dd4a79119820b26b8bc28b`.
- Shared integer-cents UI formatter now preserves exact cents even for large valid whole-package grocery totals; the previous floating-dollar formatting lost pennies at high amounts. Both app-wide and grocery-board price labels use the pure helper. Existing CSV export was already exact and remains unchanged.
- **172/172 Node domain tests passed** on working tree, freshly extracted ZIP, independently patched Pass 76 source, and clean Git bundle clone. New regression **failed before the fix** (`.90` displayed instead of `.91`). Strict production-domain TypeScript passed. New test-file TypeScript passed with a temporary Vitest API shim (**not actual Vitest**). **55 TS/TSX files** parsed with zero syntax errors. Patched and bundled Git trees match the source tree; Git diff, ZIP, and bundle integrity checks passed.
- Matching Vitest tests added **but not run**. Full React typecheck and build attempted but blocked by missing `vite/client`; ESLint and Vitest executables missing. `npm ci` cannot run from the local archive because the lockfile is on GitHub's preparation branch; npm registry DNS ping also failed with `EAI_AGAIN`. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 77 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
