# SHADOWPLAY — Asset Prompt Pack

These prompts generate every visual asset in [GAME_DESIGN.md](GAME_DESIGN.md). They're
written for Midjourney v7, GPT-image or Flux. They also work in other generators if you
remove the `--` parameters.

## How to use this pack

1. **Generate the Style Anchor first** (§0). Choose the best image and use it as a **style
   reference** for every later prompt (`--sref <url>` in Midjourney, or attach it as a
   reference image in GPT-image or Flux). Using one anchor is what keeps all 60+ assets
   looking like the same game.
2. **Paste the Style Suffix** (§0) at the end of every prompt where it says `[STYLE]`.
3. **Symbols and UI pieces** go on a **flat pure-green `#00FF00` background** so they can be
   cut out cleanly. Image generators can't make real transparency, so I'll remove the green
   and clean the edges.
4. **Puppets for rigging:** after you choose a symbol, also generate the "parts sheet"
   version (§2.3) so I can rig the joints in Spine.
5. **Delivery sizes:**
   - symbols 1024×1024
   - backgrounds 3840×2160 (16:9) **and** 2160×3840 (9:16)
   - UI pieces 2048 on the longest side
   - posters 2:3

   Send PNG files and name them like `H1_moth_widow_v3.png`.

---

## 0. Style Anchor and Style Suffix

**Style Anchor (generate 8 images and pick the best one):**

> A miniature Victorian paper-cut shadow theatre stage on Halloween night, made entirely of
> layered matte black cardstock silhouettes with crisp hand-cut edges, brass split-pin joints
> visible on the jointed puppets, lit from behind by a single warm oil lantern so that light
> glows through translucent amber, rose and teal gel windows, deep violet glowing ink shadows
> cast across a parchment-coloured paper backdrop, tactile handmade museum-quality toy
> theatre, shallow depth of field, macro product photography, rich chiaroscuro, cinematic,
> highly detailed paper fibre texture, 8k --ar 16:9 --style raw --v 7

**Style Suffix (append to every prompt as `[STYLE]`):**

> backlit paper-cut theatre style, matte black cardstock silhouette with crisp hand-cut edges
> and visible brass split-pin joints, warm lantern backlight glowing through translucent
> coloured gel cut-outs, subtle parchment paper fibre texture, glowing ultraviolet ink accents
> (#6B3CFF), handmade museum-quality toy theatre craftsmanship, premium casino game asset,
> ultra detailed, sharp focus

**Negative / avoid (paste wherever the tool supports it):**

> cartoon, chibi, glossy 3D plastic, cel shading, anime, gore, blood, text, watermark,
> signature, clock, hourglass, gears, generic jack-o'-lantern clipart, photoreal human face,
> extra limbs, blurry, low resolution

---

## 1. Logo

**Main logo (on green):**

> The word "SHADOWPLAY" as an elegant hand-cut paper title sign for a Halloween shadow
> theatre, soft high-contrast serif letterforms cut from black cardstock with warm lantern
> light glowing through amber gel inside each letter, a small paper moth perched on the "O",
> brass split pins at the corners, a thin hanging rod and strings above, the subtitle "THE
> ALL HALLOWS' PAPER THEATRE" in small engraved caps beneath, centred, isolated on flat pure
> green #00FF00 background, [STYLE] --ar 3:1 --v 7

*Tip:* image generators often misspell words. If the lettering comes out wrong, generate it
**without text** ("an empty title sign") and I'll set the type in Fraunces over it.

**App icon / lobby tile:**

> Square lobby thumbnail for a slot game, a tall paper-cut moth-winged widow puppet in
> silhouette standing in front of a glowing oil lantern, her huge violet ink shadow thrown
> across a parchment curtain behind her, title space at the bottom, [STYLE] --ar 1:1 --v 7

(Also make a 2:3 portrait version for the lobby.)

---

## 2. Symbols

Every symbol prompt starts with:

> *Single slot-machine symbol, centred, full figure fits inside a square with 8% padding,
> isolated on flat pure green #00FF00 background,*

and ends with `[STYLE] --ar 1:1 --v 7`.

### 2.1 High symbols (the Company)

**H1 — The Moth Widow**

> …a tall elegant paper-cut puppet of a widow with large veiled moth wings spread wide, the
> wings made of translucent amber gel with intricate cut-out vein patterns glowing from
> behind, a lace mourning gown cut in delicate filigree, a long veil, jointed arms on brass
> pins, holding a tiny lantern, mysterious and regal, …

**H2 — The Gourd King**

> …a paper-cut puppet king whose head is a carved pumpkin gourd with warm light glowing
> through its cut-out eyes and grin, wearing a crown made of melting candle stubs with tiny
> live flames, a heavy cut-paper royal cape with ornate filigree trim, a jointed sceptre arm
> on a brass pin, proud and slightly mischievous, …

**H3 — The Stilt Wraith**

> …a paper-cut puppet of a sheeted ghost walking on very long jointed wooden stilts bent at
> the knees, the sheet made of translucent rose-tinted tissue paper glowing softly with
> ragged hand-torn edges, two hollow eye holes, eerie and graceful mid-stride, …

**H4 — The Crow Courier**

> …a paper-cut puppet of a crow wearing a small postman's cap and a satchel, holding a sealed
> black envelope with a violet wax seal in its beak, jointed wings on brass pins, feathers cut
> as layered fringe, a teal gel eye glowing, clever and dapper, …

**H5 — The Familiar**

> …a paper-cut puppet of a slender black cat sitting upright, its long tail made of six
> separate jointed paper segments linked by brass pins curling into a spiral, glowing teal
> gel eyes, whiskers cut as thin strips, elegant and knowing, …

### 2.2 Low symbols (Hand Shadows)

Each low symbol uses this template, with the description changed:

> *Single slot-machine symbol, centred, isolated on flat pure green #00FF00 background, the
> glowing ultraviolet ink shadow (#6B3CFF) of two human hands forming a [DESCRIPTION] hand-
> shadow shape, projected on a small square of parchment paper with torn edges, soft violet
> glow at the shadow edge, the hands themselves faintly visible in silhouette at the bottom
> edge, [STYLE] --ar 1:1 --v 7*

| ID | `[DESCRIPTION]` |
|---|---|
| L1 | howling wolf head with open jaw |
| L2 | raven with spread wings |
| L3 | hare with tall ears |
| L4 | eight-legged spider made from both hands' fingers |
| L5 | stag head with branching antlers |

Keep all five on **the same parchment-square background** so they read as one family. If
you'd like more colour separation, tint the paper square slightly differently on each one
(cool grey, warm grey, rose, sage, sand).

### 2.3 Puppet parts sheets (for animation rigs)

Do this for each of H1–H5 once you've chosen your final version:

> Character parts sheet for 2D cut-out animation rigging, the [H# character name] paper
> puppet disassembled into separate pieces laid out flat with space between them: head,
> torso, upper arms, forearms, hands, legs, [wings / tail segments / stilts], each piece with
> a visible brass split-pin hole at the joint, orthographic front view, even flat lighting,
> isolated on flat pure green #00FF00 background, [STYLE] --ar 16:9 --v 7

### 2.4 Specials

**W — Moth (Wild)**

> …a single luminous moth with wings spread flat, wings made of ultraviolet violet ink gel
> (#6B3CFF) glowing intensely from behind with intricate cut-out eye-spot patterns, fine
> feathery antennae, tiny particles of glowing dust around it, magical and precious, the word
> space left blank beneath the moth for a "WILD" label, …

**S — Ticket (Scatter)**

> …a vintage theatre admission ticket stub torn along a perforated edge, aged cream card with
> ornate engraved border, the stub printed with a moth emblem and a large blank space for
> text, a warm golden glow behind it, slightly curled paper, punched hole, premium and
> collectible, …

*(I'll add "ADMIT ONE — ALL HALLOWS'" in code so it's crisp at every size.)*

**B — Match (bonus collector)**

> …a single long wooden match standing upright with a bright live flame at its head, the
> flame casting warm light, a thin ribbon of smoke curling, the match stick wrapped with a
> tiny cut-paper label, …

### 2.5 Symbol frames and states

| Asset | Prompt |
|---|---|
| Ink overlay ×N | "A soft wet ultraviolet ink stain blooming outward on parchment paper, organic watercolour edges, deep violet #6B3CFF with brighter core glow, top-down, isolated on flat pure green #00FF00 background, [STYLE] --ar 1:1" *(generate 3 intensities: faint, medium, deep)* |
| Win frame | "Square ornate frame of brass footlight bulbs, all glowing warm, theatre marquee style, hollow centre, isolated on flat pure green #00FF00 background, [STYLE] --ar 1:1" |

---

## 3. The Lantern

> A Victorian brass and iron oil lantern hanging from a small hook on a rail, with four glass
> panels, an ornate cut-metal crown with moth motifs, and a [FLAME] flame inside casting light
> through the glass, isolated on flat pure green #00FF00 background, [STYLE] --ar 1:1 --v 7

Generate it **three times**, once for each flame level:

| `[FLAME]` | Level |
|---|---|
| small calm candle | Candle |
| bright steady oil lamp | Lamp |
| roaring, almost overflowing bonfire-orange | Bonfire |

**Lantern rail** (the track around the grid): "A thin ornate brass rail track with small
pulleys and riveted joints, straight horizontal segment, isolated on flat green, [STYLE]
--ar 8:1"

---

## 4. Backgrounds and stage

Make each background at **16:9 and 9:16**. Keep the middle **60%** of the frame clear where
the reels sit; the prompt says so.

**Base game: "The Field Stage"**

> Wide cinematic view of a travelling paper-cut toy theatre set up alone in an empty
> moonlit autumn field on Halloween night, ornate cut-paper proscenium arch with heavy deep
> red velvet curtains drawn open, a parchment backdrop inside, paper-cut silhouette trees
> and a distant hill village in layered depth outside the theatre, a few floating paper
> lanterns in the sky, mist at ground level, the centre of the stage left empty and softly
> lit for the game grid, [STYLE] --ar 16:9 --v 7

**Matinee:**

> Same paper-cut toy theatre interior seen from the front row, warm amber house lights
> glowing, silhouetted paper audience heads in the foreground at the bottom edge, centre of
> the stage empty and bright, golden tones, [STYLE] --ar 16:9 --v 7

**Midnight Show:**

> Same paper-cut toy theatre at midnight, a huge pale cut-paper moon rising behind a
> translucent indigo backdrop, everything washed in deep indigo and violet, silver highlights
> on the paper edges, centre of the stage empty, [STYLE] --ar 16:9 --v 7

**Lights Out:**

> Same paper-cut toy theatre in near-total darkness, only two lanterns glowing on opposite
> sides of the stage, enormous crossing violet ink shadows of puppets thrown across the
> curtains and walls, dramatic, centre of the stage empty, [STYLE] --ar 16:9 --v 7

**Parallax layers (optional, for depth).** Generate the base-game scene again as separate
images:

1. sky with the moon only
2. far hills
3. trees
4. the theatre proscenium with an empty transparent centre, on green
5. foreground grass and mist

---

## 5. UI: the Stage Apron bet bar

Everything here goes on flat pure green `#00FF00`, uses `[STYLE]`, and is drawn **without
any text or numbers**. I'll set all text in code so it stays sharp and translatable.

| Asset | Prompt |
|---|---|
| **Apron bar** (desktop) | "A long curved wooden theatre stage apron edge seen from the front, dark polished wood with ornate brass trim along the lip, a row of small glowing footlight bulbs set into the edge, worn and handmade, empty surface, isolated on flat green, [STYLE] --ar 8:1" |
| **Apron bar** (mobile) | Same, "--ar 3:2", shaped as a shallow stage floor panel |
| **Wick button**: open | "Circular brass lantern shutter iris seen front-on, eight slats fully open revealing a small warm candle flame inside, ornate engraved rim with moth motifs, isolated on flat green, [STYLE] --ar 1:1" |
| **Wick button**: closed | Same, "slats fully closed, thin bright light leaking between the slats" |
| **Wick button**: disabled | Same as open, "dull tarnished brass, no flame, cold" |
| **Seat ticket stub** | "Single small blank theatre ticket stub, cream card, perforated edges, engraved border, front view, isolated on flat green, [STYLE] --ar 2:1" (plus a "punched and glowing" version) |
| **Box Office window** | "Small ornate brass ticket booth window with arched top and frosted glass panel, empty glass, front view, isolated on flat green, [STYLE] --ar 2:1" |
| **Lantern compass** | "Small round brass dial with four engraved directions and a tiny lantern-shaped needle, front view, isolated on flat green, [STYLE] --ar 1:1" |
| **Icons** (1 sheet) | "Set of six game UI icons cut from black cardstock with brass edges, in a 3×2 grid: rolled poster scroll, lightning bolt, looping arrows, speaker, question mark in a circle, gear, isolated on flat green, [STYLE] --ar 3:2" |
| **Marquee** | "Long theatre marquee sign panel framed by rows of warm round light bulbs, empty dark centre for letters, front view, isolated on flat green, [STYLE] --ar 6:1" |
| **Flame meter** | "Row of five short wax candle stubs on a brass holder, the first two lit and the rest unlit, front view, isolated on flat green, [STYLE] --ar 5:1" |
| **Modal panel** | "Aged parchment programme booklet page with ornate cut-paper border and corner flourishes, empty centre, flat front view, isolated on flat green, [STYLE] --ar 3:4" |

---

## 6. The Poster Wall (bet modes)

The posters are 2:3, with **no text**: I'll overlay the titles and costs. Each one starts
with:

> *Vintage Victorian theatre poster artwork without any text, paper-cut silhouette
> illustration, framed with an ornate printed border, slightly aged paper,*

| Poster | Continue with… |
|---|---|
| Standard | "…the Gourd King puppet bowing on a lit stage with a single candle lantern, warm amber tones, [STYLE] --ar 2:3" |
| Extra Wick | "…a single huge candle with a tall roaring flame and two moths circling it, ember-orange tones, [STYLE] --ar 2:3" |
| Matinee | "…a torn admission ticket and a front-row paper audience, golden house lights, [STYLE] --ar 2:3" |
| Midnight Show | "…the Moth Widow silhouetted against a giant pale moon, indigo and silver, [STYLE] --ar 2:3" |
| Lights Out | "…two lanterns at opposite edges throwing huge crossing violet shadows of the whole puppet cast, near-black with violet glow, [STYLE] --ar 2:3" |

---

## 7. Splash and celebration art

| Asset | Prompt |
|---|---|
| **Loading: pop-up layers** | Use the base-game parallax layers from §4. In addition: "a long burning fuse wick lying straight on a dark wooden floor, the lit end sparking, side view, isolated on flat green, [STYLE] --ar 10:1" |
| **Intro poster 1: The Light Casts** | "Paper-cut puppet of the Crow Courier lit by a lantern from the left, its glowing violet ink shadow cast to the right on parchment, simple and clear, [STYLE] --ar 2:3" |
| **Intro poster 2: The Ink Deepens** | "Two glowing violet ink shadows of the same paper-cut cat overlapping on parchment, the overlap visibly deeper and brighter violet, [STYLE] --ar 2:3" |
| **Intro poster 3: Encore** | "A brass lantern travelling along a rail around a small paper theatre stage, motion trail of light, new violet shadows appearing, [STYLE] --ar 2:3" |
| **Win: paper roses** | "Single deep red paper-cut rose with a long stem, thrown mid-air, isolated on flat green, [STYLE] --ar 1:1" (make 3 variants) |
| **Win: audience row** | "Row of paper-cut silhouette theatre audience members standing and applauding, seen from behind, isolated on flat green, [STYLE] --ar 6:1" |
| **Win: Final Bow** | "The entire paper-cut puppet cast (moth-winged widow, pumpkin-headed king, stilt ghost, crow, cat) bowing together in a line on a lit stage, gold leaf flakes falling, curtain beginning to close, [STYLE] --ar 16:9" |
| **Win: gold leaf** | "Small irregular flakes of real gold leaf, isolated on flat green, [STYLE] --ar 1:1" |

---

## 8. Particles and effects (small sprites)

All of these are on flat green, `[STYLE]`, 512×512:

- a glowing dust mote, a soft circular violet glow
- a small paper ember curling as it burns
- a smoke wisp
- a moth in flight, side view, wings mid-flap (3 frames: up, mid, down)
- a puff of torn paper confetti

---

## 9. Audio prompts (Suno / Udio for music, ElevenLabs SFX for effects)

**Music**

| Track | Prompt |
|---|---|
| Base loop | "Dark whimsical Victorian chamber music for a Halloween paper puppet theatre, plucked string quartet, celesta and music box melody, soft brushed percussion, mysterious but playful, 92 BPM, seamless loop, instrumental, no vocals" |
| Show loop | "Same theme but bolder and faster, full strings, low brass, timpani swells, theatrical and exciting, 112 BPM, seamless loop, instrumental" |
| Lights Out | "Same theme in minor key, sparse and tense, deep cello drones, heartbeat-like taps building to a full theatrical swell, instrumental" |
| Big win sting | "Short triumphant theatre fanfare, brass and strings, ending on a held chord, 4 seconds" |

**Sound effects**

Spin wood slide · lantern rail creak · lantern settle clunk · flame flare (one each for
Candle, Lamp and Bonfire) · paper shadow hiss · ink bloom (wet, soft) · Encore curtain jolt ·
ticket tear · match strike · footlight buzz-on · applause in 3 sizes · rose thrown and landing
· the final curtain closing.

Prompt format for ElevenLabs: `"[sound], close mic, dry, theatrical, high quality, no music"`.

---

## Delivery checklist

| Group | Count |
|---|---|
| Style anchor | 1 |
| Logo | 1 |
| Lobby tile | 2 |
| Symbols | 13 |
| Parts sheets | 5 |
| Ink overlays | 3 |
| Win frame | 1 |
| Lanterns | 3 |
| Rail | 1 |
| Backgrounds | 4 × 2 aspect ratios |
| Parallax layers | 5 |
| UI pieces | ~13 |
| Posters | 5 |
| Intro posters | 3 |
| Celebration pieces | ~7 |
| Particles | ~7 |
| Music | 4 |
| SFX | ~16 |

Send them in batches, symbols first, so I can lock the look before the rest.
