import { Curves } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import type { ParametricTemplate, PathKnobs } from '@/levels/paths/types';
import { DEFAULT_KNOBS } from '@/levels/paths/types';

export const WRAP_CCW: ParametricTemplate = {
    id: 'wrap_ccw',
    name: 'Rounded Serpent',
    build(knobs: PathKnobs = DEFAULT_KNOBS): Phaser.Curves.Path {
        const tx = (x: number) => knobs.flipH ? 720 - x : x;

        const path = new Curves.Path(tx(-MARBLE_RADIUS), 190);

        // Outer loop
        path.lineTo(tx(605), 190);
        path.cubicBezierTo(tx(665), 250, tx(638), 190, tx(665), 217);   // top-right  → ↓
        path.lineTo(tx(665), 945);
        path.cubicBezierTo(tx(605), 1005, tx(665), 978, tx(638), 1005); // bottom-right ↓ ←
        path.lineTo(tx(115), 1005);
        path.cubicBezierTo(tx(55), 945, tx(88), 1005, tx(55), 978);     // bottom-left ← ↑
        path.lineTo(tx(55), 405);

        // Transition outer left → inner
        path.cubicBezierTo(tx(560), 405, tx(55), 345, tx(560), 330);

        // Inner loop
        path.lineTo(tx(560), 825);
        path.cubicBezierTo(tx(490), 895, tx(560), 856, tx(529), 895);  // inner BR ↓ ←
        path.lineTo(tx(225), 895);
        path.cubicBezierTo(tx(155), 825, tx(194), 895, tx(155), 856);  // inner BL ← ↑
        path.lineTo(tx(155), 470);

        return path;
    },
};
