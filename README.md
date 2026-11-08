# ForkTactics

A new, public, design-led meal planning MVP built with React, TypeScript, Vite and Cloudflare Workers static assets.

## Current prototype
- Tonight's dinner, recipe details and Cooked It
- Seven-day meal plan with locking and swapping
- Consolidated package-aware shopping list and sample budget estimates
- Private recipe collection, first-cook holographic gift and cooking milestones
- Local-device persistence and JSON backup export
- Responsive mobile and desktop layouts

**Important:** This is an early MVP, not a validated recipe or grocery pricing service. All recipe instructions and prices are illustrative. Pantry mode assumes a complete ingredient supply; inventory quantities and import recovery are not implemented. No accounts, purchases or ads are enabled.

## Local development
```sh
npm install
npm run dev
```

## Cloudflare Workers Builds
Production branch: `main`  
Root directory: `/`  
Build command: `npm run build`  
Deploy command: `npx wrangler deploy`

`wrangler.jsonc` serves the `dist` directory as static assets. Build before deploying.

## Product design
The product direction is informed by the ForkTactics Product Design Document v2.4. This MVP does not claim completion of the document's research or safety gates. Existing YumPlan assets and deployments remain separate.
