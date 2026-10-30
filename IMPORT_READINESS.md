# Private import readiness — Forktactics

**Verified 2026-10-29 (Pass 65):** The connected `lunarlauren/forktactics` repository still reports **public** visibility. **Do not upload application source** until it is private and that visibility is independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 65

- Local branch: `fix/limit-restored-confirmed-dinners`; commit `f28ba6ab53fe398f0a43fc0ec0365b1d00483af1`.
- ZIP: `forktactics-pass-065.zip`; SHA-256 `50d8f8fd4abf0d024cbb7c1693222ddf059244d705fb93692a7f4acf59bef55b`.
- Patch from Pass 64: `forktactics-pass-065.patch`; SHA-256 `b2b0fe4324fbdddbc4eeffc9d4affd45a3dde66d20013aff976e581408c7ff43`.
- Complete Git bundle: `forktactics-pass-065.git.bundle`; SHA-256 `dde96ddd36a3b880e84919a6843095e2b05a83687f60ff15d72a9b94cbbd15f0`.
- Saved data and backup imports now reject more than seven confirmed dinners; older seven-dinner commitments remain valid even after reducing the current nights setting.
- **154/154** Node domain tests passed with strict domain TypeScript compilation on the working tree, freshly extracted ZIP, independently patched Pass 64 archive, and clean bundle clone. The new regression failed before the fix (153 passed, 1 failed). 49 TS/TSX files parsed with zero syntax errors.
- Matching Vitest regression added but **not executed**.
- Full React typecheck and production build were attempted but blocked by missing `vite/client` dependencies. ESLint and Vitest were attempted but their executables were missing. Browser/accessibility checks are **not verified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility. Recheck with the GitHub API.
2. Import Pass 65 source onto a **new feature branch** rather than directly onto `main`; exclude local Git metadata, build artifacts and secrets.
3. Incorporate the preparation branch's generated `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks. Fix all failures.
5. Open a source-import PR and merge only when required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
