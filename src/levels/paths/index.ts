import { chapterOfLevel } from '@/levels/chapters';
import { validatePath } from '@/levels/paths/validator';
import { mulberry32, sampleKnobs } from '@/levels/paths/rng';
import { DEFAULT_KNOBS } from '@/levels/paths/types';
import type { ParametricTemplate } from '@/levels/paths/types';
import { WRAP_CCW } from '@/levels/paths/templates/wrap_ccw';
import { SERPENTINE_S } from '@/levels/paths/templates/serpentine_s';
import { SPIRAL_CORNER } from '@/levels/paths/templates/spiral_corner';
import { diag } from '@/utils/DiagLogger';

const TEMPLATES: Record<string, ParametricTemplate> = {
    wrap_ccw:      WRAP_CCW,
    serpentine_s:  SERPENTINE_S,
    spiral_corner: SPIRAL_CORNER,
};

// One row per chapter (index 0 = chapter 1).
// Chapters 2..10 fall back to chapter 1's set until dedicated layouts are designed.
const CHAPTER_TEMPLATES: string[][] = [
    ['wrap_ccw', 'serpentine_s', 'spiral_corner'], // chapter 1
];

// Simple 32-bit multiplicative hash — deterministic, no Date/Math.random.
function hash32(n: number): number {
    let h = (n * 2654435761) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
}

export function getPathForLevel(levelId: number): Phaser.Curves.Path {
    const ch = chapterOfLevel(levelId);
    const tpls = CHAPTER_TEMPLATES[ch.id - 1] ?? CHAPTER_TEMPLATES[0];
    const idx = (levelId - ch.firstLevelId) % tpls.length;
    const tpl = TEMPLATES[tpls[idx]];

    const baseSeed = hash32(levelId);
    for (let retry = 0; retry < 5; retry++) {
        const rng = mulberry32(baseSeed + retry);
        const knobs = sampleKnobs(rng);
        const path = tpl.build(knobs);
        if (validatePath(path).ok) return path;
    }

    diag.log('path_fallback', { levelId, templateId: tpl.id });
    return tpl.build(DEFAULT_KNOBS);
}
