# Private import readiness — Forktactics

**Verified 2026-10-31 (Pass 76):** Connected `lunarlauren/forktactics` remains **public**. **Do not upload application source** until visibility is private and independently rechecked. Never modify `lunarlauren/YumPlan` or its live Cloudflare deployment.

## Latest locally verified source — Pass 76

- Local feature branch: `feat/local-data-capacity-meter`; commit `928de5a2e296e2cb721b8c2bb74f58adccadeadf`.
- ZIP: `forktactics-pass-076.zip`; SHA-256 `c37474aa1fd97b131c33c45ada969bb2c40313e3780aad1d379b4f71f7c316a4`.
- Patch from Pass 75: `forktactics-pass-076.patch`; SHA-256 `ce8d7b290802db825dc22947604936a3a52366fd7b5e1607f48a229225df845d`.
- Complete Git bundle: `forktactics-pass-076.git.bundle`; SHA-256 `1e6771f9a0fd6beadc0ea811fb7d03f019ee977727dc6abc5a659be39f0ead26`.
- Settings now shows the current versioned JSON backup size in **UTF-8 bytes** against the 500 KB safety cap and warns at 80%. This is not browser quota or proof of persistence. New week and reset actions also reset the ephemeral Discover Skip cursor.
- **171/171 Node domain tests passed** on the working tree, freshly extracted ZIP, independently patched Pass 75 source, and clean Git bundle clone. Strict production-domain TypeScript passed. New Vitest test-file TypeScript passed with a temporary API shim (**not actual Vitest**). **53 TS/TSX files parsed** with zero syntax errors. Git diff, ZIP, and bundle integrity checks passed.
- Matching Vitest tests added **but not run**. Full React typecheck and build attempted but blocked by missing `vite/client`; ESLint and Vitest executables missing. npm registry DNS failed with `EAI_AGAIN`. Browser/accessibility checks remain **unverified**.

## Source-free CI preparation on GitHub

The preparation branch contains the package manifest, lockfile generation workflow and GitHub-generated `package-lock.json` (commit `8a908311b878d580e69932b6e0c34039e6f20fab`). [GitHub Actions run 40745896036](https://github.com/lunarlauren/forktactics/actions/runs/40745896036) confirmed locked dependency installation with `npm ci`, but domain tests failed because application source is intentionally absent from this public repository. Later CI gates were skipped. **This draft PR is not green or merge-ready.**

## Safe import checklist

1. Change repository visibility to **private** in GitHub Settings → General → Danger Zone → Change repository visibility; independently verify via GitHub API.
2. Import Pass 76 source onto a **new feature branch**, not `main`; exclude Git metadata, build artifacts, and secrets.
3. Incorporate the preparation branch's `package-lock.json` and verify `npm ci`.
4. Run domain tests, full React typecheck, ESLint, Vitest, production build, and browser/accessibility checks. Fix all failures.
5. Open a source-import PR; merge only after required checks pass. Never deploy to the original YumPlan Cloudflare site.

This is a source-free preparation PR, **not** a deployment approval.
