import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import type { AudioKeys } from '@/audio/AudioKeys';

class AudioManager {
    constructor() {
        eventBus.on(GameEvent.SettingsMuteChanged, ({ music, sfx }) => {
            this.setMusicMute(music);
            this.setSfxMute(sfx);
        });
    }

    play(_key: AudioKeys): void {}

    muteAll(): void {}

    unmuteAll(): void {}

    setMusicMute(_muted: boolean): void {}

    setSfxMute(_muted: boolean): void {}
}

export const audioManager = new AudioManager();
