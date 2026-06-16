import type { MarbleColor } from '@/gameplay/MarbleColor';

export interface LevelDefinition {
    id: number;
    chapterId: number;
    chapterIndex: number;

    totalMarbles: number;
    colorCount: number;
    chainSpeedMultiplier: number;
    avgRunLength: number;
    chainSequence: MarbleColor[];

    combosFor1Star: number;
    combosFor2Stars: number;
    combosFor3Stars: number;
    pathTemplateId: string;
}

export interface ChapterDefinition {
    id: number;
    name: string;
    bgKey: string;
    firstLevelId: number;
    lastLevelId: number;
}

export interface LevelProgress {
    stars: 0 | 1 | 2 | 3;
}
