export interface ChapterDifficulty {
    colorCountStart: number;
    colorCountEnd:   number;
    avgRunStart:     number;
    avgRunEnd:       number;
    speedStart:      number;
    speedEnd:        number;
    marblesStart:    number;
    marblesEnd:      number;
    rushMultStart:       number;
    rushMultEnd:         number;
    rushDurationMsStart: number;
    rushDurationMsEnd:   number;
}

// One entry per chapter (index 0 = chapter 1).
// All numeric values lerp linearly within the chapter's 20 levels (t: 0→1).
// colorCount lerps from colorCountStart to colorCountEnd — the player sees more
// colors as they approach the chapter's final levels, then the count resets
// (slightly higher than the previous chapter's start) at the next chapter.
export const CHAPTER_DIFFICULTY: ChapterDifficulty[] = [
    { colorCountStart: 3, colorCountEnd: 4, avgRunStart: 2.7, avgRunEnd: 2.2, speedStart: 1.15, speedEnd: 1.42, marblesStart: 25, marblesEnd: 48, rushMultStart: 6.0, rushMultEnd: 7.0, rushDurationMsStart: 1300, rushDurationMsEnd: 1500 },
    { colorCountStart: 3, colorCountEnd: 5, avgRunStart: 2.9, avgRunEnd: 2.4, speedStart: 1.00, speedEnd: 1.35, marblesStart: 28, marblesEnd: 44, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 4, colorCountEnd: 6, avgRunStart: 2.8, avgRunEnd: 2.3, speedStart: 1.02, speedEnd: 1.40, marblesStart: 31, marblesEnd: 48, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 4, colorCountEnd: 6, avgRunStart: 2.7, avgRunEnd: 2.3, speedStart: 1.05, speedEnd: 1.45, marblesStart: 34, marblesEnd: 52, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.6, avgRunEnd: 2.2, speedStart: 1.08, speedEnd: 1.50, marblesStart: 37, marblesEnd: 56, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.5, avgRunEnd: 2.2, speedStart: 1.10, speedEnd: 1.55, marblesStart: 40, marblesEnd: 60, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.4, avgRunEnd: 2.1, speedStart: 1.12, speedEnd: 1.65, marblesStart: 43, marblesEnd: 64, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.3, avgRunEnd: 2.1, speedStart: 1.15, speedEnd: 1.75, marblesStart: 46, marblesEnd: 68, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.3, avgRunEnd: 2.0, speedStart: 1.20, speedEnd: 1.82, marblesStart: 49, marblesEnd: 72, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
    { colorCountStart: 5, colorCountEnd: 6, avgRunStart: 2.2, avgRunEnd: 2.0, speedStart: 1.25, speedEnd: 1.90, marblesStart: 52, marblesEnd: 80, rushMultStart: 5.0, rushMultEnd: 5.0, rushDurationMsStart: 1000, rushDurationMsEnd: 1000 },
];
