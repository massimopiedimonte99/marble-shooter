import type { MarbleColor } from '@/gameplay/MarbleColor';

export enum GameEvent {
    MenuPlayPressed = 'menu:play',
    SettingsMuteChanged = 'settings:mute-changed',
    ProjectileFired = 'projectile:fired',
    MarbleInserted = 'marble:inserted',
}

export interface EventPayloads {
    [GameEvent.MenuPlayPressed]: void;
    [GameEvent.SettingsMuteChanged]: { music: boolean; sfx: boolean };
    [GameEvent.ProjectileFired]: { color: MarbleColor };
    [GameEvent.MarbleInserted]: { color: MarbleColor; x: number; y: number };
}
