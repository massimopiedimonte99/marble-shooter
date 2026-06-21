import type { LevelDefinition, ChapterDefinition } from './types';
import { MarbleColor } from '@/gameplay/MarbleColor';
import { CHAPTERS, chapterOfLevel } from './chapters';
import { CHAPTER_DIFFICULTY } from './difficulty';
import { saveManager } from '@/state/SaveManager';

/**
 * Generates a pre-determined marble color sequence for a level.
 * Colors are grouped into runs of random length centred on avgRunLength,
 * ensuring consecutive runs always differ in color.
 */
export function generateChainSequence(
    total: number,
    colorCount: number,
    avgRunLength: number,
): MarbleColor[] {
    const seq: MarbleColor[] = [];
    let lastColor = -1;
    while (seq.length < total) {
        let c: number;
        do { c = Math.floor(Math.random() * colorCount); } while (c === lastColor && colorCount > 1);
        // Geometric distribution capped at ceil(avgRunLength).
        // Mean ≈ avgRunLength, more singletons than the old formula, and the cap
        // prevents the unbounded tail from producing occasional very long runs.
        const p   = Math.max(0, (avgRunLength - 1) / avgRunLength);
        const cap = Math.max(2, Math.ceil(avgRunLength));
        let runLen = 1;
        while (Math.random() < p && runLen < cap) runLen++;
        const actual = Math.min(runLen, total - seq.length);
        for (let i = 0; i < actual; i++) seq.push(c as MarbleColor);
        lastColor = c;
    }
    return seq;
}

declare global {
    interface Window {
        __levelManager?: LevelManager;
    }
}

function generateLevel(id: number): LevelDefinition {
    const chapter = chapterOfLevel(id);
    const chapterIndex = id - chapter.firstLevelId + 1;

    // t: 0 at chapter's first level, 1 at its last (always 20 levels per chapter)
    const t = (id - chapter.firstLevelId) / 19;
    const d = CHAPTER_DIFFICULTY[chapter.id - 1];

    const lerp = (a: number, b: number) => a + (b - a) * t;

    const totalMarbles         = Math.round(lerp(d.marblesStart, d.marblesEnd));
    const colorCount           = Math.round(lerp(d.colorCountStart, d.colorCountEnd));
    const chainSpeedMultiplier = +lerp(d.speedStart, d.speedEnd).toFixed(2);
    const avgRunLength         = +lerp(d.avgRunStart, d.avgRunEnd).toFixed(2);
    const chainSequence        = generateChainSequence(totalMarbles, colorCount, avgRunLength);
    const rushMult             = +lerp(d.rushMultStart, d.rushMultEnd).toFixed(2);
    const rushDurationMs       = Math.round(lerp(d.rushDurationMsStart, d.rushDurationMsEnd));

    const baseScore = totalMarbles * 7 * chainSpeedMultiplier;
    return {
        id, chapterId: chapter.id, chapterIndex,
        totalMarbles, colorCount, chainSpeedMultiplier, avgRunLength, chainSequence,
        rushMult, rushDurationMs,
        scoreFor1Star:  Math.round(baseScore),
        scoreFor2Stars: Math.round(baseScore * 1.5),
        scoreFor3Stars: Math.round(baseScore * 2.2),
    };
}

class LevelManager {
    private levels: LevelDefinition[];

    constructor() {
        this.levels = [];
        for (let i = 1; i <= 200; i++) {
            this.levels.push(generateLevel(i));
        }

        if (import.meta.env.DEV) {
            window.__levelManager = this;
        }
    }

    getLevel(id: number): LevelDefinition {
        return this.levels[id - 1];
    }

    getChapter(id: number): ChapterDefinition {
        return chapterOfLevel(id);
    }

    getAllChapters(): ChapterDefinition[] {
        return CHAPTERS;
    }

    getLevelsOfChapter(chapterId: number): LevelDefinition[] {
        const chapter = CHAPTERS[chapterId - 1];
        return this.levels.slice(chapter.firstLevelId - 1, chapter.lastLevelId);
    }

    getStarsForScore(level: LevelDefinition, score: number): 0 | 1 | 2 | 3 {
        if (score >= level.scoreFor3Stars) return 3;
        if (score >= level.scoreFor2Stars) return 2;
        if (score >= level.scoreFor1Star) return 1;
        return 0;
    }

    getCurrentLevelId(): number {
        return saveManager.getCurrentLevelId();
    }

    getMaxUnlockedLevelId(): number {
        const completed = saveManager.getCompletedLevels();
        const ids = Object.keys(completed).map(Number);
        if (ids.length === 0) return 1;
        return Math.min(200, Math.max(...ids) + 1);
    }

    isLevelUnlocked(id: number): boolean {
        return id <= this.getMaxUnlockedLevelId();
    }

    markCompleted(id: number, stars: 0 | 1 | 2 | 3): void {
        saveManager.markLevelCompleted(id, stars);
    }

    getNextLevelId(id: number): number | null {
        return id < 200 ? id + 1 : null;
    }
}

export const levelManager = new LevelManager();
