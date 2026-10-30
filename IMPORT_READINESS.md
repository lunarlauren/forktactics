# Private import readiness — Forktactics

**Verified 2026-10-30 (Pass 66):** The connected `lunarlauren/forktactics` repository still reports **public** visibility. **Do not upload application source** until it is private and that visibility is independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 66

- Local branch: `fix/guard-recipe-save-size`; commit `624d4063aa9bfa7887cd913bf47738646449a4b0`.
- ZIP: `forktactics-pass-066.zip`; SHA-256 `eb030c8acf8e229d79d7dde838e28b6fbec45cb76b64f2b585ec7a3654a0f845`.
- Patch from Pass 65: `forktactics-pass-066.patch`; SHA-256 `338281e293765a01e15dbe6f3eaa8f3e8aad8e35bef89e98eec5b18f1a41a38c`.
- Complete Git bundle: `forktactics-pass-066.git.bundle`; SHA-256 `9b42eaf8495a1e8b279fba49414edeb3b2af1aa4514c443dfcac98db0fe50b33`.
- Recipe additions and edits now check the full serialized state against the 500 KB save/backup limit before accepting the change, preventing unsavable in-memory recipe collections. Browser persistence and backup validation share the same byte-limit helper.
- **155/155** Node domain tests passed with strict domain TypeScript compilation on the working tree, freshly extracted ZIP, independently patched Pass 65 archive, and clean bundle clone. The new regression failed before the fix (154 passed, 1 failed). 49 TS/TSX files parsed with zero syntax errors.
- Matching Vitest regression added but **not executed**.
- Full React typecheck and production build were attempted but blocked by missing `vite/client` dependencies. ESLint and Vitest were attempted but their executables were missing. Browser/accessibility checks are **not verified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but the domain test failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility. Recheck with the GitHub API.
2. Import Pass 66 source onto a **new feature branch** rather than directly onto `main`; exclude local Git metadata, build artifacts and secrets.
3. Incorporate the preparation branch's generated `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser/accessibility checks. Fix all failures.
5. Open a source-import PR and merge only when required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
