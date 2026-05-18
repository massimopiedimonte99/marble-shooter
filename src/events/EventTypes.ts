import type { MarbleColor } from '@/gameplay/MarbleColor';

export enum GameEvent {
    MenuPlayPressed = 'menu:play',
    SettingsMuteChanged = 'settings:mute-changed',
    ProjectileFired = 'projectile:fired',
    MarbleInserted = 'marble:inserted',
    Match = 'match',
    ChainReaction = 'chainReaction',
    ChainEmpty = 'chainEmpty',
    LevelCompleted = 'levelCompleted',
    GameOver = 'gameOver',
}

export interface EventPayloads {
    [GameEvent.MenuPlayPressed]: void;
    [GameEvent.SettingsMuteChanged]: { music: boolean; sfx: boolean };
    [GameEvent.ProjectileFired]: { color: MarbleColor };
    [GameEvent.MarbleInserted]: { color: MarbleColor; x: number; y: number };
    [GameEvent.Match]: { count: number; color: MarbleColor; position: { x: number; y: number } };
    [GameEvent.ChainReaction]: { steps: number; totalRemoved: number };
    [GameEvent.ChainEmpty]: Record<string, never>;
    [GameEvent.LevelCompleted]: { chainStepsTotal?: number };
    [GameEvent.GameOver]: { chainLengthAtDeath: number };
}
