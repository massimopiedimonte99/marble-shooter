# Marbly Pop! — Asset Inventory

## Cartella sorgente
- `assets/raw/` — originali generati in AI Studio (non modificati)
- `assets/style_reference/` — anchor reference per rigenerazione
- `public/assets/` — asset pronti per il runtime (Vite li serve da root)

## Inventario corrente

| File | Dim. native | Dim. target runtime | Key enum | Note |
|------|-------------|---------------------|----------|------|
| `marble_master.png` | 1024×1024 | 32×32 px (`MARBLE_RADIUS*2`) | `AssetKeys.MARBLE_MASTER` | Sfera neutra grigio-chiara, tintata a runtime via `setTint`. Tint mode MULTIPLY (default Phaser 4): preserva highlight glossy. |
| `shooter_master.png` | 1024×1024 | 120×120 px | `AssetKeys.SHOOTER_MASTER` | Canna a 3 o'clock (destra). Rotazione runtime: `setRotation(atan2(dy,dx))`, offset 0. |
| `bg_menu.png` | 1024×1024 | cover 720×1280 (scale ×1.25) | `AssetKeys.BG_MENU` | Cielo teal + skyline. Cover scale, overcrop orizzontale accettabile. |
| `bg_gameplay.png` | 1024×1024 | cover 720×1280 (scale ×1.25) | `AssetKeys.BG_GAMEPLAY` | Pannello cream su teal, elementi decorativi. Cover scale. |
| `logo.png` | 1024×1024 | 480×480 px (nel menu) | `AssetKeys.LOGO` | "Marbly Pop!" lettering trasparente. Centrato in alto nel menu (y≈25%). |

## TODO — rigenerazione asset

- [ ] **bg_menu.png** e **bg_gameplay.png**: rigenerare a 1024×1820 (9:16 nativo) in
  AI Studio per eliminare l'overcrop e riempire la canvas portrait senza stretch.
- [ ] **marble_master.png** + **shooter_master.png** + **logo.png**: rimuovere
  watermark sparkle (⬡ 4 punte, angolo basso-dx). Tool: Photopea Healing Brush.
- [ ] `logo_small.png` 256×256: variante compact per future HUD/splash.
- [ ] Verificare tint resa su device mobile fisico (colori leggermente più saturi
  in MULTIPLY su schermo AMOLED rispetto al monitor desktop).

## Cover scale formula
```ts
const s = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
bg.setScale(s);
```
Con asset 1024² su canvas 720×1280: s = max(0.703, 1.25) = **1.25**.
L'immagine scalata occupa 1280×1280; crop orizzontale di ~140px per lato.
