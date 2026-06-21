const MIN_DIST_FROM_CANNON = 175;
const MIN_DRAIN_DIST_FROM_CANNON = 220;
const CANNON = { x: 360, y: 640 };
const MIN_LENGTH = 3500;
const BOUNDS = { xMin: 40, xMax: 680, yMin: 120, yMax: 1050 };
// First few samples are skipped for the x/y bounds check because path entries
// are intentionally positioned off-screen (negative x or beyond screen right).
const BOUNDS_START = 5;

export function validatePath(path: Phaser.Curves.Path, samples = 200): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    const length = path.getLength();
    if (length < MIN_LENGTH) errors.push(`length ${length.toFixed(0)} < ${MIN_LENGTH}`);

    const endPt = path.getEndPoint();
    if (endPt) {
        const d = Math.hypot(endPt.x - CANNON.x, endPt.y - CANNON.y);
        if (d < MIN_DRAIN_DIST_FROM_CANNON) {
            errors.push(`drain dist ${d.toFixed(0)} < ${MIN_DRAIN_DIST_FROM_CANNON} at (${endPt.x.toFixed(0)},${endPt.y.toFixed(0)})`);
        }
    }

    for (let i = 0; i <= samples; i++) {
        const pt = path.getPoint(i / samples);
        if (!pt) continue;

        const d = Math.hypot(pt.x - CANNON.x, pt.y - CANNON.y);
        if (d < MIN_DIST_FROM_CANNON) {
            errors.push(`sample ${i}: dist ${d.toFixed(0)} < ${MIN_DIST_FROM_CANNON} at (${pt.x.toFixed(0)},${pt.y.toFixed(0)})`);
            break;
        }

        if (i >= BOUNDS_START) {
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
