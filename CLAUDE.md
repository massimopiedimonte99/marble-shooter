# Marbly Pop! — Project Context

## Stack
- Phaser 3.80+ + TypeScript 5 + Vite 5
- Target: HTML5 web (CrazyGames primario, Poki/GameDistribution successivi)
- Build size budget: < 4 MB gzipped, < 8 MB raw
- Visual style: bold flat 2D cartoon, Gumball/Toon Blast school, no outlines

## Conventions
- Tutti i path usano alias `@/` → `src/`
- Una scena per file in `src/scenes/`, sempre estendi `BaseScene`
- State globale: singleton `GameState` in `src/state/`, mai variabili globali
- Audio SOLO via `AudioManager.play(AudioKeys.X)`, mai `scene.sound.play()` diretto
- Ads SOLO via interface `IAdProvider`, mai chiamate SDK piattaforma dirette
- Asset keys SEMPRE da enum in `src/constants/AssetKeys.ts`, mai stringhe magiche
- Object pooling OBBLIGATORIO per marble e particelle (vedi `src/pool/`)

## Gotchas non-discoverable
- Poki `gameplayStart()` va su PRIMO INPUT del giocatore, non su scene load
- CrazyGames midgame ad ha cooldown interno di 3 min — non sovrapporre i nostri timer
- Mobile: prevent default su `wheel`/`keydown` per evitare scroll pagina (vedi `src/utils/preventScroll.ts`)
- Phaser texture atlas: i frame name sono case-sensitive
- `new Phaser.X()` dentro `update()` = GC stutter su mobile. Sempre pool.

## File da consultare prima di decisioni architetturali
- `docs/ARCHITECTURE.md` — pattern strutturali del progetto
- `docs/GDD.md` — game design di riferimento
- `docs/AUDIO.md` — mappa eventi audio (single source of truth)
- `docs/SDK_NOTES.md` — quirk specifici per piattaforma di pubblicazione
- `docs/STYLE_GUIDE.md` — visual identity (palette, anchor prompts, reference asset)
- `docs/ASSETS.md` — inventario asset, dimensioni target, naming convention

## Don't
- Niente lodash/underscore — usa Phaser utilities o vanilla TS
- Niente `any` in TS salvo casi documentati con commento
- Mai modificare codice generato da template senza commit dedicato

## Quando in dubbio
Chiedi prima di refactoring strutturali o introduzione di nuove dipendenze.