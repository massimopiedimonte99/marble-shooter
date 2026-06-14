export interface LevelDefinition {
    id: number;
    chapterId: number;
    chapterIndex: number;
    chainLength: number;
    colorCount: number;
    chainSpeed: number;
    scoreFor1Star: number;
    scoreFor2Stars: number;
    scoreFor3Stars: number;
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
