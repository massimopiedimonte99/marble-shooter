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
  `fontSize` default `height * 0.35` (era 0.42 — troppo aggressivo per label >4 char);
  passare `fontSize` esplicito (es. `'32px'`) per label come "PLAY AGAIN" / "TRY AGAIN".
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
- **Drain hole**: visual cue all'endpoint del path in GameScene (70×70 px), `setDepth(-5)`
  per restare sotto la catena marble. Endpoint corrente a (0.50W, 0.66H).
- **Cannone al centro**: `Shooter` a `(GAME_WIDTH/2, GAME_HEIGHT/2)=(360,640)`. Pattern
  marble-shooter classico (Marble Blast Saga / Zumbla): ruota 360° via `atan2(dy,dx)`.
  Guard pointerdown: ignora tap entro **50px** dal cannone (atan2 instabile su pointer≈shooter).
- **Path GameScene WRAP-CCW**: path con coordinate assolute, non frazioni W/H (validate
  numericamente). Entra top-right `(630,200)`, gira sopra il top, scende sul lato sinistro,
  attraversa il bottom, drain bottom-right `(620,1040)`. Min distanza curva-cannone **270px**
  (0 punti entro 200px — validato campionando la curva, non solo gli anchor). Gap 60px sopra
  il power-up shelf. Linea guida `lineStyle(2,0x445566,0.25)` solo **DEV**.
- **Config tuning** (da fix manuale): `MARBLE_RADIUS 22` (era 16 — dettaglio glossy
  illeggibile a 32px); `COLLISION_THRESHOLD 44` via `MARBLE_RADIUS*2` automatico.
  `MARBLE_SPACING 43 ≈ 2*radius-1` → touching, feel Zuma-classic.
  `CHAIN_SPEED 0.00005` (rollback da 0.00008, ingiocabile in test manuale).
  `SHOOTER_SIZE 180` (era 150).
- **HUD GameScene**: score counter top-center pill 220×60 (coin + testo `_scoreText`,
  depth 10-11); icon_pause top-right (GAME_WIDTH-56, 56) 64×64; power-up shelf coral
  510×140 a y=1170 con 4 icone 100×100 (depth 1). Guard input: y∈[90, 1100].
- **Match feedback flow**: al `GameEvent.Match`, `GameScene` congela `chain.frozen` per
  `CHAIN_FREEZE_MS=500 ms` (timer resettato a ogni match → cascade-aware), incrementa
  lo score locale (`COIN_REWARD {3:10,4:50,5:100,6:200}`, fallback `count×50`) nel
  counter top-center, spawna "+N" flottante (Text monouso, depth 20) + burst 8 particelle
  `particle_circle` tintate (emitter persistente `emitting:false`, `explode(8,x,y)`, depth 15).
- **MarbleInserted**: payload esteso con `marble: Marble`; `GameScene` fa scale-pop
  (`setDisplaySize 1.3×→1×`, Back.easeOut 160 ms, `onComplete` reset a `D=MARBLE_RADIUS*2` —
  copre il pool che non resetta lo scale; `killTweensOf` evita tween orfani su re-acquire).
- **Pooling particelle**: nessun `ParticlePool` custom; l'emitter Phaser fa da pool
  (zero alloc/frame) → soddisfa mandato CLAUDE.md. `blendMode:'ADD'` workaround per
  `particle_circle.png` che ha sfondo nero invece di alpha trasparente.
- **Stack note**: Phaser **4.0.0** installato (i doc dicevano 3.80+).

## Chain freeze + back-movement

Timeline sequenziata (non sovrapposta):

| t | evento |
|---|--------|
| 0 ms | marble inserita → `MarbleInserted` → `_popMarble` (insert-settle 90ms su marble + vicini) |
| 90 ms | `_runMatchSequence` scatta: `chain.frozen=true`, `beginSettle` cattura pos di tutti i superstiti, `resolveMatchesFrom` rimuove il gruppo + `retractHead` condizionale, emette `Match`/`ChainReaction`/`ChainEmpty` |
| 90–210 ms | hold (120ms): gap visibile, chain ferma |
| 210–410 ms | tween `settleT 1→0` in 200ms (`Quad.easeOut`): il segmento davanti scorre indietro verso la coda |
| 410 ms | `chain.frozen=false`, gioco riprende |

### Retract condizionale
`resolveMatchesFrom` chiama `retractHead(count)` solo se `after != null` (il gruppo eliminato non è alla coda). Casi:
- **Middle match** (`before` e `after` esistono): retract porta il segmento anteriore indietro a ricongiungersi con la coda. Recoil visibile.
- **Head/front match** (`before==null`, `after!=null`): retract eseguito, ma il segmento anteriore coincide già con la pos catturata → recoil no-op (nessun movimento anomalo).
- **Tail match** (`after==null`): nessun retract, nessun recoil — la chain prosegue normalmente.

### Invarianti
- `Marble.settleT` / `beginSettle` / `setPathT` sono l'API esistente; nessuna property nuova su Marble.
- `chain.update()` non ha early-return su `frozen`: il gate è solo su `_headT`, così il tween di back-movement ha effetto visivo ogni frame.
- Match resolution e relative emit (`Match`, `ChainReaction`, `ChainEmpty`) sono ora in `GameScene._runMatchSequence`; `CollisionResolver` fa solo l'inserimento.

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