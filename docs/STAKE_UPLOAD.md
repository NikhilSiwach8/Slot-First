# Uploading Shadowplay to Stake Engine

Everything to upload is in [`stake/`](../stake):

| Folder | What it is | Where it goes in the Stake Engine dashboard |
|---|---|---|
| `stake/math/` | Maths: `index.json`, one `books_<mode>.jsonl.zst` and one `lookUpTable_<mode>_0.csv` per bet mode | **Math** upload. Select the whole folder; `index.json` lists the other files. |
| `stake/frontend/` | The game: a static build (`index.html` + `assets/`), no server code, no external requests | **Frontend** upload. Upload the folder's contents, with `index.html` at the top level. |

## Bet modes

| Mode (`index.json` name) | Cost | What it is |
|---|---|---|
| `base` | 1.0× | Standard game |
| `ante` | 1.25× | Extra Wick: more Tickets and bigger flames |
| `buy_matinee` | 88× | Buys The Matinee (10 spins) |
| `buy_midnight` | 270× | Buys The Midnight Show (12 spins) |
| `buy_lights_out` | 600× | Buys Lights Out (15 spins) |

The game sends these exact names in `/wallet/play`. If the dashboard shows the modes in a
different case (for example `BASE`), the game matches names case-insensitively when reading
rounds back, but check one live play per mode after upload.

Final RTP, hit rate and max-win odds for each mode are in
[MATH_NOTES.md](MATH_NOTES.md#published-files). The full reports are in `math/reports/`.

## How the files were made and checked

```bash
npm run books          # generates stake/math/ (takes ~30–60 min; modes can run in parallel with --mode)
npm run books:verify   # independent check of the folder; prints ALL CHECKS PASSED
npm run build:stake    # builds stake/frontend/
```

`books:verify` re-reads only the files and checks:

- **Format:** the `index.json` schema; every book has `id`, `events` and an integer
  `payoutMultiplier`; ids run 1..N; CSV rows are exactly three unsigned integers.
- **Match:** every CSV payout equals its book's `payoutMultiplier`.
- **Replay:** every book is replayed through the game engine and reproduces its payout.
- **Statistics:** RTP 90–98% with ≤ 0.5% spread across modes; hit rate better than 1 in 20;
  the 50,000× max win is present and more frequent than 1 in 10,000,000; no empty win range
  between 1× and the max win; 100,000–1,000,000 books per mode.

## What the frontend does on Stake

- **Live play** (`?sessionID=…&rgs_url=…`): `POST /wallet/authenticate`, `/wallet/play` and
  `/wallet/end-round` (the last only for winning rounds, as the RGS closes losing rounds by
  itself). Amounts use the RGS's 6-decimal integers.
- **Bet levels** come from the authenticate response, filtered to `minBet`..`maxBet` and
  `stepBet`. The default bet level is preselected.
- **Unfinished rounds:** if authenticate returns an active round, the game shows it and then
  closes it.
- **Every round is verified:** the game rebuilds each book with its own engine and refuses
  to show one whose wins don't add up to its `payoutMultiplier`.
- **Replay** (`?replay=true&game=…&version=…&mode=…&event=…&rgs_url=…`): fetches
  `GET /bet/replay/{game}/{version}/{mode}/{event}`, hides the balance and bet controls,
  makes no wallet calls, and offers Play / Play again.
- **Jurisdiction flags** from authenticate are honoured: `disabledSpacebar`,
  `disabledAutoplay`, `disabledTurbo`, `disabledBuyFeature`, `displayRTP`,
  `minimumRoundDuration`, `socialCasino`.
- **Stake.us** (`social=true` or `socialCasino`): restricted words (stake, bet, buy, pay,
  cost …) are replaced on screen with the approved alternatives.
- **Currencies:** symbol, decimals and placement as in Stake's `ts-client` (USD, EUR, JPY,
  XGC, XSC …). Unknown codes show the code after the amount.
- **Rules (`?` button):** every rule, the paytable at the current stake, cost, RTP, max win
  and max-win odds per bet mode, a guide to every button, and the full disclaimer.
- **Sizes tested:** desktop 1600×900, Pixel 7, 390×844, 844×390, Mobile S 320×568,
  Popout L 800×450 and Popout S 400×225.
- **Production build checked** from a sub-folder (as Stake serves it): no failed requests,
  clean console, no debug hooks.

## Still to do on your side

1. **Game tile:** compose it in the dashboard's Tile Editor. Use the lobby art in
   `assets/cut/lobby_tile_portrait_v1.png` (the tile must not contain baked-in text).
2. **Audio:** the sounds are generated in code as placeholders. Approval reviewers score
   polish, so replace them with the produced music and effects before submitting.
3. **Replay event IDs for review:** Stake asks for one example per mode of a normal win, a big
   win, a max win, a loss and a bonus trigger. These are the book ids (also in
   `math/reports/<mode>.json` under `reviewEvents`). The RGS may give replays its own event
   ids, so confirm them in the dashboard.

   | Mode | Normal win | Big win | Max win | Loss | Bonus trigger |
   |---|---|---|---|---|---|
   | `base` | 2 | 260 | 500001 | 1 | 141 |
   | `ante` | 1 | 55 | 500001 | 6 | 20 |
   | `buy_matinee` | 6 | 116 | 150001 | 247 | 1 |
   | `buy_midnight` | 3 | 497 | 150001 | 491 | 1 |
   | `buy_lights_out` | 2 | 450 | 75771 | 9026 | 1 |

4. **One live check per mode** after upload: authenticate, play, end-round, replay.
5. **Trademark check** on the name "Shadowplay" before publishing.
