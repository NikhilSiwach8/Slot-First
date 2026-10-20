# Art assets

- `raw/` — generated images exactly as delivered (green `#00FF00` background).
- `cut/` — transparent PNGs made with `scripts/art/chroma.py`.

| Asset | Command |
|---|---|
| Most assets | `python3 scripts/art/chroma.py raw/X.webp cut/X.png` |
| `S_ticket_v1` (yellow glow halo) | `... 40 140 50 150` |
| `W_moth_v1` (cyan edge fringe) | `... 40 140 100 215` |
| `ink_faint/medium/deep_v1` (ink on parchment) | `python3 scripts/art/ink_extract.py raw/X.webp cut/X.png` — keeps only the ink |

`cut/ui/` pieces were sliced by hand from the two UI sheets in `raw/ui/` after keying.
