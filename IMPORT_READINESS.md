# Private import readiness — Forktactics

**Status (2026-10-28):** The connected repository still reports **public** visibility. Do not upload application source until it is changed to **private** in Settings → General → Danger Zone → Change repository visibility.

## Latest locally verified source — Pass 52

- Archive: `forktactics-pass-052.zip`; SHA-256: `c37e559cb90290930e59a40628f84df16d2b88d49247b6a6b6d35bf0589d74fe`
- Git bundle: `forktactics-pass-052.git.bundle`; SHA-256: `ef6a5295c449f2c0df259f52e8587f82c09ff9973a4a7161aa25429fc68a48d8`
- Incremental patch: `forktactics-pass-052.patch`; SHA-256: `81125ca42f0daef4188a4dbc66f7b494146e547e4695dcac93788dc28ba32d9f`
- Local feature branch: `fix/canonical-presentation-basket`; commit `ca97e6314cb66a6c5dc3e006032bec01c05430cc`.
- Node domain tests: **135/135 passed** from a fresh extracted archive, including strict domain TypeScript compilation.
- Two new regressions **failed before fix** and passed afterward.
- TS/TSX parser: **49 files, zero syntax errors**.
- Full React typecheck, Vitest, ESLint, browser tests and production build: **NOT verified**; local npm registry returned `EAI_AGAIN`.

## Pass 52 changes

- Presentation/export basket validation now rejects noncanonical ingredient IDs and more than 10,000 basket lines, matching the catalog constraints.
- A source-free `package.json` and branch-scoped `.github/workflows/lockfile.yml` were added to this preparation PR.
- **Lockfile bootstrapped on GitHub:** GitHub Actions bot committed `package-lock.json` as `8a908311b878d580e69932b6e0c34039e6f20fab` after its workflow's dependency resolution and locked-install steps. The lockfile is on the preparation branch, not in the local Pass 52 source archive.
- **Full application CI is not green:** application source is deliberately withheld from this public repository. The existing CI job cannot compile/test/build the app until source is privately imported. Do not merge this draft PR as production-ready.

## Safe import plan

1. Change repository visibility to private; **verify** via GitHub metadata.
2. Import Pass 52 source onto a dedicated feature branch, not `main`. Exclude `.domain-check`, `*.tsbuildinfo`, and local Git metadata.
3. Bring over the newly generated `package-lock.json` from this preparation branch; verify that `npm ci` resolves the same dependency graph.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build and browser accessibility checks; investigate failures before merging.
5. Open a source import PR and merge only after required checks pass. Keep the existing `lunarlauren/YumPlan` repository and live Cloudflare deployment unchanged.

This is an import preparation PR, **not** a source-code PR or deployment approval.
