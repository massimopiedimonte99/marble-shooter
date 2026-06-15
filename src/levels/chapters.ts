import type { ChapterDefinition } from './types';
import { AssetKeys } from '@/constants/AssetKeys';

const CHAPTER_NAMES = [
    'Meadow', 'Caves', 'Beach', 'Forest', 'Desert',
    'Glacier', 'Volcano', 'Sky', 'Ruins', 'Cosmos',
];

export const CHAPTERS: ChapterDefinition[] = CHAPTER_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    bgKey: AssetKeys.BG_GAMEPLAY,
    firstLevelId: i * 20 + 1,
    lastLevelId: (i + 1) * 20,
}));

export function chapterOfLevel(levelId: number): ChapterDefinition {
    const idx = Math.min(9, Math.floor((levelId - 1) / 20));
    return CHAPTERS[idx];
}

export const CHAPTER_BG_TINTS: number[] = [
    0xf4e5c2, // 1 Meadow — warm cream
    0x2da6a8, // 2 Caves — cool teal
    0xe87363, // 3 Beach — coral peach
    0x6ba368, // 4 Forest — forest green
    0xe4b942, // 5 Desert — mustard sand
    0xa8d4e0, // 6 Glacier — ice blue
    0xc94c4c, // 7 Volcano — lava red
    0x88b8d6, // 8 Sky — soft sky
    0x8b6a4f, // 9 Ruins — earth brown
    0x6b4d8e, // 10 Cosmos — deep purple
];

export const CHAPTER_NODE_TINTS: number[] = [
    0xffffff, // 1 — no tint
    0x9adde0, // 2 — light teal
    0xffb39e, // 3 — light coral
    0xb5d8a8, // 4 — light green
    0xf5d77a, // 5 — light mustard
    0xd8eef5, // 6 — very light blue
    0xffa896, // 7 — warm coral
    0xc5dff0, // 8 — pale sky
    0xc8a98a, // 9 — light brown
    0xb59ed1, // 10 — soft purple
];

export const BG_TINT_ALPHA = 0.18;
