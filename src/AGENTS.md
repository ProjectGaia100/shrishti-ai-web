# Purpose

- Own the React application source under `shrishti-ai-web/src/`.

## Ownership

- This doc governs `App.tsx`, `main.tsx`, global CSS, and the `components/`, `context/`, `data/`, `hooks/`, `lib/`, `pages/`, `services/`, and `styles/` folders.
- Web package configuration and `public/` assets remain governed by `shrishti-ai-web/AGENTS.md`.

## Local Contracts

- Keep route-level screens in `pages/` and reusable UI or feature panels in `components/`.
- Keep API calls, token handling, dataset access, and domain adapters in `services/` or `lib/`, not inside presentation components.
- Preserve existing shadcn/ui component conventions under `components/ui/`.
- Keep auth and theme state in the established context providers.
- Do not hard-code API keys or secrets in source.

## Work Guidance

- Prefer typed React components and existing Tailwind utility patterns.
- Reuse existing cards, panels, map components, service helpers, and UI primitives before creating new variants.
- For landing-page or animated surfaces, preserve current motion libraries and check responsive layout.
- For map/geospatial changes, check interactions with active layers, overlays, dataset services, and Leaflet state.

## Verification

- Run `npm run typecheck` from `shrishti-ai-web/` after TypeScript source edits.
- Run `npm run lint` when component, hook, or service changes may affect lint rules.
- Run `npm run build` for changes that affect routing, bundling, assets, or production behavior.

## Child DOX Index

- No child `AGENTS.md` files are currently defined under `shrishti-ai-web/src/`.
