# Marbly Pop! — Style Guide

## Game identity
- **Name**: Marbly Pop!
- **Genre**: casual marble shooter (Zuma-like) con focus juicy feedback
- **Tone**: bold cartoon, Gumball/Adventure Time school, modern adult-friendly
  (NOT preschool, NOT kawaii pastel, NOT retro 80s)
- **Pace**: fluido, veloce, immediato — UX prima di tutto
- **Target resolution**: portrait 720×1280 (9:16, mobile-first)
- **Background target**: 1024×1820 (9:16 native), scalati in *cover* a runtime.
  Gli asset attuali (1024×1024) sono placeholder — vedi `docs/ASSETS.md` TODO rigenerazione.

## Visual style
Bold flat 2D cartoon, soft cel-shading two-tone, glossy highlights upper-left,
NO outlines anywhere, only soft tonal transitions.

## Anchor references (in `assets/style_reference/`)
- `marble_master.png` — pallina tintabile neutra (anchor primario)
- `shooter_master.png` — cannone giocattolo, canna a 3 o'clock
- `bg_gameplay.png` — playfield top-down
- `bg_menu.png` — scena menu con depth, Gumball-school
- `logo.png` — titolo "Marbly Pop!" lettering bouncy

## Color palette
- **Teal-blue**: #2da6a8 (sky, base accents)
- **Coral**: #e87363 (highlight, button primary)
- **Mustard yellow**: #e4b942 (secondary accents)
- **Warm cream**: #f4e5c2 (background neutral)
- **Hot pink**: #e8417f (logo "!", critical CTA)

Marble tint colors (runtime via `setTint`):
- RED 0xff4d6d, BLUE 0x4d9aff, GREEN 0x6dd66d,
  YELLOW 0xffd84d, PURPLE 0xb56dff, ORANGE 0xff8c4d

## Anchor prompt (riusato per ogni asset futuro)
"[OBJECT], [VIEW], centered on pure black background. Style: bold flat 2D
cartoon, soft cel-shading two-tone, white glossy highlight upper-left,
modern cartoon TV aesthetic like Gumball or Adventure Time, NO black
outlines, only soft tonal transitions, no kawaii, no pastel baby, no
retro 80s. No text, no watermark."

## Negative prompt costante
"realistic, 3D render, pastel nursery, baby toy, kawaii faces, preschool,
black outlines, contour lines, retro 80s memphis, drop shadow on ground"