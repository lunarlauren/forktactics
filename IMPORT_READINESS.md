# Private import readiness — Forktactics

**Verified 2026-10-30 (Pass 72):** Connected `lunarlauren/forktactics` is still **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its Cloudflare deployment.

## Latest locally verified source — Pass 72

- Local branch: `fix/preflight-settings-storage`; commit `6e984603cace653323679a89d7bd88dba7aacf9f`.
- ZIP: `forktactics-pass-072.zip`; SHA-256 `15389b9584b9b7934f9a0e4395bb9c84a686f922c2143522c1007a5b32bf8ff5`.
- Patch from Pass 71: `forktactics-pass-072.patch`; SHA-256 `48e61a09b43cd287837c5aef6fbdbdfe8c62d68131cd3327e2c3797954dbbc9b`.
- Complete Git bundle: `forktactics-pass-072.git.bundle`; SHA-256 `32d594b206e829ded823ad14c73cee178a57bc851234b1d9aa186b8179d6aee7`.
- Planning-setting changes and light/dark theme switches now validate the full 500 KB saved-state envelope before accepting durable changes. React appearance buttons display validation errors without changing the existing theme.
- **165/165** Node domain tests passed on the working tree, freshly extracted ZIP, independently patched Pass 71 source, and clean Git bundle clone. Both new regressions failed before the fix (163 passed, 2 failed). Strict domain TypeScript compilation passed; 50 TS/TSX files parsed without syntax errors.
- Two matching Vitest regressions added but **not executed**. Full React typecheck and build attempted but blocked by missing `vite/client`. ESLint and Vitest executables unavailable; `npm ping` failed with `EAI_AGAIN`. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 72 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
