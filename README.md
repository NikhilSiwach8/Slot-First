# Shadowplay — The All Hallows' Paper Theatre

*"Every puppet casts a shadow. Tonight, the shadows pay."*

A 6×5, 15,625-ways Halloween slot built around **Light & Shadow**: a Lantern lights the
stage from one side and every puppet throws a violet-ink shadow that pays as a real symbol.
A win moves the light (the **Encore**), and the same board can pay again from a new side.
Max win **50,000×**.

> **Demo build.** It plays with play credits and draws its own outcomes with a seeded PRNG
> in the browser. The maths is structured the way Stake Engine serves it (one stateless
> round = one book of events), but nothing here has run on Stake Engine yet. Final RTP
> tuning, publication files (books, lookup tables, index) and the RGS connection are the
> next step.

## Quick start

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm test` | Engine unit tests (Vitest) |
| `npm run simulate -- --rounds 1000000 --mode base,ante` | Monte Carlo RTP and feature stats per bet mode |
| `npm run assets` | Re-export `assets/` art into web-sized WebP files in `public/assets/` |

URL parameters for development: `?seed=123` for a reproducible session, `?nointro` to skip
the intro splash, `?speed=3` to play animations faster.

**Controls:** Space spins (or skips the current animation), ← → change the stake, Esc closes
a window.

## How it's built

| Path | Contents |
|---|---|
| `src/engine/` | The maths, with no UI code: `config.ts` (every number, shared with the rules page), `light.ts` (shadow casting and ink), `ways.ts` (ways evaluation), `round.ts` (plays a whole round into a book of events) |
| `src/game/` | The browser game: PixiJS stage (`stage.ts`), event playback (`player.ts`), the DOM bet bar (`ui.ts`), rules page, Playbill, autoplay, settings and celebrations (`overlays.ts`), synthesized sound (`sfx.ts`) |
| `scripts/simulate.ts` | RTP simulator |
| `scripts/art/` | Green-screen keying, ink extraction and the web export |
| `assets/` | Approved art: `raw/` as generated, `cut/` keyed to transparent PNG |
| `docs/` | Game design document and the image prompt packs |

## Measured maths (demo build)

See [docs/MATH_NOTES.md](docs/MATH_NOTES.md) for the current simulation results and what
still needs tuning before release.
