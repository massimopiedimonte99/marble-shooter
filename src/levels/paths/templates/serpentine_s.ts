import { Curves } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import type { ParametricTemplate, PathKnobs } from '@/levels/paths/types';
import { DEFAULT_KNOBS } from '@/levels/paths/types';

// Continuous 5-row serpentine. Shape reads as one unbroken snake:
//   3 rows in the upper cannon-free band (y ≤ 465):
//     row1 L→R y=200, row2 R→L y=320, row3 L→R y=440
//   right-column descent through the middle (x=660, dist≥300 from cannon)
//   2 rows in the lower cannon-free band (y ≥ 815):
//     row4 R→L y=880, row5 L→R y=1000 → drain bottom-right
//
// Tightest cannon clearance: 200 px at (x=360, y=440) — 25 px above the 175 minimum.
// No jitter: shapes are deterministic; only flipH varies per level seed.

export const SERPENTINE_S: ParametricTemplate = {
    id: 'serpentine_s',
    name: 'Five-Row Serpentine',
    build(knobs: PathKnobs = DEFAULT_KNOBS): Phaser.Curves.Path {
        const tx = (x: number) => knobs.flipH ? 720 - x : x;

        const path = new Curves.Path(tx(-MARBLE_RADIUS), 200);

        // Row 1: L → R at y=200
        path.lineTo(tx(600), 200);
        path.cubicBezierTo(tx(660), 260, tx(630), 200, tx(660), 230);  // TR corner ↘

        // Hairpin back: dip to y=320, sweep left
        path.cubicBezierTo(tx(600), 320, tx(660), 290, tx(630), 320);  // turn left

        // Row 2: R → L at y=320
        path.lineTo(tx(120), 320);
        path.cubicBezierTo(tx(60), 380, tx(90), 320, tx(60), 350);     // TL nudge ↓

        // Hairpin right: rise to y=440
        path.cubicBezierTo(tx(120), 440, tx(60), 410, tx(90), 440);    // turn right

        // Row 3: L → R at y=440  (tightest: dist to cannon ≈200 at x=360)
        path.lineTo(tx(600), 440);
        path.cubicBezierTo(tx(660), 520, tx(640), 440, tx(660), 480);  // TR descent

        // Right-column descent through middle (x=660, clears cannon at any y)
        path.lineTo(tx(660), 820);
        path.cubicBezierTo(tx(600), 880, tx(660), 855, tx(635), 880);  // BR turn left

        // Row 4: R → L at y=880
        path.lineTo(tx(120), 880);
        path.cubicBezierTo(tx(60), 940, tx(90), 880, tx(60), 910);     // BL ↓

        // Hairpin right: drop to y=1000
        path.cubicBezierTo(tx(120), 1000, tx(60), 970, tx(90), 1000);  // turn right

        // Row 5: L → R at y=1000 → drain bottom-right
        path.lineTo(tx(600), 1000);

        return path;
    },
};
