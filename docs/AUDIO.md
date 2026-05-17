# Audio Event Map — Marble Shooter

## Convenzioni
- File in `src/audio/sfx/` e `src/audio/bgm/`, formato `.ogg` (compatibile web ovunque)
- Tutti gli SFX preloadati in PreloadScene; BGM streaming on-demand
- Normalizza tutti i file source a -3 dBFS in Audacity prima dell'import
- SEMPRE via `AudioManager.play(AudioKeys.X)`, MAI `scene.sound.play()` diretto
- Variants random: se key ha `_a/_b/_c`, AudioManager pesca random per evitare fatigue

## Gameplay SFX

| Trigger event | AudioKey | File | Vol | Pitch variation | Cooldown | Note |
|---|---|---|---|---|---|---|
| Tap to shoot | MARBLE_FIRE | sfx/marble_fire.ogg | 0.6 | ±8% | 80ms | Cooldown evita spam |
| Proiettile entra in catena | MARBLE_INSERT | sfx/marble_insert.ogg | 0.5 | ±5% | - | Click secco |
| Match 3 palline | MATCH_3 | sfx/match_3_{a,b,c}.ogg | 0.7 | ±3% | - | 3 variants random |
| Match 4 palline | MATCH_4 | sfx/match_4.ogg | 0.8 | - | - | Pitch più alto di match_3 |
| Match 5+ palline | MATCH_COMBO | sfx/match_combo.ogg | 0.9 | - | - | Boom soddisfacente, rare |
| Chain reaction (match dopo match) | CHAIN_REACTION | sfx/chain.ogg | 0.85 | +5% per step, cap +25% | - | Pitch sale a ogni concatenamento |
| Catena vicino al drain | DRAIN_WARNING | sfx/drain_warning.ogg | 0.7 | - | 3000ms | Trigger quando catena entra negli ultimi 20% del path |
| Game over (drain reached) | GAME_OVER | sfx/game_over.ogg | 0.8 | - | - | One-shot, mai loop |
| Wall bounce | WALL_BOUNCE | sfx/bounce.ogg | 0.4 | ±15% | 50ms | Solo se implementi rimbalzi |

## Power-ups SFX

| Trigger event | AudioKey | File | Vol | Note |
|---|---|---|---|---|
| Slow motion attivato | PU_SLOWMO_ON | sfx/pu_slowmo_on.ogg | 0.7 | Effetto "vwoosh" rallenta |
| Slow motion finito | PU_SLOWMO_OFF | sfx/pu_slowmo_off.ogg | 0.6 | Speed-up indietro |
| Color bomb explosion | PU_COLORBOMB | sfx/pu_colorbomb.ogg | 0.9 | Boom + sparkles |
| Reverse attivato | PU_REVERSE | sfx/pu_reverse.ogg | 0.75 | Effetto "rewind" |
| Aim laser on/off | PU_LASER | sfx/pu_laser.ogg | 0.5 | Beep elettronico |
| Color converter | PU_COLOR_CHANGE | sfx/pu_color.ogg | 0.7 | Splash di colore |
| Backtrack | PU_BACKTRACK | sfx/pu_backtrack.ogg | 0.8 | Whoosh + chime |

## Meta SFX

| Trigger event | AudioKey | File | Vol | Note |
|---|---|---|---|---|
| Stella ottenuta | STAR_EARNED | sfx/star_{1,2,3}.ogg | 0.7 | 3 file diversi, pitch crescente |
| Level complete | LEVEL_WIN | sfx/level_win.ogg | 0.85 | Jingle 1-2 sec, suonato prima del BGM victory |
| Level fail | LEVEL_FAIL | sfx/level_fail.ogg | 0.7 | Jingle breve |
| Coin pickup | COIN_PICKUP | sfx/coin.ogg | 0.5 | ±10% pitch | Cooldown 30ms se multipli simultanei |
| Gem pickup | GEM_PICKUP | sfx/gem.ogg | 0.6 | - |
| Chest open | CHEST_OPEN | sfx/chest_open.ogg | 0.8 | - |
| Daily wheel spin start | WHEEL_START | sfx/wheel_start.ogg | 0.7 | - |
| Daily wheel spin loop | WHEEL_LOOP | sfx/wheel_loop.ogg | 0.5 | Loop durante rotazione |
| Daily wheel stop on segment | WHEEL_STOP | sfx/wheel_stop.ogg | 0.8 | Click finale |
| Daily reward claim | REWARD_CLAIM | sfx/reward.ogg | 0.75 | - |
| Ad rewarded completed | AD_REWARD | sfx/ad_reward.ogg | 0.8 | Suona quando arriva la ricompensa post-ad |

## UI SFX

| Trigger event | AudioKey | File | Vol | Note |
|---|---|---|---|---|
| Button tap | UI_TAP | sfx/ui_tap.ogg | 0.4 | ±5% pitch | Cooldown 50ms |
| Panel open | UI_OPEN | sfx/ui_open.ogg | 0.45 | - |
| Panel close | UI_CLOSE | sfx/ui_close.ogg | 0.45 | - |
| Tab switch | UI_TAB | sfx/ui_tab.ogg | 0.35 | - |
| Error / disabled tap | UI_ERROR | sfx/ui_error.ogg | 0.4 | - |
| Notification popup | UI_NOTIFY | sfx/ui_notify.ogg | 0.5 | - |

## BGM

| Context | AudioKey | File | Vol | Loop | Crossfade |
|---|---|---|---|---|---|
| Menu / world map | BGM_MENU | bgm/menu_loop.ogg | 0.35 | yes | 1500ms |
| Gameplay world 1 (jungle) | BGM_W1 | bgm/world1_loop.ogg | 0.45 | yes | 1500ms |
| Gameplay world 2 (ice) | BGM_W2 | bgm/world2_loop.ogg | 0.45 | yes | 1500ms |
| Gameplay world 3 (desert) | BGM_W3 | bgm/world3_loop.ogg | 0.45 | yes | 1500ms |
| Victory sting (sovrapposto, no loop) | BGM_WIN_STING | bgm/win_sting.ogg | 0.6 | no | - |

## Regole comportamentali per Claude Code

1. **Mai play diretto**: ogni audio passa per `AudioManager.play(AudioKeys.X)`.
2. **Mai stringhe magiche**: usa sempre l'enum, mai `'sfx_marble_fire'`.
3. **Wiring via EventBus**: gli eventi gameplay emettono su `EventBus.emit('match', {count})`, AudioManager subscribed risponde. Mai chiamate audio dentro la logica di match/collision.
4. **Match scaling automatico**: AudioManager mappa `match` event → MATCH_3/4/COMBO basandosi su `count` payload, gameplay code non sceglie.
5. **Cooldown enforcement**: AudioManager applica cooldown da config, gameplay code chiama liberamente.
6. **Mute durante ad**: AudioManager.muteAll() su `AdProvider` event `adStarted`, unmute su `adFinished`. Requirement esplicito di CrazyGames e Poki.

## Aggiungere un nuovo suono — checklist
1. Drop file in `src/audio/sfx/` o `/bgm/`
2. Aggiungi entry a `src/audio/AudioKeys.ts`
3. Aggiungi riga in questo file (la più importante)
4. Registra in `PreloadScene.preloadAudio()`
5. Se è nuovo evento, wire-up in `AudioManager.bindEvents()`