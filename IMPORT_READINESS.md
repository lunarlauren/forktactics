# Private import readiness — Forktactics

**Verified 2026-10-30 (Pass 74):** Connected `lunarlauren/forktactics` is still **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its Cloudflare deployment.

## Latest locally verified source — Pass 74

- Local branch: `fix/stale-tab-backup-recovery`; commit `f9dd64868c53f7c593a7741bac18b8fcff28f1e4`.
- ZIP: `forktactics-pass-074.zip`; SHA-256 `722b91f1b3ef46d890ef8e5ea68dd70ef731c18e840fba584d8083b329f3aab2`.
- Patch from Pass 73: `forktactics-pass-074.patch`; SHA-256 `7add0ac91da671d9e4a7799b967e6dc0ea5b6f136565fa28dd3037dd5892fb66`.
- Complete Git bundle: `forktactics-pass-074.git.bundle`; SHA-256 `4a4f3e7f0d79481848d8f8d513ca065212f3009b72c7904b5f9b49b05d08582b`.
- Fixed inconsistent backup recovery controls: the Settings backup button was disabled in stale tabs even though the warning banner still offered export. Current in-memory backups are now available regardless of browser write access; an initially unreadable save's exact original bytes are snapshotted and downloadable without silently exporting the untouched fallback as a backup.
- **168/168** Node domain tests passed on the working tree, freshly extracted ZIP, independently patched Pass 73 source, and clean Git bundle clone. Strict production-domain TypeScript passed. Supplementary strict domain/test-file TypeScript passed with a **temporary Vitest API shim** (not actual Vitest). 52 TS/TSX files parsed without syntax errors. Git diff whitespace and bundle integrity checks passed.
- Matching Vitest tests added but **not executed**. Full React typecheck and build attempted but blocked by missing `vite/client`. ESLint and Vitest executables unavailable; `npm ping` failed with `EAI_AGAIN`. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 74 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
