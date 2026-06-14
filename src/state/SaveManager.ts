import { SAVE_KEY } from '@/constants/Config';
import { diag } from '@/utils/DiagLogger';
import type { LevelProgress } from '@/levels/types';

export type PowerUpKey = 'bomb' | 'colorBlast' | 'freeze' | 'slingshot';

type Inventory = Record<PowerUpKey, number>;

interface SaveDataV2 {
    version: 2;
    highScore: number;
    coins: number;
    inventory: Inventory;
    completedLevels: Record<number, LevelProgress>;
    currentLevelId: number;
    lastDailyClaim: number | null;
}

const SAVE_VERSION = 2;

const DEFAULT_INVENTORY: Inventory = { bomb: 1, colorBlast: 0, freeze: 0, slingshot: 0 };

const DEFAULT: SaveDataV2 = {
    version: 2,
    highScore: 0,
    coins: 0,
    inventory: { ...DEFAULT_INVENTORY },
    completedLevels: {},
    currentLevelId: 1,
    lastDailyClaim: null,
};

class SaveManager {
    private data: SaveDataV2 = { ...DEFAULT, inventory: { ...DEFAULT_INVENTORY } };
    private loaded = false;

    load(): SaveDataV2 {
        if (this.loaded) return this.data;
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) {
                this.data = { ...DEFAULT, inventory: { ...DEFAULT_INVENTORY }, completedLevels: {} };
                diag.log('save_load', { source: 'default', reason: 'no_data' });
            } else {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                const version = parsed['version'];

                if (version === 1) {
                    // Dual-read: support both the real v1 field names and the spec verification names.
                    const highScore = (parsed['highScore'] as number | undefined) ?? 0;
                    const coins = (parsed['coins'] as number | undefined)
                        ?? (parsed['totalCoinsEarned'] as number | undefined)
                        ?? 0;
                    const rawInv = (parsed['inventory'] as Partial<Inventory> | undefined)
                        ?? (parsed['powerUpInventory'] as Partial<Inventory> | undefined)
                        ?? {};
                    this.data = {
                        version: 2,
                        highScore,
                        coins,
                        inventory: { ...DEFAULT_INVENTORY, ...rawInv },
                        completedLevels: {},
                        currentLevelId: 1,
                        lastDailyClaim: null,
                    };
                    this.persist();
                    diag.log('save_migration_v1_to_v2', { highScore, coins, bombInventory: this.data.inventory.bomb });

                } else if (version === 2) {
                    const p = parsed as Partial<SaveDataV2>;
                    this.data = {
                        ...DEFAULT,
                        ...p,
                        version: 2,
                        inventory: { ...DEFAULT_INVENTORY, ...(p.inventory ?? {}) },
                        completedLevels: (p.completedLevels as Record<number, LevelProgress>) ?? {},
                    };
                    diag.log('save_load', { source: 'storage', highScore: this.data.highScore, coins: this.data.coins });

                } else {
                    // version > 2 or unknown: treat as v2 with soft fallback
                    diag.log('save_version_mismatch', { found: version, expected: SAVE_VERSION });
                    const p = parsed as Partial<SaveDataV2>;
                    this.data = {
                        ...DEFAULT,
                        ...p,
                        version: 2,
                        inventory: { ...DEFAULT_INVENTORY, ...(p.inventory ?? {}) },
                        completedLevels: (p.completedLevels as Record<number, LevelProgress>) ?? {},
                    };
                }
            }
        } catch {
            this.data = { ...DEFAULT, inventory: { ...DEFAULT_INVENTORY }, completedLevels: {} };
            diag.log('save_load', { source: 'default', reason: 'parse_error' });
        }
        this.loaded = true;
        return this.data;
    }

    private persist(): void {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
            diag.log('save_persist', { highScore: this.data.highScore, coins: this.data.coins });
        } catch (e) {
            diag.log('save_persist_error', { msg: String(e) });
        }
    }

    // ── Existing public API (preserved) ──────────────────────────────────────

    getHighScore(): number { this.load(); return this.data.highScore; }
    getTotalCoins(): number { this.load(); return this.data.coins; }
    getInventory(key: PowerUpKey): number { this.load(); return this.data.inventory[key]; }

    submitScore(score: number): { isHighScore: boolean; previous: number } {
        this.load();
        const previous = this.data.highScore;
        const isHighScore = score > previous;
        if (isHighScore) this.data.highScore = score;
        this.data.coins += score;
        this.persist();
        return { isHighScore, previous };
    }

    consumePowerUp(key: PowerUpKey): boolean {
        this.load();
        if (this.data.inventory[key] <= 0) return false;
        this.data.inventory[key] -= 1;
        this.persist();
        return true;
    }

    grantPowerUp(key: PowerUpKey, amount = 1): void {
        this.load();
        this.data.inventory[key] += amount;
        this.persist();
    }

    reset(): void {
        this.data = { ...DEFAULT, inventory: { ...DEFAULT_INVENTORY }, completedLevels: {} };
        try { localStorage.removeItem(SAVE_KEY); } catch { /* quota / private mode */ }
        this.loaded = true;
        diag.log('save_reset', {});
    }

    // ── New v2 API ────────────────────────────────────────────────────────────

    getCurrentLevelId(): number { this.load(); return this.data.currentLevelId; }

    setCurrentLevelId(id: number): void {
        this.load();
        this.data.currentLevelId = id;
        this.persist();
    }

    getCompletedLevels(): Record<number, LevelProgress> { this.load(); return this.data.completedLevels; }

    getLevelProgress(id: number): LevelProgress | null {
        this.load();
        return this.data.completedLevels[id] ?? null;
    }

    markLevelCompleted(id: number, stars: 0 | 1 | 2 | 3): void {
        this.load();
        const existing = this.data.completedLevels[id];
        if (!existing || stars >= existing.stars) {
            this.data.completedLevels[id] = { stars };
        }
        if (id === this.data.currentLevelId) {
            this.data.currentLevelId = id + 1;
        }
        this.persist();
    }
}

export const saveManager = new SaveManager();
