#!/usr/bin/env tsx
/**
 * validate-paths — Build-time guard for path template geometry.
 *
 * Phaser 4 requires a canvas context at module init and cannot run in Node.
 * This script uses a pure-math NodePath that satisfies the same duck-type API
 * as Phaser.Curves.Path (getPoint / getLength / getEndPoint) to validate
 * template geometry without any browser dependency.
 *
 * Replicates getPathForLevel(1..20) logic inline.
 * Exit 1 if any level fails validation.
 *
 * MUST stay in sync with:
 *   src/levels/paths/rng.ts          (mulberry32, sampleKnobs)
 *   src/levels/paths/validator.ts    (BOUNDS, thresholds)
 *   src/levels/paths/templates/*.ts  (geometry)
 */

// ─── Pure-math path implementation ───────────────────────────────────────────

class Vec2 { constructor(public x: number, public y: number) {} }

class NodeLine {
    private _len: number;
    constructor(private p0: Vec2, private p1: Vec2) {
        this._len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    }
    getLength() { return this._len; }
    getPoint(t: number): Vec2 {
        return new Vec2(this.p0.x + (this.p1.x - this.p0.x) * t,
                        this.p0.y + (this.p1.y - this.p0.y) * t);
    }
}

class NodeCubic {
    private _len = 0;
    constructor(private p0: Vec2, private p1: Vec2, private p2: Vec2, private p3: Vec2) {}
    getLength(samples = 100) {
        if (this._len > 0) return this._len;
        let len = 0, prev = this.getPoint(0);
        for (let i = 1; i <= samples; i++) {
            const pt = this.getPoint(i / samples);
            len += Math.hypot(pt.x - prev.x, pt.y - prev.y);
            prev = pt;
        }
        return (this._len = len);
    }
    getPoint(t: number): Vec2 {
        const mt = 1 - t;
        return new Vec2(
            mt*mt*mt*this.p0.x + 3*mt*mt*t*this.p1.x + 3*mt*t*t*this.p2.x + t*t*t*this.p3.x,
            mt*mt*mt*this.p0.y + 3*mt*mt*t*this.p1.y + 3*mt*t*t*this.p2.y + t*t*t*this.p3.y,
        );
    }
}

type Segment = NodeLine | NodeCubic;

class NodePath {
    private curves: Segment[] = [];
    private _totalLen = -1;
    public current: Vec2;

    constructor(x: number, y: number) { this.current = new Vec2(x, y); }

    lineTo(x: number, y: number) {
        const target = new Vec2(x, y);
        this.curves.push(new NodeLine(this.current, target));
        this.current = target;
        this._totalLen = -1;
    }

    cubicBezierTo(ex: number, ey: number, c1x: number, c1y: number, c2x: number, c2y: number) {
        const c1 = new Vec2(c1x, c1y), c2 = new Vec2(c2x, c2y), end = new Vec2(ex, ey);
        this.curves.push(new NodeCubic(this.current, c1, c2, end));
        this.current = end;
        this._totalLen = -1;
    }

    getLength(): number {
        if (this._totalLen >= 0) return this._totalLen;
        return (this._totalLen = this.curves.reduce((s, c) => s + c.getLength(), 0));
    }

    getEndPoint(): Vec2 { return this.current; }

    getPoint(t: number): Vec2 {
        const total = this.getLength();
        let target = t * total;
        for (const c of this.curves) {
            const len = c.getLength();
            if (target <= len || c === this.curves[this.curves.length - 1]) {
                return c.getPoint(Math.min(1, Math.max(0, target / len)));
            }
            target -= len;
        }
        return this.current;
    }
}

// ─── RNG — mirrors src/levels/paths/rng.ts ───────────────────────────────────

function mulberry32(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface PathKnobs { flipH: boolean; }
const DEFAULT_KNOBS: PathKnobs = { flipH: false };

function sampleKnobs(rng: () => number): PathKnobs {
    return { flipH: rng() < 0.5 };
}

// ─── Template builders — mirrors src/levels/paths/templates/*.ts ──────────────

const MARBLE_RADIUS = 40;

function buildWrapCcw(knobs: PathKnobs): NodePath {
    const tx = (x: number) => knobs.flipH ? 720 - x : x;
    const path = new NodePath(tx(-MARBLE_RADIUS), 190);
    path.lineTo(tx(605), 190);
    path.cubicBezierTo(tx(665), 250, tx(638), 190, tx(665), 217);
    path.lineTo(tx(665), 945);
    path.cubicBezierTo(tx(605), 1005, tx(665), 978, tx(638), 1005);
    path.lineTo(tx(115), 1005);
    path.cubicBezierTo(tx(55), 945, tx(88), 1005, tx(55), 978);
    path.lineTo(tx(55), 405);
    path.cubicBezierTo(tx(560), 405, tx(55), 345, tx(560), 330);
    path.lineTo(tx(560), 825);
    path.cubicBezierTo(tx(490), 895, tx(560), 856, tx(529), 895);
    path.lineTo(tx(225), 895);
    path.cubicBezierTo(tx(155), 825, tx(194), 895, tx(155), 856);
    path.lineTo(tx(155), 470);
    return path;
}

function buildSerpentineS(knobs: PathKnobs): NodePath {
    const tx = (x: number) => knobs.flipH ? 720 - x : x;
    const path = new NodePath(tx(-MARBLE_RADIUS), 200);
    path.lineTo(tx(600), 200);
    path.cubicBezierTo(tx(660), 260, tx(630), 200, tx(660), 230);
    path.cubicBezierTo(tx(600), 320, tx(660), 290, tx(630), 320);
    path.lineTo(tx(120), 320);
    path.cubicBezierTo(tx(60), 380, tx(90), 320, tx(60), 350);
    path.cubicBezierTo(tx(120), 440, tx(60), 410, tx(90), 440);
    path.lineTo(tx(600), 440);
    path.cubicBezierTo(tx(660), 520, tx(640), 440, tx(660), 480);
    path.lineTo(tx(660), 820);
    path.cubicBezierTo(tx(600), 880, tx(660), 855, tx(635), 880);
    path.lineTo(tx(120), 880);
    path.cubicBezierTo(tx(60), 940, tx(90), 880, tx(60), 910);
    path.cubicBezierTo(tx(120), 1000, tx(60), 970, tx(90), 1000);
    path.lineTo(tx(600), 1000);
    return path;
}

function buildSpiralCorner(knobs: PathKnobs): NodePath {
    const tx = (x: number) => knobs.flipH ? 720 - x : x;
    const path = new NodePath(tx(680), 200);
    path.lineTo(tx(120), 200);
    path.cubicBezierTo(tx(80), 240, tx(98), 200, tx(80), 218);
    path.lineTo(tx(80), 920);
    path.cubicBezierTo(tx(120), 960, tx(80), 942, tx(98), 960);
    path.lineTo(tx(600), 960);
    path.cubicBezierTo(tx(640), 920, tx(622), 960, tx(640), 942);
    path.lineTo(tx(640), 380);
    path.cubicBezierTo(tx(600), 340, tx(640), 358, tx(622), 340);
    path.lineTo(tx(160), 340);
    path.cubicBezierTo(tx(120), 380, tx(138), 340, tx(120), 358);
    path.lineTo(tx(120), 1000);
    path.lineTo(tx(90),  1000);
    return path;
}

// ─── Validator — mirrors src/levels/paths/validator.ts ───────────────────────

const MIN_DIST  = 175;
const MIN_DRAIN = 220;
const CANNON    = { x: 360, y: 640 };
const MIN_LEN   = 3500;
const BOUNDS    = { xMin: 40, xMax: 680, yMin: 120, yMax: 1050 };
const SKIP      = 5;

function validateNodePath(path: NodePath, samples = 200): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    const length = path.getLength();
    if (length < MIN_LEN) errors.push(`length ${length.toFixed(0)} < ${MIN_LEN}`);

    const ep = path.getEndPoint();
    const drainDist = Math.hypot(ep.x - CANNON.x, ep.y - CANNON.y);
    if (drainDist < MIN_DRAIN) errors.push(`drain dist ${drainDist.toFixed(0)} < ${MIN_DRAIN}`);

    for (let i = 0; i <= samples; i++) {
        const pt = path.getPoint(i / samples);
        const d = Math.hypot(pt.x - CANNON.x, pt.y - CANNON.y);
        if (d < MIN_DIST) {
            errors.push(`sample ${i}: cannon dist ${d.toFixed(0)} < ${MIN_DIST} at (${pt.x.toFixed(0)},${pt.y.toFixed(0)})`);
            break;
        }
        if (i >= SKIP) {
            if (pt.x < BOUNDS.xMin || pt.x > BOUNDS.xMax) {
                errors.push(`sample ${i}: x ${pt.x.toFixed(0)} out of [${BOUNDS.xMin},${BOUNDS.xMax}]`);
                break;
            }
            if (pt.y < BOUNDS.yMin || pt.y > BOUNDS.yMax) {
                errors.push(`sample ${i}: y ${pt.y.toFixed(0)} out of [${BOUNDS.yMin},${BOUNDS.yMax}]`);
                break;
            }
        }
    }
    return { ok: errors.length === 0, errors };
}

// ─── getPathForLevel equivalent ──────────────────────────────────────────────

type Builder = (knobs: PathKnobs) => NodePath;
const BUILDERS: Builder[] = [buildWrapCcw, buildSerpentineS, buildSpiralCorner];
const CHAPTER_TEMPLATES = [BUILDERS];

function hash32(n: number): number {
    let h = (n * 2654435761) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

function getNodePath(levelId: number): { path: NodePath; fallback: boolean } {
    const chIdx = Math.min(9, Math.floor((levelId - 1) / 20));
    const tpls = CHAPTER_TEMPLATES[chIdx] ?? CHAPTER_TEMPLATES[0];
    const firstLevelId = chIdx * 20 + 1;
    const idx = (levelId - firstLevelId) % tpls.length;
    const build = tpls[idx];
    const baseSeed = hash32(levelId);
    for (let retry = 0; retry < 5; retry++) {
        const rng = mulberry32(baseSeed + retry);
        const knobs = sampleKnobs(rng);
        const path = build(knobs);
        if (validateNodePath(path).ok) return { path, fallback: false };
    }
    return { path: build(DEFAULT_KNOBS), fallback: true };
}

// ─── Main loop ───────────────────────────────────────────────────────────────

let allOk = true;
const TEMPLATE_NAMES = ['wrap_ccw', 'serpentine_s', 'spiral_corner'];

for (let id = 1; id <= 20; id++) {
    const { path, fallback } = getNodePath(id);
    const result = validateNodePath(path);
    const tplName = TEMPLATE_NAMES[(id - 1) % 3];
    if (result.ok) {
        const flag = fallback ? ' [DEFAULT_KNOBS fallback]' : '';
        console.log(`L${String(id).padStart(2, '0')} (${tplName}): OK${flag}  len=${path.getLength().toFixed(0)}`);
    } else {
        console.error(`L${String(id).padStart(2, '0')} (${tplName}): FAIL — ${result.errors.join('; ')}`);
        allOk = false;
    }
}

if (!allOk) {
    console.error('\nvalidate-paths: FAILED — one or more levels have invalid paths.');
    process.exit(1);
}
console.log('\nvalidate-paths: all-green ✓');
