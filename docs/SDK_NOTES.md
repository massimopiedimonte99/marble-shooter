# SDK Notes per Piattaforma

## CrazyGames
- SDK script: https://sdk.crazygames.com/crazygames-sdk-v3.js
- Submission portal: https://developer.crazygames.com/
- Frequenza ad midgame gestita internamente (cooldown 3 min)
- Banner: solo su menu/non-gameplay
- Local dev: l'SDK funziona, mostra overlay testuale al posto degli ad

## Poki
- SDK script: //game-cdn.poki.com/scripts/v2/poki-sdk.js
- Submission: tramite contact con publisher manager
- Strict requirements: vedi `.claude/skills/poki-sdk/SKILL.md`
- gameplayStart() su primo input, NON su scene load
- Max initial download 8 MB

## GameDistribution
- SDK script: https://html5.api.gamedistribution.com/main.min.js
- Più permissivo su submission
- Usa Google IMA SDK internamente

## GameMonetize
- Simile a GameDistribution, da documentare quando integri

## Quirk piattaforma cross-cutting
- Mobile Safari: audio context richiede gesture utente per startare
- Chrome desktop: prevent default su wheel event per evitare zoom
- Firefox: alcuni `requestAnimationFrame` con timing leggermente diverso, irrilevante per noi