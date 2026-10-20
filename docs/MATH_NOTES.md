# Shadowplay — Maths Notes

Every number in the game lives in `src/engine/config.ts`. The published files are in
`stake/math/`, the per-mode reports in `math/reports/`. How to upload them is in
[STAKE_UPLOAD.md](STAKE_UPLOAD.md).

## Fixed rules

| Rule | Value |
|---|---|
| Grid | 6 reels × 5 rows, 15,625 ways, pays left to right from reel 1 |
| Max win | **50,000×** the stake per round (base game and show together). The round ends as soon as it is reached. |
| RTP | **96.20%** in every mode |
| Rounding | Each win is rounded to the nearest 0.01× the stake when paid, so every total is a whole `payoutMultiplier` |
| Rounds | Stateless: each bet is one complete book of events |

## Published files

Each mode's RTP is computed exactly from its integer lookup table.

| Mode | Cost | Books | RTP | Hit rate | Max win (50,000×) | Std. dev. (× cost) |
|---|---|---|---|---|---|---|
| `base` | 1× | 500,016 | **96.2000%** | 1 in 2.52 | 1 in 8,000,000 | 43.2 |
| `ante` (Extra Wick) | 1.25× | 500,020 | **96.2000%** | 1 in 2.48 | 1 in 6,000,000 | 39.1 |
| `buy_matinee` | 88× | 150,012 | **96.2000%** | every show pays except ~0.15% | 1 in 500,000 | 4.9 |
| `buy_midnight` | 270× | 150,012 | **96.2000%** | every show pays except ~0.06% | 1 in 200,000 | 3.1 |
| `buy_lights_out` | 600× | 150,012 | **96.2000%** | every show pays except ~0.003% | 1 in 60,000 | 2.3 |

Spread between modes: 0.0000% (Stake allows 0.5%).

## How the weights were set

The method is the same idea as the Math SDK's distributions and optimizer:

1. **Natural books.** Each mode plays 500,000 rounds (150,000 for the buys) on the real reels,
   with one seed per book, so every book is reproducible.
2. **Max-win and gap-filling books.** These are real rounds of the same engine, played on
   boosted reel sets until they land in the needed range. The SDK does the same with its
   win-cap reel sets.
   - 12 books per mode that reach exactly 50,000×.
   - 4 books per high win range that the natural books left empty, so there is no gap
     below the max win. Those ranges were 20,000–50,000× in `base`, and 10,000–20,000×
     plus 20,000–50,000× in `ante`. The buy modes reached every range naturally.
3. **Weights.**
   - The max-win group and each gap group get a fixed, declared probability. The gap
     groups step down toward the max win: 20, 8 and 3 times the max-win chance.
   - Every natural book is weighted by (1 + payout)^λ, with λ solved so the mode's RTP is
     exactly 96.2%.

| Mode | Natural RTP of its books | λ needed |
|---|---|---|
| `base` | 97.74% | −0.0081 |
| `ante` | 93.17% | +0.0005 |
| `buy_matinee` | 93.48% | +0.0088 |
| `buy_midnight` | 97.19% | −0.0034 |
| `buy_lights_out` | 97.15% | −0.0044 |

Every λ is within ±0.01, so the published game plays almost exactly like the raw game.
(A λ of +0.009 changes the relative weight of a 100× round against a 0× round by about 4%.)

## Independent verification

`npm run books:verify` re-reads only the files in `stake/math/`, replays **every** book
through the game engine, and checks the format, the CSV/book match, RTP, hit rate, max-win
reachability and frequency, win-range gaps and the book count. Result: **ALL CHECKS PASSED**
(see the output in the latest commit message, or run it again).

## Rules that changed during balancing

These replace the first draft of the design document:

- **Ink:** each way pays the *deepest* ink it passes through. The draft added the ink up
  along a way, which ran away in the shows.
- **Ink forms** only where two or more shadows of the same symbol overlap, or where a Moth
  shadow lands on a puppet.
- **Encore:** pays only what the new shadows add, and after Act II the curtain rises again
  only if each Encore pays at least as much as the one before.
- **Matches** are placed separately from the reel strips, at most one per reel, on about 2%
  of reels.
- **Lights Out** starts at Candle (two Lanterns from the first spin).
- **Buy prices** were set from simulation: Matinee 88×, Midnight Show 270×, Lights Out 600×.
