# Private import readiness — Forktactics

**Verified 2026-10-30 (Pass 75):** Connected `lunarlauren/forktactics` is still **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its Cloudflare deployment.

## Latest locally verified source — Pass 75

- Local branch: `fix/guard-reset-against-stale-tabs`; commit `9e8d907eb3414d9087e09bff936e06ef2da3ff2c`.
- ZIP: `forktactics-pass-075.zip`; SHA-256 `660c91ef03c17879a624bcc59e3cf2fb9d788c544decf9936df3a4411a1102cf`.
- Patch from Pass 74: `forktactics-pass-075.patch`; SHA-256 `9e0db60a4a87d712c9dee50b9c941ff2034f5a402cae7d91b8c73e5899e4cf35`.
- Complete Git bundle: `forktactics-pass-075.git.bundle`; SHA-256 `157b168c170a341a3f559f312c5b08cd48ad049e833822d3b14cf55157cf4029`.
- Fixed a destructive stale-tab reset: the old Reset button called unconditional `saveState`, which could overwrite another tab's newer week. Reset now uses the exact saved-revision guard; on conflict it preserves in-memory data and offers backup recovery. A confirmed reset of unchanged unreadable data remains possible.
- **170/170** Node domain tests passed on the working tree, freshly extracted ZIP, independently patched Pass 74 source, and clean Git bundle clone. Strict production-domain TypeScript passed. Supplementary strict domain/test-file TypeScript passed with a **temporary Vitest API shim** (not actual Vitest). 52 TS/TSX files parsed without syntax errors. Git diff whitespace, ZIP integrity and bundle integrity checks passed.
- Matching Vitest tests added but **not executed**. Full React typecheck and build attempted but blocked by missing `vite/client`. ESLint and Vitest executables unavailable; npm registry lookup failed with `EAI_AGAIN`. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 75 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
