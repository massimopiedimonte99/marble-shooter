export type EndRunSceneData = {
    score: number;
    isHighScore: boolean;
    previousHigh: number;
    levelId?: number | null;
    stars?: 0 | 1 | 2 | 3;
    combos?: number;
};
