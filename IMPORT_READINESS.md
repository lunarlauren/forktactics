# Private import readiness — Forktactics

The separate GitHub repository was created and currently reports **public** visibility.
Do **not** upload the application source until Settings → General → Danger Zone → Change repository visibility → Private is completed.

## Latest verified local candidate
- Development pass: **42**
- Source archive: `forktactics-pass-042.zip`
- SHA-256 (archive): `3d97ad4848b36f9c50c3a4996d9c69e993db30f968cd81b28fa804bb684198cd`
- Local Git bundle: `forktactics-pass-042.git.bundle`
- SHA-256 (bundle): `601a674a178ff6fff3461e41b6ef4604e2c246ead3cd6a834587a8ac35fc7cb9`
- Dependency-free domain suite: **116/116 passed** on 2026-10-27.
- Full React typecheck, lint, Vitest, browser tests, and production build: **NOT verified**.
- Lockfile: **missing**; offline npm resolution returned ENOTCACHED.

## Safe import steps
1. Convert this repository to private. Recheck GitHub visibility.
2. Import the full source from pass 42 to a feature branch, **not** directly to `main`. Exclude build artifacts such as `*.tsbuildinfo` and `.domain-check/`.
3. Generate and commit a reproducible `package-lock.json` using working npm registry access. Change CI to `npm ci`.
4. Run domain tests, TypeScript, ESLint, Vitest, production build, and browser checks; investigate failures before merging.
5. Review migration strategy for browser data before any Cloudflare cutover.
6. Open/review a source-code PR against `main`; merge only when checks pass.

The original `lunarlauren/YumPlan` repository and Cloudflare live deployment must remain unchanged.
