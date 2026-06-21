export interface ChapterTheme {
    id: number;
    name: string;
    pathPalette: Array<[number, number, number]>;  // [halfWidth, color, alpha], 6 entries
    bgTint: number;     // gameplay-scene background tint (0xffffff = no tint)
    drainTint: number;  // drain image tint (0xffffff = no tint)
    accentHex: number;  // map banner accent
}

const SANDLOT: ChapterTheme = {
    id: 1, name: 'Sandlot Trail',
    pathPalette: [
        [40, 0x1A0900, 0.50],
        [33, 0x4B2412, 1.00],
        [26, 0x8B5A2B, 1.00],
        [19, 0xBE8540, 0.95],
        [11, 0xD9AC62, 0.78],
        [4,  0xF0D895, 0.40],
    ],
    bgTint: 0xffffff,
    drainTint: 0xffffff,
    accentHex: 0xe87363,
};

export const CHAPTER_THEMES: ChapterTheme[] = [
    SANDLOT,
    { ...SANDLOT, id: 2,  name: 'Chapter 2 (TODO theme)' },
    { ...SANDLOT, id: 3,  name: 'Chapter 3 (TODO theme)' },
    { ...SANDLOT, id: 4,  name: 'Chapter 4 (TODO theme)' },
    { ...SANDLOT, id: 5,  name: 'Chapter 5 (TODO theme)' },
    { ...SANDLOT, id: 6,  name: 'Chapter 6 (TODO theme)' },
    { ...SANDLOT, id: 7,  name: 'Chapter 7 (TODO theme)' },
    { ...SANDLOT, id: 8,  name: 'Chapter 8 (TODO theme)' },
    { ...SANDLOT, id: 9,  name: 'Chapter 9 (TODO theme)' },
    { ...SANDLOT, id: 10, name: 'Chapter 10 (TODO theme)' },
];

export function themeOfLevel(levelId: number): ChapterTheme {
    const idx = Math.min(9, Math.floor((levelId - 1) / 20));
    return CHAPTER_THEMES[idx];
}
