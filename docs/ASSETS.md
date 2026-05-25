# Marbly Pop! — Asset Inventory

## Cartella sorgente
- `assets/raw/` — originali generati in AI Studio (non modificati)
- `assets/style_reference/` — anchor reference per rigenerazione
- `public/assets/` — asset pronti per il runtime (Vite li serve da root)

## Inventario corrente

### Blocco 1 — Worldbuilding

| File | Dim. native | Dim. display runtime | AssetKey | Scena / Placement |
|------|-------------|----------------------|----------|-------------------|
| `marble_master.png` | 1024×1024 | 44×44 px (`MARBLE_RADIUS*2`) | `MARBLE_MASTER` | GameScene — tintato a runtime via `setTint`. Tint mode MULTIPLY: preserva highlight glossy. |
| `shooter_master.png` | 1024×1024 | 180×180 px | `SHOOTER_MASTER` | GameScene — canna a 3 o'clock; rotazione runtime `setRotation(atan2(dy,dx))`. |
| `bg_menu.png` | 1024×1024 | cover 720×1280 (scale ×1.25) | `BG_MENU` | MenuScene — cover scale, overcrop orizzontale accettabile. |
| `bg_gameplay.png` | 1024×1024 | cover 720×1280 (scale ×1.25) | `BG_GAMEPLAY` | GameScene, WinScene, GameOverScene — cover scale. |
| `logo.png` | 1024×1024 | 480×480 px | `LOGO` | MenuScene — centrato in alto (y≈25%). |

### Blocco 2 — UI core

| File | Dim. native | Dim. display runtime | AssetKey | Scena / Placement |
|------|-------------|----------------------|----------|-------------------|
| `button_master.png` | 1024×1024 | variabile: `setScale(targetWidth/835)` | `BUTTON_MASTER` | Tutti i bottoni primari (PLAY, PLAY AGAIN, TRY AGAIN). Pill visibile 835×360 nel PNG; usare `createButton` helper che mantiene aspect ratio. NON usare setDisplaySize. |
| `icon_pause.png` | 128×128 | 64×64 px | `ICON_PAUSE` | GameScene HUD — top-right (GAME_WIDTH-56, 56). Torna al Menu. |
| `icon_settings.png` | 128×128 | 64×64 px | `ICON_SETTINGS` | MenuScene HUD — top-right (GAME_WIDTH-56, 56). Placeholder silenzioso. |
| `icon_sound_on.png` | 128×128 | 64×64 px | `ICON_SOUND_ON` | MenuScene HUD — top-left (56, 56). Toggle locale. |
| `icon_sound_off.png` | 128×128 | 64×64 px | `ICON_SOUND_OFF` | MenuScene HUD — stato post-toggle sound. |
| `particle_circle.png` | 1024×1024 | — | `PARTICLE_CIRCLE` | **Non wirato in questa fase** (vedi sezione sotto). |
| `particle_star.png` | 1024×1024 | — | `PARTICLE_STAR` | **Non wirato in questa fase**. |

### Blocco 3 — Polish screens

| File | Dim. native | Dim. display runtime | AssetKey | Scena / Placement |
|------|-------------|----------------------|----------|-------------------|
| `panel_victory.png` | 1024×1024 | **620×620 px** (quadrato) | `PANEL_VICTORY` | WinScene — centrato (cx, cy). Cream area utile: offset y +53 px dal centro (creamY = cy+53). Cartiglio drape: offset y -201 px. |
| `panel_lose.png` | 1024×1024 | **620×620 px** (quadrato) | `PANEL_LOSE` | GameOverScene — centrato (cx, cy). Stessi offset cream del panel_victory. |
| `icon_powerup_bomb.png` | 127×128 | 100×100 px | `ICON_POWERUP_BOMB` | GameScene HUD — bottom shelf, px=195. Placeholder silenzioso. |
| `icon_powerup_colorblast.png` | 127×128 | 100×100 px | `ICON_POWERUP_COLORBLAST` | GameScene HUD — bottom shelf, px=305. Placeholder silenzioso. |
| `icon_powerup_freeze.png` | 126×128 | 100×100 px | `ICON_POWERUP_FREEZE` | GameScene HUD — bottom shelf, px=415. Placeholder silenzioso. |
| `icon_powerup_slingshot.png` | 126×128 | 100×100 px | `ICON_POWERUP_SLINGSHOT` | GameScene HUD — bottom shelf, px=525. Placeholder silenzioso. |

### Blocco 4 — Meta / monetization

| File | Dim. native | Dim. display runtime | AssetKey | Scena / Placement |
|------|-------------|----------------------|----------|-------------------|
| `chest_closed.png` | 512×280 | 200×200 px | `CHEST_CLOSED` | WinScene — centro pannello (cx, cy-60). |
| `chest_open.png` | 512×512 | — | `CHEST_OPEN` | **Non wirato in questa fase**. |
| `coin.png` | 128×128 | 48×48 px | `COIN` | WinScene — reward counter (cx-100, cy+90). |
| `gem.png` | 128×125 | 48×48 px | `GEM` | WinScene — reward counter (cx+20, cy+90). |
| `ads_badge.png` | 128×128 | 56×56 px | `ADS_BADGE` | WinScene — sovrapposto a DOUBLE REWARDS (cx+140, cy+280). |
| `level_node_locked.png` | 256×256 | — | `LEVEL_NODE_LOCKED` | **Non wirato in questa fase**. |
| `level_node_unlocked.png` | 256×256 | — | `LEVEL_NODE_UNLOCKED` | **Non wirato in questa fase**. |
| `wheel_disc.png` | 512×512 | — | `WHEEL_DISC` | **Non wirato in questa fase**. |
| `wheel_frame.png` | 512×512 | — | `WHEEL_FRAME` | **Non wirato in questa fase**. |
| `star_filled.png` | 128×126 | 85×85 px (laterali) / 100×100 px (centrale) | `STAR_FILLED` | WinScene — 3 stelle. |
| `star_empty.png` | 128×126 | 85×85 px | `STAR_EMPTY` | WinScene — stella dx (placeholder). |
| `drain_hole.png` | 1024×1024 | 70×70 px | `DRAIN_HOLE` | GameScene — endpoint path (0.50W, 0.66H), `setDepth(-5)`. |

## Asset caricati ma non wirati in questa fase

I seguenti asset sono precaricati in PreloadScene ma non ancora posizionati in nessuna scena.
Saranno wirati in fasi successive:

| AssetKey | File | Note |
|----------|------|------|
| `PARTICLE_CIRCLE` | `particle_circle.png` | VFX esplosione match (Fase 2) |
| `PARTICLE_STAR` | `particle_star.png` | VFX celebrazione win (Fase 2) |
| `CHEST_OPEN` | `chest_open.png` | Animazione apertura chest in WinScene (Fase 2) |
| `LEVEL_NODE_LOCKED` | `level_node_locked.png` | WorldMapScene (Fase 3) |
| `LEVEL_NODE_UNLOCKED` | `level_node_unlocked.png` | WorldMapScene (Fase 3) |
| `WHEEL_DISC` | `wheel_disc.png` | DailyRewardScene ruota (Fase 3) |
| `WHEEL_FRAME` | `wheel_frame.png` | DailyRewardScene ruota (Fase 3) |

## TODO — rigenerazione asset

- [ ] **bg_menu.png** e **bg_gameplay.png**: rigenerare a 1024×1820 (9:16 nativo) in
  AI Studio per eliminare l'overcrop e riempire la canvas portrait senza stretch.
- [ ] **marble_master.png** + **shooter_master.png** + **logo.png** + **button_master.png**
  + **panel_victory.png** + **panel_lose.png**: rimuovere watermark sparkle (⬡ 4 punte,
  angolo basso-dx). Tool: Photopea Healing Brush.
- [ ] **chest_closed.png**: dimensioni native asimmetriche (512×280); valutare rigenerazione
  a 512×512 per evitare distorsioni a display size quadrata.
- [ ] **icon_sound_on.png** / **icon_sound_off.png**: rigenerazione in Photopea per allinearli
  allo stile icon_pause / icon_settings (stesso peso visivo).
- [ ] `logo_small.png` 256×256: variante compact per future HUD/splash.
- [ ] Verificare tint resa su device mobile fisico (colori leggermente più saturi
  in MULTIPLY su schermo AMOLED rispetto al monitor desktop).
- [x] ~~Valutare MARBLE_RADIUS 16→18-20~~ — fatto: MARBLE_RADIUS=22, MARBLE_SPACING=43.

## Cover scale formula
```ts
const s = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
bg.setScale(s);
```
Con asset 1024² su canvas 720×1280: s = max(0.703, 1.25) = **1.25**.
L'immagine scalata occupa 1280×1280; crop orizzontale di ~140px per lato.
