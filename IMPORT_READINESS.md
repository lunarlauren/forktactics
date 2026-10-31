# Private import readiness — Forktactics

**Verified 2026-10-31 (Pass 78):** Connected `lunarlauren/forktactics` remains **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 78

- Local feature branch: `fix/strict-price-input`; commit `6275e1924a1d81b1ed60f828f353074dfb167377`.
- ZIP: `forktactics-pass-078.zip`; SHA-256 `72a0beadcc0df1ad8cdbfc1bda91ec93969362dbe27d9e35e1004e4fa3aebbd5`.
- Patch from Pass 77: `forktactics-pass-078.patch`; SHA-256 `d6bcb9dc71e30b20aad22d26054cf4b6d28dbe55e770d0bfa7d0c7fbc5b37be1`.
- Complete Git bundle: `forktactics-pass-078.git.bundle`; SHA-256 `1362770a8caf5558b6939c87d68c31dfa4f488c272879366aadf310228348430`.
- Both personal-ingredient and starter-package editors now parse USD text as **exact integer cents**, rejecting sub-cent prices instead of silently rounding them. Editable price formatting also preserves every penny in large safe values.
- **173/173 Node domain tests passed** on working tree, freshly extracted ZIP, independently patched Pass 77 source, and clean Git bundle clone. The old code was reproduced accepting `0.00000001` dollars as 0 cents and `1.0000001` dollars as 100 cents. Strict production-domain TypeScript passed. Currency Vitest test TypeScript passed with a temporary shim (**not actual Vitest**). **56 TS/TSX files** parsed with zero syntax errors. Patched and bundled source trees match, Git diff whitespace check, ZIP and bundle integrity passed.
- Matching Vitest cases added **but not run**. Full React typecheck and build attempted but blocked by missing `vite/client`; ESLint and Vitest executables missing. Local npm registry ping failed with `EAI_AGAIN`; the local source archive lacks the lockfile held on this preparation branch. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 78 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
