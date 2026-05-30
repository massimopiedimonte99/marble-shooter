import { Math as PhaserMath } from 'phaser';

/**
 * Wraps a Phaser Curves.Path with an arc-length look-up table so that
 * getPoint(s) returns a point at EXACTLY `s` pixels along the curve —
 * regardless of how non-uniform the raw bezier t-parameterisation is.
 *
 * This is the fix for the "marble chain looks gapped at corners" problem:
 * without this, MARBLE_SPACING in t-space ≠ MARBLE_SPACING in pixels.
 */
export class ArcLengthPath {
    private readonly _path: Phaser.Curves.Path;
    /** lut[i] = cumulative arc-length at sample i/N along the bezier */
    private readonly _lut: Float64Array;
    private readonly _N: number;
    readonly totalLength: number;

    constructor(path: Phaser.Curves.Path, resolution = 2048) {
        this._path = path;
        this._N    = resolution;
        this._lut  = new Float64Array(resolution + 1);

        const prev = new PhaserMath.Vector2();
        const curr = new PhaserMath.Vector2();
        let cumLen = 0;

        path.getPoint(0, prev);
        this._lut[0] = 0;

        for (let i = 1; i <= resolution; i++) {
            path.getPoint(i / resolution, curr);
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            cumLen += Math.sqrt(dx * dx + dy * dy);
            this._lut[i] = cumLen;
            prev.set(curr.x, curr.y);
        }

        this.totalLength = cumLen;
    }

    /** Arc-length s (pixels) → bezier parameter t ∈ [0,1] */
    tAt(s: number): number {
        if (s <= 0) return 0;
        if (s >= this.totalLength) return 1;

        let lo = 0, hi = this._N;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (this._lut[mid] <= s) lo = mid; else hi = mid;
        }

        const sLo = this._lut[lo];
        const sHi = this._lut[hi];
        const frac = (s - sLo) / (sHi - sLo);
        return (lo + frac) / this._N;
    }

    /** Return point at arc-length `s` pixels along the curve */
    getPoint(s: number, out?: PhaserMath.Vector2): PhaserMath.Vector2 | null {
        return this._path.getPoint(this.tAt(s), out);
    }

    get path(): Phaser.Curves.Path { return this._path; }
}
