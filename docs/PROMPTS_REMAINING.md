# SHADOWPLAY — Remaining Art

This is everything still open. It replaces the open items in
[PROMPTS_FIXES.md](PROMPTS_FIXES.md). None of it blocks the playable demo.

`--sref <NAME>` means: paste that image's URL.

---

## 1. Mobile proscenium v2 (must fix)

**Why:** the v1 stage opening is about 55% of the width. Six reels need about 90%.

```
Front view of an ornate cut-paper theatre proscenium arch in tall portrait format, a large death's-head hawkmoth crest with a skull marking at the top, very slim gothic pillars with glowing lantern windows pressed against the far left and right edges of the frame, deep red velvet curtains pulled tightly back to the sides, the stage opening is very wide, filling 90% of the frame width and the upper two-thirds of the height, filled with flat pure green #00FF00, a short ornate stage floor edge below the opening, everything outside the arch also flat pure green #00FF00, matte black cardstock with gold filigree, ultra detailed --ar 9:16 --style raw --v 7 --sref <MOBILE_PROSCENIUM_V1> --sw 300 --no text, watermark, thick pillars, wide curtains
```

---

## 2. Mobile bonus backgrounds, 9:16 (not made yet)

**Matinee**
```
Interior of a paper-cut toy theatre seen from the front row, tall portrait format, warm amber house lights glowing, silhouetted paper-cut audience heads along the bottom edge, red velvet curtains pulled back to the far edges, the stage opening very wide and placed in the upper two-thirds of the frame, empty and brightly lit for a game grid, golden tones, backlit paper-cut theatre style, matte black cardstock, parchment texture, cinematic, ultra detailed --ar 9:16 --style raw --v 7 --sref <MATINEE_16x9> --sw 250 --no text, watermark, cartoon, clock
```

**Midnight Show**
```
Interior of a paper-cut toy theatre at midnight, tall portrait format, a huge pale cut-paper moon rising behind a translucent indigo backdrop at the top of the frame, everything washed in deep indigo and violet, silver highlights along paper edges, plum curtains pulled back to the far edges, the stage opening very wide and placed in the upper two-thirds of the frame, empty for a game grid, backlit paper-cut theatre style, cinematic, ultra detailed --ar 9:16 --style raw --v 7 --sref <MIDNIGHT_16x9> --sw 250 --no text, watermark, cartoon, clock
```

**Lights Out**
```
Interior of a paper-cut toy theatre in near-total darkness, tall portrait format, two brass oil lanterns glowing at the bottom left and bottom right corners, enormous glowing ultraviolet violet ink shadows of Halloween paper puppets (a moth-winged widow, a pumpkin-headed king with candle crown, a sheeted ghost on stilts, a crow in a postman's cap, a black cat with a segmented tail) climbing the side walls and the top of the frame, black velvet stage opening very wide in the upper two-thirds of the frame and empty for a game grid, dramatic high contrast, backlit paper-cut theatre style, cinematic, ultra detailed --ar 9:16 --style raw --v 7 --sref <LIGHTSOUT_16x9> --sw 250 --no text, watermark, cartoon, clock, wayang, temple, deity, religious imagery
```

---

## 3. Moth in flight, frames 2 and 3

Use *Vary Region* on frame 1 (the wings-up moth). Select **only the wings**, keep the
rest of the prompt, and change the wing wording:

**Frame 2**
```
A small paper-cut moth in flight seen from the side, wings level, spread out flat horizontally, true moth with feathery antennae and a fuzzy body, wings of glowing violet gel with cut-out crescent moons and stars, isolated on a flat pure green #00FF00 background, ultra detailed --ar 1:1 --style raw --v 7 --no text, butterfly
```

**Frame 3**
```
A small paper-cut moth in flight seen from the side, wings pulled fully down below the body, true moth with feathery antennae and a fuzzy body, wings of glowing violet gel with cut-out crescent moons and stars, isolated on a flat pure green #00FF00 background, ultra detailed --ar 1:1 --style raw --v 7 --no text, butterfly
```

---

## 4. Lobby tile, portrait 2:3 (not made yet)

Lobbies show both square and portrait tiles.

```
Slot game lobby key art, tall portrait format, a tall paper-cut puppet of a widow with large veiled moth wings standing beside a glowing brass oil lantern, her enormous glowing ultraviolet violet ink shadow thrown across a parchment curtain behind her, deep red velvet theatre curtains framing the sides, a death's-head moth crest at the top, empty dark space in the bottom quarter for a title, backlit paper-cut theatre style, matte black cardstock with brass split-pin joints, premium casino key art, ultra detailed --ar 2:3 --style raw --v 7 --sref <LOBBY_TILE_SQUARE> --sw 300 --no text, watermark, cartoon, glossy plastic, gore
```

---

## 5. Optional upgrades

**Extra Wick poster, with true moths.** The insects are still butterflies.
```
Vintage Victorian theatre poster artwork without any text, tall narrow format, a single huge dripping wax candle on an ornate brass holder with a tall roaring flame, two glowing moths circling the flame, true moths with feathery comb antennae, fuzzy thick bodies and broad rounded wings, red velvet curtains, ornate gilded border with death's-head moth emblems at top and bottom, slightly aged paper, ember orange tones, backlit paper-cut theatre style, ultra detailed --ar 1:3 --style raw --v 7 --sref <POSTER_SHEET_V2> --sw 350 --no text, letters, butterfly, monarch, watermark
```

**Intro poster "The Ink Deepens", with two overlapping shadows.** The current one shows a
single shadow; I'm animating the second one in code, so this is only needed if you want it
built into the art.
```
A paper-cut black cat puppet standing between two brass lanterns, one on the left and one on the right, casting two large glowing ultraviolet violet ink shadows onto parchment paper behind it, the two shadows overlapping in the middle where the violet is visibly deeper, darker and brighter, ornate gilded thin border with red curtains, backlit paper-cut theatre style, simple clear composition, ultra detailed --ar 1:1 --style raw --v 7 --sref <INTRO_SHEET> --sw 300 --no text, letters, numbers, watermark
```

---

## 6. Upscales only (no prompt)

Run **Upscale (Subtle) 2×** on these and send them again:

| Asset | Current size | Why |
|---|---|---|
| Base Field Stage, Matinee, Midnight Show, Lights Out (16:9) | 1672 px wide | Base is zoomed 1.35× in game |
| Five parallax layers | 1672 px wide | Soft on desktop |
| Bet-mode poster sheet v2 | ~320 px per poster | The Poster Wall needs ~700 px |
| Splash and celebration sheet | Intro posters ~360 px | Soft on desktop |
| Mobile sky and foreground | ~500 px wide | Phones need ~1080 px |
| Both UI sheets | Spin button ~460 px | Fine on phones, soft on large retina screens |
