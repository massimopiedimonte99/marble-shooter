---
name: poki-sdk
description: Use when implementing or debugging Poki SDK integration. Reference for the PokiAdapter implementation. Includes Poki's strict gameplay event rules and submission requirements.
---

# Poki SDK

## Loading
Script tag in `index.html` (template specifico per build Poki):
```html
<script src="//game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
```

## Init
```ts
PokiSDK.init()
  .then(() => { /* SDK ready */ })
  .catch(() => { /* SDK blocked (adblock) — il gioco DEVE funzionare comunque */ });
```

## Lifecycle (critico per certification)
```ts
PokiSDK.gameLoadingStart();
// ...preload assets...
PokiSDK.gameLoadingFinished();  // quando assets caricati e gioco è giocabile

PokiSDK.gameplayStart();  // su PRIMO INPUT del giocatore, NON su scene load
PokiSDK.gameplayStop();   // su pausa, game over, ritorno al menu

// Mai gameplayStart() consecutivi senza gameplayStop()
```

## Ads
```ts
// Interstitial (midgame). Frequenza gestita da Poki, non aggiungere timer
await PokiSDK.commercialBreak();  // chiamare SOLO uscendo dalla pausa verso gameplay

// Rewarded
const success = await PokiSDK.rewardedBreak();
if (success) { /* grant reward */ }
```

## Requirement di submission Poki
- Initial download < 8 MB
- Save system (localStorage minimo)
- Progression visibile (livelli, sblocchi, stelle)
- Implementare correttamente gameplay events
- Tutorial implicito o esplicito al primo avvio
- Mobile-compatible (touch input primario)
- Niente external links, niente external API non approvate
- Thumbnail statiche (16:9) + animate (mp4 silenzioso)

## Don't
- NON chiamare `commercialBreak()` durante gameplay attivo
- NON chiamare `gameplayStart()` su scene load del livello — aspetta input
- NON usare timer propri per frequenza ad
- NON bloccare il gioco se Poki SDK fallisce a inizializzare

## Documentazione
https://sdk.poki.com/