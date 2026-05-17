import { SaveManager, type SaveData } from '@/state/SaveManager';
import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';

class GameState {
    private data: SaveData;

    constructor() {
        this.data = SaveManager.load();
    }

    get musicMute(): boolean { return this.data.settings.musicMute; }
    get sfxMute(): boolean { return this.data.settings.sfxMute; }

    setMute(music: boolean, sfx: boolean): void {
        this.data.settings.musicMute = music;
        this.data.settings.sfxMute = sfx;
        this.persist();
        eventBus.emit(GameEvent.SettingsMuteChanged, { music, sfx });
    }

    private persist(): void {
        this.data.lastPlayedAt = Date.now();
        SaveManager.save(this.data);
    }

    touchLastPlayed(): void {
        this.persist();
    }
}

export const gameState = new GameState();
