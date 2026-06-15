export interface ChapterDifficulty {
    colorCountStart: number;
    colorCountEnd:   number;
    avgRunStart:     number;
    avgRunEnd:       number;
    speedStart:      number;
    speedEnd:        number;
    marblesStart:    number;
    marblesEnd:      number;
}

// One entry per chapter (index 0 = chapter 1).
// All numeric values lerp linearly within the chapter's 20 levels (t: 0→1).
// colorCount lerps from colorCountStart to colorCountEnd — the player sees more
// colors as they approach the chapter's final levels, then the count resets
// (slightly higher than the previous chapter's start) at the next chapter.
export const CHAPTER_DIFFICULTY: ChapterDifficulty[] = [
    { colorCountStart: 3, colorCountEnd: 4, avgRunStart: 3.0, avgRunEnd: 1.2, speedStart: 1.00, speedEnd: 1.30, marblesStart: 25, marblesEnd: 40 },
    { colorCountStart: 3, colorCountEnd: 5, avgRunStart: 3.0, avgRunEnd: 1.2, speedStart: 1.00, speedEnd: 1.35, marblesStart: 28, marblesEnd: 44 },
    { colorCountStart: 4, colorCountEnd: 6, avgRunStart: 3.0, avgRunEnd: 1.2, speedStart: 1.02, speedEnd: 1.40, marblesStart: 31, marblesEnd: 48 },
    { colorCountStart: 4, colorCountEnd: 6, avgRunStart: 2.8, avgRunEnd: 1.2, speedStart: 1.05, speedEnd: 1.45, marblesStart: 34, marblesEnd: 52 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.6, avgRunEnd: 1.2, speedStart: 1.08, speedEnd: 1.50, marblesStart: 37, marblesEnd: 56 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.4, avgRunEnd: 1.2, speedStart: 1.10, speedEnd: 1.55, marblesStart: 40, marblesEnd: 60 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.2, avgRunEnd: 1.2, speedStart: 1.12, speedEnd: 1.65, marblesStart: 43, marblesEnd: 64 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.0, avgRunEnd: 1.2, speedStart: 1.15, speedEnd: 1.75, marblesStart: 46, marblesEnd: 68 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 1.8, avgRunEnd: 1.2, speedStart: 1.20, speedEnd: 1.82, marblesStart: 49, marblesEnd: 72 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 1.6, avgRunEnd: 1.2, speedStart: 1.25, speedEnd: 1.90, marblesStart: 52, marblesEnd: 80 },
];
