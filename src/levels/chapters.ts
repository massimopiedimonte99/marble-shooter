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
