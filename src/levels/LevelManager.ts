import type { LevelDefinition, ChapterDefinition } from './types';
import { CHAPTERS, chapterOfLevel } from './chapters';
import { saveManager } from '@/state/SaveManager';

declare global {
    interface Window {
        __levelManager?: LevelManager;
    }
}

function generateLevel(id: number): LevelDefinition {
    const chapter = chapterOfLevel(id);
    const chapterIndex = id - chapter.firstLevelId + 1;

    const chainLength = Math.round(24 + (id - 1) * 0.18);
    const colorCount = Math.min(6, 3 + Math.floor((id - 1) / 40));
    const chainSpeed = Math.min(2.2, 1 + (id - 1) * 0.0065);

    const baseScore = chainLength * 50;
    return {
        id,
        chapterId: chapter.id,
        chapterIndex,
        chainLength,
        colorCount,
        chainSpeed,
        scoreFor1Star: baseScore,
        scoreFor2Stars: Math.round(baseScore * 1.6),
        scoreFor3Stars: Math.round(baseScore * 2.4),
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
