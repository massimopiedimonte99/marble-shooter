---
name: ad-provider-abstraction
description: Use when integrating monetization, ad calls, rewarded videos, interstitials, banners, or platform-specific ad SDKs. Ensures all ad logic stays decoupled from gameplay code.
---

# Ad Provider Abstraction

## Regola di ferro
Il gameplay NON conosce CrazyGames, Poki, GameDistribution. Conosce solo l'interface `IAdProvider`. Cambiare piattaforma deve essere un cambio di build flag, non di codice gameplay.

## Interface (in `src/ads/IAdProvider.ts`)

```ts
export interface IAdProvider {
  init(): Promise<void>;
  
  // Lifecycle (richiesto da Poki, ignorato altrove)
  notifyGameplayStart(): void;
  notifyGameplayStop(): void;
  notifyLoadingFinished(): void;
  
  // Ads
  showInterstitial(): Promise<AdResult>;
  showRewarded(): Promise<RewardedResult>;
  showBanner(position: 'top' | 'bottom'): void;
  hideBanner(): void;
  
  // Feature flags
  isAdSupported(): boolean;  // false in dev mode
  isRewardedAvailable(): Promise<boolean>;
}

export type AdResult = { shown: boolean; reason?: string };
export type RewardedResult = { rewarded: boolean; reason?: string };
```

## Factory (in `src/ads/AdProviderFactory.ts`)

Seleziona implementazione a runtime via `import.meta.env.VITE_PLATFORM`:
- `crazygames` → `CrazyGamesAdapter`
- `poki` → `PokiAdapter`
- `gamedistribution` → `GameDistributionAdapter`
- `dev` o undefined → `NoopAdProvider` (logga, non mostra nulla)

Build per piattaforma: `VITE_PLATFORM=poki pnpm build`.

## Wiring via EventBus

Il gameplay emette eventi, MAI chiama provider direttamente:

```ts
// gameplay
EventBus.emit('gameplayStarted');
EventBus.emit('levelCompleted', { level: 3 });
EventBus.emit('gameOver');

// AdOrchestrator (src/ads/AdOrchestrator.ts) ascolta e decide:
// - su gameplayStarted → adProvider.notifyGameplayStart()
// - su levelCompleted → adProvider.showInterstitial() (con cooldown)
// - su gameOver → mostra UI "continue?" che, se accettata, chiama adProvider.showRewarded()
```

## Cooldown e frequency
NON implementare cooldown ad lato nostro per CrazyGames/Poki — gli SDK lo fanno meglio. Per altre piattaforme usa `AdOrchestrator.canShowInterstitial()` con cooldown min 90s.

## Mute audio durante ad
Sempre. AudioManager subscribe a `EventBus.on('adStarted', muteAll)` e `'adEnded', unmuteAll`. Requirement esplicito di Poki, CrazyGames lo apprezza.

## Don't
- Mai `window.CrazyGames.SDK.x()` o `PokiSDK.x()` da fuori la cartella `src/ads/`
- Mai hardcodare placement IDs
- Mai bloccare l'UI in attesa di un ad — sempre con timeout e fallback