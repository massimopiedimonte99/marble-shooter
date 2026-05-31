import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';

// Settings kept in-memory only — persistence deferred to Fase 2.2 (SaveManager).
class GameState {
    musicMute = false;
    sfxMute = false;

    setMute(music: boolean, sfx: boolean): void {
        this.musicMute = music;
        this.sfxMute = sfx;
        eventBus.emit(GameEvent.SettingsMuteChanged, { music, sfx });
    }
}

export const gameState = new GameState();
