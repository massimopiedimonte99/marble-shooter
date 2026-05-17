---
name: crazygames-sdk
description: Use when implementing or debugging CrazyGames SDK v3 integration (ads, banner, gameplay events, happytime, invitation links). Reference for the CrazyGamesAdapter implementation.
---

# CrazyGames SDK v3

## Loading
Script tag in `index.html` (template specifico per build CrazyGames):
```html
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

Inject condizionale via Vite plugin se vuoi un singolo `index.html`.

## Init
```ts
await window.CrazyGames.SDK.init();
```
In localhost SDK funziona ma mostra overlay testuale al posto degli ad reali. Comportamento normale.

## Ads
```ts
// Midgame (interstitial) — cooldown interno 3 min, ignora silenziosamente se troppo presto
window.CrazyGames.SDK.ad.requestAd('midgame', {
  adStarted: () => { /* mute audio */ },
  adFinished: () => { /* resume */ },
  adError: (err) => { /* log */ }
});

// Rewarded — opt-in dell'utente
window.CrazyGames.SDK.ad.requestAd('rewarded', {
  adStarted: () => { /* mute */ },
  adFinished: () => { /* grant reward, resume */ },
  adError: () => { /* NON dare reward */ }
});

// Banner
window.CrazyGames.SDK.banner.requestBanner({
  id: 'banner-container-id',
  width: 300, height: 250
});
window.CrazyGames.SDK.banner.clearBanner('banner-container-id');
```

## Gameplay lifecycle (opzionale ma raccomandato)
```ts
window.CrazyGames.SDK.game.gameplayStart();  // su primo input giocatore
window.CrazyGames.SDK.game.gameplayStop();   // su pausa, menu, game over
window.CrazyGames.SDK.game.loadingStart();
window.CrazyGames.SDK.game.loadingStop();    // quando assets caricati
window.CrazyGames.SDK.game.happytime();      // su momenti positivi (level win, combo grande)
```

## Regole apprese
- NON aggiungere cooldown propri al midgame: l'SDK ha già 3 min interno
- NON combinare midgame between-levels con rewarded "continue" sullo stesso flow
- Banner SOLO su menu/world map, mai durante gameplay attivo
- Mobile: il banner 300x250 funziona bene sotto la safe zone

## Documentazione
https://docs.crazygames.com/sdk/html5-v3/