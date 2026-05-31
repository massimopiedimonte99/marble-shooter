import { SAVE_KEY, SAVE_VERSION } from '@/constants/Config';
import { diag } from '@/utils/DiagLogger';

export type PowerUpKey = 'bomb' | 'colorBlast' | 'freeze' | 'slingshot';

export type SaveData = {
    version: number;
    highScore: number;
    totalCoinsEarned: number;
    powerUpInventory: Record<PowerUpKey, number>;
    tutorialSeen: boolean;
    lastLevelReached: number;
};

const DEFAULT: SaveData = {
    version: SAVE_VERSION,
    highScore: 0,
    totalCoinsEarned: 0,
    powerUpInventory: { bomb: 1, colorBlast: 0, freeze: 0, slingshot: 0 },
    tutorialSeen: false,
    lastLevelReached: 1,
};

class SaveManager {
    private data: SaveData = { ...DEFAULT };
    private loaded = false;

    load(): SaveData {
        if (this.loaded) return this.data;
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) {
                this.data = { ...DEFAULT };
                diag.log('save_load', { source: 'default', reason: 'no_data' });
            } else {
                const parsed = JSON.parse(raw) as Partial<SaveData>;
                if (parsed.version !== SAVE_VERSION) {
                    this.data = { ...DEFAULT };
                    diag.log('save_version_mismatch', { found: parsed.version, expected: SAVE_VERSION });
                } else {
                    this.data = {
                        ...DEFAULT,
                        ...parsed,
                        powerUpInventory: { ...DEFAULT.powerUpInventory, ...(parsed.powerUpInventory ?? {}) },
                    } as SaveData;
                    diag.log('save_load', { source: 'storage', highScore: this.data.highScore, totalCoins: this.data.totalCoinsEarned });
                }
            }
        } catch {
            this.data = { ...DEFAULT };
            diag.log('save_load', { source: 'default', reason: 'parse_error' });
        }
        this.loaded = true;
        return this.data;
    }

    private persist(): void {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
            diag.log('save_persist', { highScore: this.data.highScore, totalCoins: this.data.totalCoinsEarned });
        } catch (e) {
            diag.log('save_persist_error', { msg: String(e) });
        }
    }

    getHighScore(): number { this.load(); return this.data.highScore; }
    getTotalCoins(): number { this.load(); return this.data.totalCoinsEarned; }
    getInventory(key: PowerUpKey): number { this.load(); return this.data.powerUpInventory[key]; }

    submitScore(score: number): { isHighScore: boolean; previous: number } {
        this.load();
        const previous = this.data.highScore;
        const isHighScore = score > previous;
        if (isHighScore) this.data.highScore = score;
        this.data.totalCoinsEarned += score;
        this.persist();
        return { isHighScore, previous };
    }

    consumePowerUp(key: PowerUpKey): boolean {
        this.load();
        if (this.data.powerUpInventory[key] <= 0) return false;
        this.data.powerUpInventory[key] -= 1;
        this.persist();
        return true;
    }

    grantPowerUp(key: PowerUpKey, amount = 1): void {
        this.load();
        this.data.powerUpInventory[key] += amount;
        this.persist();
    }

    reset(): void {
        this.data = { ...DEFAULT };
        try { localStorage.removeItem(SAVE_KEY); } catch { /* quota / private mode */ }
        this.loaded = true;
        diag.log('save_reset', {});
    }
}

export const saveManager = new SaveManager();
