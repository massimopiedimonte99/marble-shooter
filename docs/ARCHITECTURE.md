# Architecture

## Layer
src/
├── main.ts              # bootstrap Phaser.Game
├── scenes/              # tutte le scene del gioco
│   ├── BaseScene.ts     # tutti estendono questa
│   ├── BootScene.ts     # config iniziale, no asset
│   ├── PreloadScene.ts  # carica tutti gli asset
│   ├── MenuScene.ts
│   ├── WorldMapScene.ts
│   ├── GameScene.ts     # gameplay principale
│   ├── PauseScene.ts    # overlay (non sostituisce GameScene)
│   ├── ShopScene.ts
│   └── DailyRewardScene.ts
├── state/
│   ├── GameState.ts     # singleton, save/load via localStorage
│   └── SaveManager.ts
├── events/
│   ├── EventBus.ts      # singleton Phaser.Events.EventEmitter
│   └── EventTypes.ts    # union type degli eventi
├── ads/
│   ├── IAdProvider.ts
│   ├── AdProviderFactory.ts
│   ├── AdOrchestrator.ts          # ascolta EventBus, decide quando mostrare
│   ├── CrazyGamesAdapter.ts
│   ├── PokiAdapter.ts
│   ├── GameDistributionAdapter.ts
│   └── NoopAdProvider.ts          # dev mode
├── audio/
│   ├── AudioManager.ts
│   ├── AudioKeys.ts
│   └── audio-config.json
├── pool/
│   ├── MarblePool.ts
│   └── ParticlePool.ts
├── gameplay/
│   ├── MarbleChain.ts             # doubly linked list di marble sul path
│   ├── Shooter.ts                 # logica sparatore
│   ├── MatchDetector.ts           # detect match 3+ e chain reaction
│   └── CollisionResolver.ts
├── powerups/
│   ├── BasePowerup.ts
│   └── ...
├── levels/
│   ├── index.ts                   # registry
│   ├── level-1.json
│   └── ...
├── utils/
│   ├── LinkedList.ts
│   └── preventScroll.ts
└── constants/
├── AssetKeys.ts               # enum di tutte le texture/sound keys
└── Config.ts                  # numeri "magici" centralizzati

## Layout / Canvas
- **Logical resolution**: 720×1280 portrait (9:16, mobile-first).
- **Scale mode**: `Scale.FIT` + `CENTER_BOTH` (vedi `main.ts`). Su desktop vengono
  accettate barre laterali.
- Tutte le posizioni di gioco sono espresse come frazioni di `GAME_WIDTH`/`GAME_HEIGHT`
  (definiti in `Config.ts`) — mai coordinate assolute nel codice di scena.

## Assets
- **Marble**: master neutro unico (`AssetKeys.MARBLE_MASTER`) + `setTint(hex)` a runtime.
  Mai PNG separati per colore. Tint mode MULTIPLY (default Phaser 4) preserva highlights.
- **Shooter**: rotazione runtime `setRotation(Math.atan2(dy, dx))`, **offset 0**.
  L'asset ha la canna a 3 o'clock = angolo 0 Phaser → punta direttamente al cursore.
- **Background**: cover scale centrata (`src/utils/coverBackground.ts`).
  `scale = Math.max(W/texW, H/texH)` → overcrop orizzontale su canvas portrait.
- **Key enum**: sempre da `AssetKeys` in `src/constants/AssetKeys.ts`, mai stringhe magiche.
  Usare `enum` regolare (non `const enum`) per compatibilità esbuild/Vite dev.
- **createButton** (`src/utils/createButton.ts`): helper per pattern button_master + label
  centrata. PNG `button_master` 1024×1024 con pill visibile 835×360: usa `setScale(width/835)`
  uniforme (NON setDisplaySize) per preservare aspect ratio. `height` derivato internamente
  come `width * (360/835)`; non è un parametro dell'helper. Container Phaser con bg Image +
  Text; hover alpha 0.85, click → `diag.log('button_pressed')` + callback. Nessun tween.
- **Panel layout**: `PANEL_VICTORY` / `PANEL_LOSE` sono PNG 1024×1024 **quadrati**.
  Displayare sempre come 620×620. La cream area utile è centrata a offset y **+53 px** dal
  centro del panel (a display 620). Cartiglio drape: offset y **-201 px**. Posizionare tutto il
  content rispetto a `creamY = panelY + 53`.
- **HUD inline nelle scene**: icone e pulsanti HUD creati direttamente in `create()` di ogni
  scena. Nessuna cartella `src/ui/` in questa fase; potrà essere introdotta in Fase 2 se la
  complessità aumenta.
- **Sound toggle**: stato volatile locale a MenuScene (variabile `soundOn`). Persistenza
  rinviata a Fase 2 → `GameState` / `SaveManager`.
- **Bottoni placeholder**: solo `diag.log('button_pressed', { id })`, nessun event emit,
  nessun handler funzionale (power-up, settings).
- **icon_pause**: no-op silenzioso in questa fase (solo `diag.log`). Diventerà overlay
  PauseScene in Fase 2.
- **Drain hole**: visual cue all'endpoint del path in GameScene (80×80 px), `setDepth(-5)`
  per restare sotto la catena marble. Endpoint corrente a (0.50W, 0.72H) = centro basso.
- **Path GameScene**: coefficienti W/H normalizzati. Endpoint a (0.50W, 0.72H). Linea path
  leggera: `lineStyle(2, 0x445566, 0.35)`.
- **TODO Fase 2**: valutare MARBLE_RADIUS 16→18-20 con ribilanciamento COLLISION_THRESHOLD
  e MARBLE_SPACING per migliorare leggibilità marmi su schermo fisico.

## Principi
1. **Disaccoppiamento via EventBus**: gameplay, audio, UI, ads non si conoscono direttamente
2. **State centralizzato**: solo GameState scrive su localStorage, mai scene singole
3. **Astrazione SDK**: gameplay non sa di CrazyGames/Poki, parla con IAdProvider
4. **Pooling everywhere**: zero allocation in update()

## Build per piattaforma
`VITE_PLATFORM=crazygames pnpm build` → `dist/` configurato per CrazyGames
`VITE_PLATFORM=poki pnpm build` → `dist/` configurato per Poki
ecc.

Ogni build differisce solo per: provider concreto in `AdProviderFactory`, `index.html` con script SDK corretto, eventuali asset specifici di piattaforma (es. thumbnail).