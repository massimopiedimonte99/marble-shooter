const COMBO_WINDOW_MS = 2400;

export class ComboTracker {
    private _level = 1;
    private _lastMatchTime = -Infinity;
    private _onLevelUp?: (level: number) => void;

    onLevelUp(cb: (level: number) => void): this {
        this._onLevelUp = cb;
        return this;
    }

    /** Call on every match. Returns the current multiplier to apply. */
    registerMatch(now: number): number {
        if (now - this._lastMatchTime <= COMBO_WINDOW_MS) {
            this._level = Math.min(this._level + 1, 6);
            this._onLevelUp?.(this._level);
        } else {
            this._level = 1;
        }
        this._lastMatchTime = now;
        return this._level;
    }

    get level(): number { return this._level; }

    reset(): void {
        this._level = 1;
        this._lastMatchTime = -Infinity;
    }
}
