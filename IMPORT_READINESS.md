# Private import readiness — Forktactics

**Verified 2026-10-31 (Pass 79):** Connected `lunarlauren/forktactics` remains **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 79

- Local feature branch: `fix/exact-budget-input`; commit `c24387fd8ccf1d9f359e98ef006c9fcc6aacc491`.
- ZIP: `forktactics-pass-079.zip`; SHA-256 `f4747eeff70fdecb1009d59be2b10e18ce6ede5fd247e854f4e4eab3380bce61`.
- Patch from Pass 78: `forktactics-pass-079.patch`; SHA-256 `b61868a6594deecea2ee4b216c04c2f6094a601921ce6ae442e410ca39284741`.
- Complete Git bundle: `forktactics-pass-079.git.bundle`; SHA-256 `5cdce79a276a5c35e852188b54f1b2a261975bf776613d9213e0ea4968953436`.
- Settings grocery budget now uses an editable text draft with explicit **Apply budget**, parses dollars as exact integer cents, and rejects fractional cents and out-of-range budgets. A shared maximum is enforced across input parsing, app settings, and saved-state decoding. Invalid entries do not change the committed budget.
- **174/174 Node domain tests passed** on working tree, freshly extracted ZIP, independently patched Pass 78 source, and clean Git bundle clone (baseline Pass 78: 173/173). Old UI calculation reproduced silently rounding `1.001` dollars to 100 cents; new parser rejects it. Strict production-domain TypeScript passed. Currency Vitest test file TypeScript passed with a temporary shim (**not actual Vitest**). **56 TS/TSX files** parsed with zero syntax errors. Git diff whitespace check, ZIP and bundle integrity passed; bundle HEAD matches the local commit.
- Matching Vitest cases added **but not run**. Full React typecheck and build attempted but blocked by missing `vite/client`; ESLint and Vitest executables missing. Local npm registry ping failed with `EAI_AGAIN`; the local source archive lacks the lockfile held on this preparation branch. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 79 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
