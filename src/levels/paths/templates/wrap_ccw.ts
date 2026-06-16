import { Curves } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { corner } from '@/levels/paths/helpers';
import type { PathTemplate } from '@/levels/paths/types';

export const WRAP_CCW: PathTemplate = {
    id: 'wrap_ccw',
    name: 'Rounded Serpent',
    build(): Phaser.Curves.Path {
        const path = new Curves.Path(-MARBLE_RADIUS, 190);

        // Outer loop
        path.lineTo(605, 190);
        corner(path, 665, 250, 638, 190, 665, 217);  // top-right  → ↓
        path.lineTo(665, 945);
        corner(path, 605, 1005, 665, 978, 638, 1005); // bottom-right ↓ →
        path.lineTo(115, 1005);
        corner(path, 55, 945, 88, 1005, 55, 978);    // bottom-left ← ↑
        path.lineTo(55, 405);

        // Transition outer left → inner
        path.cubicBezierTo(560, 405, 55, 345, 560, 330);

        // Inner loop
        path.lineTo(560, 825);
        corner(path, 490, 895, 560, 856, 529, 895);  // inner BR ↓ ←
        path.lineTo(225, 895);
        corner(path, 155, 825, 194, 895, 155, 856);  // inner BL ← ↑
        path.lineTo(155, 470);

        return path;
    },
};
