import type { MarbleColor } from '@/gameplay/MarbleColor';
import type { Marble } from '@/gameplay/Marble';

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
    // ── Bomb power-up ──────────────────────────────────────────────────────────
    BombLoaded   = 'bomb:loaded',
    BombUnloaded = 'bomb:unloaded',
    BombFired    = 'bomb:fired',
    BombInserted = 'bomb:inserted',
    BombImpact   = 'bomb:impact',
}

export interface EventPayloads {
    [GameEvent.MenuPlayPressed]: void;
    [GameEvent.SettingsMuteChanged]: { music: boolean; sfx: boolean };
    [GameEvent.ProjectileFired]: { color: MarbleColor };
    [GameEvent.MarbleInserted]: { color: MarbleColor; x: number; y: number; marble: Marble };
    [GameEvent.Match]: { count: number; color: MarbleColor; position: { x: number; y: number } };
    [GameEvent.ChainReaction]: { steps: number; totalRemoved: number };
    [GameEvent.ChainEmpty]: Record<string, never>;
    [GameEvent.LevelCompleted]: { chainStepsTotal?: number };
    [GameEvent.GameOver]: { chainLengthAtDeath: number };
    [GameEvent.BombLoaded]:    Record<string, never>;
    [GameEvent.BombUnloaded]:  { reason: 'user_toggle' | 'scene_end' };
    [GameEvent.BombFired]:     Record<string, never>;
    [GameEvent.BombInserted]:  { marble: Marble; centerX: number; centerY: number };
    [GameEvent.BombImpact]:    { x: number; y: number; marble: Marble };
}
