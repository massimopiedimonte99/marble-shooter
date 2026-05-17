import { SAVE_KEY, SAVE_VERSION } from '@/constants/Config';

export interface SaveData {
    version: number;
    settings: {
        musicMute: boolean;
        sfxMute: boolean;
    };
    lastPlayedAt: number;
}

const DEFAULT_SAVE: SaveData = {
    version: SAVE_VERSION,
    settings: { musicMute: false, sfxMute: false },
    lastPlayedAt: 0,
};

function isValidSave(raw: unknown): raw is SaveData {
    if (typeof raw !== 'object' || raw === null) return false;
    const r = raw as Record<string, unknown>;
    return (
        typeof r['version'] === 'number' &&
        typeof r['settings'] === 'object' && r['settings'] !== null &&
        typeof (r['settings'] as Record<string, unknown>)['musicMute'] === 'boolean' &&
        typeof (r['settings'] as Record<string, unknown>)['sfxMute'] === 'boolean' &&
        typeof r['lastPlayedAt'] === 'number'
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrate(raw: any): SaveData {
    // switch on raw.version for future migrations
    switch (raw?.version) {
        default:
            return { ...DEFAULT_SAVE };
    }
}

export const SaveManager = {
    load(): SaveData {
        try {
            const json = localStorage.getItem(SAVE_KEY);
            if (!json) return { ...DEFAULT_SAVE };
            const parsed: unknown = JSON.parse(json);
            if (!isValidSave(parsed)) return migrate(parsed);
            if (parsed.version < SAVE_VERSION) return migrate(parsed);
            return parsed;
        } catch {
            return { ...DEFAULT_SAVE };
        }
    },

    save(data: SaveData): void {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        } catch {
            // quota exceeded or private mode — silently fail
        }
    },

    clear(): void {
        localStorage.removeItem(SAVE_KEY);
    },
};
