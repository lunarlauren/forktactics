# Private import readiness — Forktactics

**Verified 2026-10-29:** The connected `lunarlauren/forktactics` repository still reports **public** visibility. **Do not upload application source** until it is private and that visibility is independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 63

- Local branch: `fix/preflight-confirmed-recipe-edits`; commit `f7025e2a29424772060fbf56a9ae5a01b7314f36`.
- ZIP: `forktactics-pass-063.zip`; SHA-256 `c20058f244b0eaba7779b931637230ab7619069b382464e0596de0f04f383b17`.
- Patch from Pass 62: `forktactics-pass-063.patch`; SHA-256 `c5f2bd972bb777059b08638c439171d647f690a00a56eb42223dfb01de5dbde5`.
- Complete Git bundle: `forktactics-pass-063.git.bundle`; SHA-256 `17f6bc9428f13552d01071eeb8cd924e3eed804e2a0c93a91cc660cbc8910507`.
- Confirmed personal-recipe edits now preflight the retained grocery basket and reject valid-but-unquotable quantities before state changes. Representable over-budget changes remain editable.
- **151/151** Node domain tests passed with strict domain TypeScript compilation in the working tree, freshly extracted ZIP and independently patched Pass 62 archive. Two new regressions were added; the overflow regression failed before the fix (150 passed, 1 failed). 48 TS/TSX source files parsed with zero syntax errors.
- Two matching Vitest cases added but **not executed**.
- Full React typecheck and production build were attempted but blocked by missing `vite/client` types. ESLint and Vitest were attempted but the local executables were missing. Browser/accessibility checks are **not verified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility. Recheck with the GitHub API.
2. Import Pass 63 source onto a **new feature branch** rather than directly onto `main`; exclude local Git metadata, build artifacts and secrets.
3. Incorporate the preparation branch's generated `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks. Fix all failures.
5. Open a source-import PR and merge only when required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
