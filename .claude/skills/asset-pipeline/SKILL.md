---
name: asset-pipeline
description: Use when importing new visual assets into the Marbly Pop! project, updating AssetKeys enum, configuring PreloadScene, or any task involving Phaser texture loading, atlas generation, sprite scaling, or asset post-processing (remove.bg cleanup, resize).
---

# Asset Pipeline — Marbly Pop!

## Source folder
Raw assets generated in Google AI Studio live in `assets/raw/`.
Cleaned production assets live in `public/assets/`.
Reference anchors (for re-generation) in `assets/style_reference/`.

## Naming convention
- Marbles: `marble_master.png` (single neutral tintable master, tinted at runtime)
- Shooter: `shooter_master.png` (canna a 3 o'clock, offset rotation -π/2 al load)
- Backgrounds: `bg_{scene}.png` (es. `bg_menu.png`, `bg_gameplay.png`)
- UI: `ui_{element}.png` (es. `ui_button.png`, `ui_logo.png`)
- Icons: `icon_{name}.png` (es. `icon_pause.png`, `icon_settings.png`)
- Particles: `particle_{shape}.png` (es. `particle_circle.png`, `particle_star.png`)

## AssetKeys enum
File: `src/constants/AssetKeys.ts`. SEMPRE aggiornare qui prima di toccare `PreloadScene`.
Mai usare stringhe magiche per chiavi texture nel codice.

## Target dimensions
- Marble master: 128×128 (downscale a 64-80 a runtime)
- Shooter master: 256×256 (downscale a 100-140 a runtime)
- Backgrounds: 1024×1820 (portrait 9:16, scale to fit a runtime)
- UI button: 512×170 (3:1 pill-shape)
- Icons HUD: 128×128 each (downscale a 48-64)
- Logo: 1024×1024 con padding, plus `logo_small.png` 256×256
- Particles: 64×64 (mai più grandi, tintate a runtime)

## Post-processing rules
1. Background removal SOLO su asset con sfondo nero (marble, shooter, UI elements, particelle).
   NON serve per i background di scena (vanno a piena cover).
2. Tool: remove.bg (free 50/mese) o Photopea Magic Wand con tolleranza 30.
3. Export PNG con alpha channel.
4. Verifica nessun alone nero residuo prima di salvare in `public/assets/`.

## Tinting strategy
Marble color: usa `sprite.setTint(0xRRGGBB)` con questi 6 valori (definiti in `MarbleColor.ts`):
- RED: 0xff4d6d
- BLUE: 0x4d9aff
- GREEN: 0x6dd66d
- YELLOW: 0xffd84d
- PURPLE: 0xb56dff
- ORANGE: 0xff8c4d

NON generare 6 marble PNG separate. SEMPRE master neutro + tint.

## Phaser preload pattern
In `PreloadScene.preload()`:
```typescript
this.load.image(AssetKeys.MARBLE_MASTER, 'assets/marble_master.png');
```
Mai inline string paths nelle scene di gameplay.

## Shooter rotation gotcha
L'asset shooter ha la canna a 3 o'clock (destra). Per avere `setRotation(0) = up` come da convention Phaser/Marbly:
```typescript
shooter.setRotation(targetAngle - Math.PI / 2);
```
Oppure pre-ruotare l'immagine di -90° in Photopea prima del save. Scegliere una strategia e documentarla in ARCHITECTURE.md.

## When new asset arrives
1. Verifica sia in `assets/raw/`
2. Crea AssetKey constant
3. Aggiungi `load.image()` in PreloadScene
4. Sostituisci uso primitivo (`add.circle`, `add.rectangle`) con `add.sprite(x, y, AssetKey)`
5. Test visivo con Playwright MCP, screenshot conferma

## Splitting grid sprites

**Quando usare**: hai ricevuto da Nano Banana una sprite sheet con più icone in griglia (strip o grid) e devi produrre PNG individuali normalizzati a 128×128 con 14 px di padding.

**Prerequisito**: lo sfondo deve essere già trasparente. In Photopea: Magic Wand (tolleranza 30) → Select Inverse → Delete → Export PNG. Fai questo PRIMA di eseguire lo script.

**Script**:
```
pnpm asset:split <input.png> <COLSxROWS> <name1,name2,...> [--size=128] [--padding=14] [--outDir=public/assets]
```

Ogni tile viene: estratto dalla griglia → trimmed dei bordi trasparenti → ridimensionato a `(size-2*padding)` mantenendo aspect ratio → esteso con padding trasparente fino a `size×size`.

### Esempi

```bash
# Icone HUD del Blocco 2 (row 1×4)
pnpm asset:split assets/raw/hud_icons_strip.png 1x4 \
  icon_pause,icon_settings,icon_sound_on,icon_sound_off

# Icone power-up del Blocco 3 (grid 2×2)
pnpm asset:split assets/raw/powerup_grid.png 2x2 \
  icon_powerup_bomb,icon_powerup_colorblast,icon_powerup_freeze,icon_powerup_slingshot
```

Output atteso:
```
✓ public/assets/icon_powerup_bomb.png
✓ public/assets/icon_powerup_colorblast.png
✓ public/assets/icon_powerup_freeze.png
✓ public/assets/icon_powerup_slingshot.png
```

Dopo lo split, aggiungi ogni chiave in `src/constants/AssetKeys.ts` e registra il file in `PreloadScene` prima di usarla in gameplay.