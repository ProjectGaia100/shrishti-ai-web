# Purpose

- Own the Vite React TypeScript web frontend for Shrishti AI.
- Keep dashboard, landing, map, auth, geospatial, weather, hazard, and Supabase UI behavior understandable from this doc plus the root DOX contract.

## Ownership

- This doc governs web package/config files, `public/` static assets, app-level design docs inside this folder, and deployment settings.
- `src/AGENTS.md` governs web application source under `src/`.

## Local Contracts

- Preserve the Vite + React + TypeScript + Tailwind + shadcn/ui stack unless the user explicitly requests a stack change.
- Keep static assets in `public/` when they must be served directly by the app.
- Keep environment-sensitive values in `.env` files or documented env templates, not committed source.
- Respect existing Vercel SPA routing configuration in `vercel.json`.

## Work Guidance

- Use existing package scripts instead of inventing new verification commands.
- Keep lockfiles aligned with dependency changes.
- Before major visual changes, also read `DESIGN.md` and `PRODUCT.md` in this folder when they exist.

## Verification

- For source changes, run `npm run typecheck`.
- Run `npm run lint` for lint-sensitive edits.
- Run `npm run build` before claiming production readiness.

## Child DOX Index

- `src/AGENTS.md` covers React source code, UI components, routes, contexts, hooks, services, data, styles, and source-level contracts.
