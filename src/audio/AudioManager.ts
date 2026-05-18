import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import { AudioKeys } from '@/audio/AudioKeys';
import { diag } from '@/utils/DiagLogger';

class AudioManager {
    constructor() {
        eventBus.on(GameEvent.SettingsMuteChanged, ({ music, sfx }) => {
            this.setMusicMute(music);
            this.setSfxMute(sfx);
        });
    }

    play(key: AudioKeys): void {
        diag.log('audio_play', { key });
        // no-op until real audio assets are loaded in a future phase
    }

    bindEvents(): void {
        eventBus.on(GameEvent.Match, ({ count }) => {
            if (count === 3)      this.play(AudioKeys.MATCH_3);
            else if (count === 4) this.play(AudioKeys.MATCH_4);
            else                  this.play(AudioKeys.MATCH_COMBO);
        });
        eventBus.on(GameEvent.ChainReaction, () => this.play(AudioKeys.CHAIN_REACTION));
        eventBus.on(GameEvent.ProjectileFired, () => this.play(AudioKeys.MARBLE_FIRE));
        eventBus.on(GameEvent.MarbleInserted, () => this.play(AudioKeys.MARBLE_INSERT));
    }

    muteAll(): void {}

    unmuteAll(): void {}

    setMusicMute(_muted: boolean): void {}

    setSfxMute(_muted: boolean): void {}
}

export const audioManager = new AudioManager();
