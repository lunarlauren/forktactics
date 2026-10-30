# Private import readiness — Forktactics

**Verified 2026-10-30 (Pass 71):** Connected `lunarlauren/forktactics` is still **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its Cloudflare deployment.

## Latest locally verified source — Pass 71

- Local branch: `fix/preflight-weekly-menu-storage`; commit `433d2966705f17e187522f5e861f3805beb31829`.
- ZIP: `forktactics-pass-071.zip`; SHA-256 `82e071f1a71d2b317a421de7dcfdcd891b921fcc76611379a3f16d88d9489ff9`.
- Patch from Pass 70: `forktactics-pass-071.patch`; SHA-256 `0ada17765c6be2d1c3e9d4b8b492a4a2e8e6366b467b76f54080e67778f04d3e`.
- Complete Git bundle: `forktactics-pass-071.git.bundle`; SHA-256 `b66cab9897f4e84927685bce267d2e7484e4a9a4bdba8eb8cf9b44c3d0781219`.
- Generating a weekly proposal, swapping a proposed dinner, and confirming a proposal now validate the resulting saved-state envelope before accepting changes. The old state remains intact if a 500 KB cap would be exceeded.
- **163/163** Node domain tests passed on the working tree, freshly extracted ZIP, independently patched Pass 70 source, and clean Git bundle clone. All three new regressions failed before the fix (160 passed, 3 failed). Strict domain TypeScript compilation passed; 50 TS/TSX files parsed without syntax errors.
- Three matching Vitest regressions added but **not executed**. Full React typecheck and build attempted but blocked by missing `vite/client`. ESLint and Vitest executables unavailable; `npm ping` failed with `EAI_AGAIN`. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 71 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
