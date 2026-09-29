# Unipoles PWA

A reimagining of the 2013 iOS puzzle game **Unipoles** ("logic game of magnets and
metals") as an installable Progressive Web App. Built 2026-09-28.

## The game

Place **unipoles** (single-pole magnets) on the grid such that:

1. Every **metal** sits orthogonally next to at least one unipole.
2. Each row and column holds **exactly** the number shown beside it.
3. No two unipoles touch — not even diagonally.

Illegal placements are rejected with a shake + sound. Row/column sums glow green when
satisfied, red when exceeded. Every puzzle is generated with a **provably unique
solution** (backtracking solver with forward checking, run at generation time).

## Stack

TypeScript + Svelte 5 + Vite, with `vite-plugin-pwa` for the manifest + offline
service worker. No UI framework beyond Svelte; sounds are synthesized with WebAudio
(no audio assets).

## Run it

```bash
npm install
npm run dev      # dev server
npm run build    # production build -> dist/
npm run preview  # serve the production build
```

## Layout

- `src/lib/puzzle.ts` — puzzle engine: seeded generator, uniqueness solver,
  placement rules, win detection
- `src/lib/audio.ts` — synthesized sound effects
- `src/lib/storage.ts` — best-time persistence
- `src/components/` — `Menu`, `Game`, `WinModal`
- `src/app.css` — full theme
- `public/assets/` — game art (unipole orb, metal crystals, background)
- `public/icons/` — PWA icons (192/512/maskable/apple-touch)
- `assets-src/` — raw generated masters (not shipped)
