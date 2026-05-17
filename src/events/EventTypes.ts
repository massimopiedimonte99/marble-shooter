export enum GameEvent {
    MenuPlayPressed = 'menu:play',
    SettingsMuteChanged = 'settings:mute-changed',
}

export interface EventPayloads {
    [GameEvent.MenuPlayPressed]: void;
    [GameEvent.SettingsMuteChanged]: { music: boolean; sfx: boolean };
}
