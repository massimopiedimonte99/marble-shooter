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