# Shadowplay — Maths Notes (demo build)

Measured with `scripts/simulate.ts`. Every number in the game lives in
`src/engine/config.ts`.

## Fixed rules

| Rule | Value |
|---|---|
| Grid | 6 reels × 5 rows, 15,625 ways, pays left to right from reel 1 |
| Max win | **50,000×** stake per round (base game and show together). The round ends as soon as it is reached. |
| RTP target | 96.2% for every mode |
| Rounds | Stateless: each bet is one complete book of events |

## Measured results

The base game and Extra Wick figures come from 6 million rounds each, over three seeds, with
the final base settings. The show buys come from 55,000 rounds each.

| Mode | Cost | Measured RTP | 95% range | Notes |
|---|---|---|---|---|
| Standard | 1× | **96.2%** | ±2.2% | Hit rate 1 in 2.5; a show every ~270 spins (avg ~92×) |
| Extra Wick | 1.25× | ~98.9% (before the last Ticket change) | ±2.5% | The Ticket rate was then lowered to bring it down to ~96%; this has not been re-measured |
| Buy: Matinee | 90× | ~96% (avg show 86.5×) | ±5% | |
| Buy: Midnight Show | 270× | ~96% (avg show 258×) | ±3% | |
| Buy: Lights Out | 600× | ~96% (avg show 576×) | ±2% | |

Other measured behaviour (base game):

- About 40% of spins see the Lantern move at least once (an Encore). There is a Full Circle
  about every 1,800 spins.
- The biggest single round in the base simulations was about 18,000×. In the show buys it
  was about 39,000×. **No simulated round reached the 50,000× cap.** The cap is enforced in
  code (`RoundState.add`) and covered by a unit test.

## Why these numbers are not final

This is a very high-volatility game, so plain Monte Carlo can only pin RTP to about ±2%,
even after millions of rounds. Stake requires an exact figure. The release path:

1. Generate books (outcomes) per mode with the same engine.
2. Weight them with an optimizer (`@slot-engine/optimizer` or the Math SDK) so every mode
   lands exactly on 96.2%, with an explicit 50,000× max-win book at a controlled frequency.
3. Export `books_*.jsonl.zst`, `lookUpTable_*.csv` and `index.json`, then verify them
   independently.

## Rules that changed during balancing

These replace the first draft of the design document:

- **Ink:** each way pays the *deepest* ink it passes through. The draft added the ink up
  along a way, which ran away in the shows.
- **Ink forms** only where two or more shadows of the same symbol overlap, or where a Moth
  shadow lands on a puppet. A puppet's own shadow landing on another copy of it no longer
  inks.
- **Encore:** pays only what the new shadows add, and after Act II the curtain rises again
  only if each Encore pays at least as much as the one before.
- **Matches** are placed separately from the reel strips, at most one per reel, about 2% of
  reels.
- **Lights Out** starts at Candle (two Lanterns from the first spin).
