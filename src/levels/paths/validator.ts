const MIN_DIST_FROM_CANNON = 175;
const CANNON = { x: 360, y: 640 };
const MAX_Y = 1100;
const MIN_LENGTH = 3500;

export function validatePath(path: Phaser.Curves.Path, samples = 200): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    const length = path.getLength();
    if (length < MIN_LENGTH) errors.push(`length ${length.toFixed(0)} < ${MIN_LENGTH}`);

    for (let i = 0; i <= samples; i++) {
        const pt = path.getPoint(i / samples);
        if (!pt) continue;
        const d = Math.hypot(pt.x - CANNON.x, pt.y - CANNON.y);
        if (d < MIN_DIST_FROM_CANNON) {
            errors.push(`sample ${i}: dist ${d.toFixed(0)} < ${MIN_DIST_FROM_CANNON} at (${pt.x.toFixed(0)},${pt.y.toFixed(0)})`);
            break;
        }
        if (pt.y > MAX_Y) {
            errors.push(`sample ${i}: y ${pt.y.toFixed(0)} > ${MAX_Y}`);
            break;
        }
    }
    return { ok: errors.length === 0, errors };
}
