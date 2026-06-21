import { Curves } from 'phaser';
import type { ParametricTemplate, PathKnobs } from '@/levels/paths/types';
import { DEFAULT_KNOBS } from '@/levels/paths/types';

// CCW spiral: outer rectangle → inner rectangle → drain bottom-left.
// Entry top-right (680, 200). Outer walls: x=80..640, y=200..960.
// Inner walls: x=120..640, y=340..1000. Lateral walls clear cannon at any y (dist≥240).
// Top/bottom rows clear cannon at any x (min dist 240+ at y=340/960).

export const SPIRAL_CORNER: ParametricTemplate = {
    id: 'spiral_corner',
    name: 'Corner Spiral',
    build(knobs: PathKnobs = DEFAULT_KNOBS): Phaser.Curves.Path {
        const tx = (x: number) => knobs.flipH ? 720 - x : x;

        const path = new Curves.Path(tx(680), 200);

        // Outer top — going left
        path.lineTo(tx(120), 200);
        path.cubicBezierTo(tx(80), 240, tx(98), 200, tx(80), 218);      // TL: ← ↓

        // Outer left — going down
        path.lineTo(tx(80), 920);
        path.cubicBezierTo(tx(120), 960, tx(80), 942, tx(98), 960);     // BL: ↓ →

        // Outer bottom — going right
        path.lineTo(tx(600), 960);
        path.cubicBezierTo(tx(640), 920, tx(622), 960, tx(640), 942);   // BR: → ↑

        // Inner right — going up
        path.lineTo(tx(640), 380);
        path.cubicBezierTo(tx(600), 340, tx(640), 358, tx(622), 340);   // inner TR: ↑ ←

        // Inner top — going left
        path.lineTo(tx(160), 340);
        path.cubicBezierTo(tx(120), 380, tx(138), 340, tx(120), 358);   // inner TL: ← ↓

        // Inner left — going down to drain
        path.lineTo(tx(120), 1000);
        path.lineTo(tx(90),  1000);     // drain bottom-left

        return path;
    },
};
