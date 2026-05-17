---
name: audio-events
description: Use whenever implementing game events that produce audio feedback (matches, UI actions, power-ups, level transitions, ads). Ensures all audio plays via AudioManager and follows the event map in docs/AUDIO.md.
---

# Audio Event Wiring

## Always
1. Leggi `docs/AUDIO.md` per la `AudioKey` corretta dell'evento
2. Emetti via EventBus dal gameplay, mai chiamare audio direttamente:
```ts
   EventBus.emit('match', { count: 3 });
   // AudioManager listens and plays the right sound
```
3. Se l'evento non esiste in `docs/AUDIO.md`, FERMATI e chiedi all'utente prima di aggiungerlo. Non inventare nomi file.

## Never
- Mai `scene.sound.play('some_string')` — sempre via `AudioKeys` enum + `AudioManager`
- Mai bypassare AudioManager per logica di cooldown/variants
- Mai hardcodare volume o pitch nel gameplay code — quei valori vivono in `docs/AUDIO.md` e nella config audio

## Mute regole
- Durante interstitial/rewarded ad (AdProvider eventi)
- Durante pause menu aperto
- Quando `state.audioMuted === true` (player setting)

## Aggiungere nuovo suono
1. File in `src/audio/sfx/` o `/bgm/`
2. Entry in `src/audio/AudioKeys.ts`
3. Riga in `docs/AUDIO.md` (la più importante)
4. Registra in `PreloadScene.preloadAudio()`
5. Se nuovo evento, wire in `AudioManager.bindEvents()`