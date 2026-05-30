import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import { AudioKeys } from '@/audio/AudioKeys';
import { sfxSynth } from '@/audio/SfxSynth';
import { diag } from '@/utils/DiagLogger';

class AudioManager {
    private _sfxMuted = false;
    private _eventsWired = false;

    constructor() {
        eventBus.on(GameEvent.SettingsMuteChanged, ({ sfx }) => {
            this._sfxMuted = sfx;
            sfxSynth.setMuted(sfx);
        });
    }

    play(key: AudioKeys): void {
        diag.log('audio_play', { key });
        switch (key) {
            case AudioKeys.MARBLE_FIRE:    sfxSynth.fire();       break;
            case AudioKeys.MARBLE_INSERT:  sfxSynth.insert();     break;
            case AudioKeys.MATCH_3:        sfxSynth.match(3);     break;
            case AudioKeys.MATCH_4:        sfxSynth.match(4);     break;
            case AudioKeys.MATCH_COMBO:    sfxSynth.match(5);     break;
            case AudioKeys.CHAIN_REACTION: sfxSynth.chainStep(1); break;
            case AudioKeys.WIN:            sfxSynth.win();        break;
            case AudioKeys.GAME_OVER:      sfxSynth.gameOver();   break;
        }
    }

    playCombo(level: number): void { sfxSynth.combo(level); }
    playDanger(): void { sfxSynth.danger(); }

    bindEvents(): void {
        if (this._eventsWired) return;
        this._eventsWired = true;

        eventBus.on(GameEvent.ProjectileFired, () => sfxSynth.fire());
        eventBus.on(GameEvent.MarbleInserted,  () => sfxSynth.insert());
        eventBus.on(GameEvent.Match, ({ count }) => sfxSynth.match(count));
        eventBus.on(GameEvent.ChainReaction, ({ steps }) => {
            for (let s = 1; s <= steps; s++) {
                setTimeout(() => sfxSynth.chainStep(s), (s - 1) * 90);
            }
        });
        eventBus.on(GameEvent.LevelCompleted, () => sfxSynth.win());
        eventBus.on(GameEvent.GameOver, () => sfxSynth.gameOver());
    }

    unbindEvents(): void {
        this._eventsWired = false;
        eventBus.off(GameEvent.ProjectileFired);
        eventBus.off(GameEvent.MarbleInserted);
        eventBus.off(GameEvent.Match);
        eventBus.off(GameEvent.ChainReaction);
        eventBus.off(GameEvent.LevelCompleted);
        eventBus.off(GameEvent.GameOver);
    }

    muteAll(): void { sfxSynth.setMuted(true); }
    unmuteAll(): void { sfxSynth.setMuted(this._sfxMuted); }
    setMusicMute(_muted: boolean): void {}
    setSfxMute(muted: boolean): void { this._sfxMuted = muted; sfxSynth.setMuted(muted); }
}

export const audioManager = new AudioManager();
