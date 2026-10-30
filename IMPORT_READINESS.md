# Private import readiness — Forktactics

**Verified 2026-10-29:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. **Do not upload application source** until it is private and that visibility is independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 64

- Local branch: `fix/safe-serving-edits`; commit `4fa20a3b5fb92f4b5c2a66cca935e774f6ddff80`.
- ZIP: `forktactics-pass-064.zip`; SHA-256 `4e4b7aac18dc19d07d223d3cc2999576e9cc3c4696c65a14453f828570f91eb7`.
- Patch from Pass 63: `forktactics-pass-064.patch`; SHA-256 `ac4621ba8c731adf1a11e7a5873205dafff13de2e9e44e4c9f33311f98dcf752`.
- Complete Git bundle: `forktactics-pass-064.git.bundle`; SHA-256 `9e8102bc3b76de862bcd5c2801e37155b0fa1f87f90d3beeff6aec90d2b29ebe`.
- Changing the serving count now preflights the retained confirmed grocery basket before updating state. Unquotable changes are rejected with actionable feedback; representable over-budget changes remain reviewable.
- **153/153** Node domain tests passed with strict domain TypeScript compilation in the working tree, freshly extracted ZIP, and independently patched Pass 63 archive. Two new tests failed before the fix (151 passed, 2 failed). 49 TS/TSX files parsed with zero syntax errors.
- Two matching Vitest cases added but **not executed**.
- Full React typecheck and production build were attempted but blocked by missing `vite/client` types. ESLint and Vitest were attempted but their executables were missing. The npm registry was unreachable (`EAI_AGAIN`). Browser/accessibility checks are **not verified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility. Recheck with the GitHub API.
2. Import Pass 64 source onto a **new feature branch** rather than directly onto `main`; exclude local Git metadata, build artifacts and secrets.
3. Incorporate the preparation branch's generated `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks. Fix all failures.
5. Open a source-import PR and merge only when required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
