# Private import readiness — Forktactics

**Verified 2026-10-30 (Pass 69):** Connected `lunarlauren/forktactics` is still **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its Cloudflare deployment.

## Latest locally verified source — Pass 69

- Local branch: `fix/preflight-pantry-and-starter-price-storage`; commit `a75be54d251a84ba07b23b32dc78208be3fab36b`.
- ZIP: `forktactics-pass-069.zip`; SHA-256 `6d78b23834aeca087c9b40fb737ca7e5147e7196a4e15abd585962980abb7392`.
- Patch from Pass 68: `forktactics-pass-069.patch`; SHA-256 `dd548777b19edd7703e2cc9a77e4dc335a4a3a028921b116640445fd2d23e0aa`.
- Complete Git bundle: `forktactics-pass-069.git.bundle`; SHA-256 `b423d63ea4ffecd37c21e0e9498925fa39d6dffbe47c47781f22bc8f5c382956`.
- New pantry Have it/Need it assumptions and starter ingredient package-price overrides now preflight the entire saved-state envelope against the 500 KB limit. Oversize changes are rejected before saving, preserving existing settings.
- **159/159** Node domain tests passed on the working tree, freshly extracted ZIP, independently patched Pass 68 source, and clean bundle clone. Both new regressions failed before the fix (157 passed, 2 failed). Strict domain TypeScript compilation passed; 50 TS/TSX files parsed without syntax errors.
- Matching Vitest regressions added but **not executed**. Full React typecheck and build attempted but blocked by missing `vite/client`. ESLint and Vitest attempted but their executables were missing. `npm ping` failed with `EAI_AGAIN`. Browser/accessibility checks are **not verified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 69 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
