# Private import readiness — Forktactics

**Verified 2026-10-30 (Pass 67):** The connected `lunarlauren/forktactics` repository still reports **public** visibility. **Do not upload application source** until it is private and that visibility is independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 67

- Local branch: `fix/guard-personal-ingredient-save-size`; commit `383e47d62e520324ee322dc13f9018991f9d1978`.
- ZIP: `forktactics-pass-067.zip`; SHA-256 `eb61da6f8e90e1b04caffee38f8c3c99683ee7899477c0af254e46ded27b28bf`.
- Patch from Pass 66: `forktactics-pass-067.patch`; SHA-256 `e897625da2b1efabd8ae1f30991e6d03141ae140d35e5561f8963bd0e9f59c08`.
- Complete Git bundle: `forktactics-pass-067.git.bundle`; SHA-256 `ead14de0405fd3b77110d750e661988b8ec647e899e7572ee42f4561fbc4faa1`.
- Personal ingredient additions and edits now preflight the entire serialized state against the shared 500 KB browser-save/backup limit before accepting a change. Rejected edits preserve the original state; small edits remain allowed.
- **156/156** Node domain tests passed with strict domain TypeScript compilation on the working tree, freshly extracted ZIP, independently patched Pass 66 archive, and clean bundle clone. The new regression failed before the fix (155 passed, 1 failed). 50 TS/TSX files (including Vite config) transpiled with zero syntax errors.
- Matching Vitest regression added but **not executed**.
- Full React typecheck and production build were attempted but blocked by missing `vite/client` dependencies. ESLint and Vitest were attempted but their executables were missing. `npm ping` failed with `EAI_AGAIN` (registry DNS unavailable). Browser/accessibility checks are **not verified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility. Recheck with the GitHub API.
2. Import Pass 67 source onto a **new feature branch** rather than directly onto `main`; exclude local Git metadata, build artifacts and secrets.
3. Incorporate the preparation branch's generated `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks. Fix all failures.
5. Open a source-import PR and merge only when required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
