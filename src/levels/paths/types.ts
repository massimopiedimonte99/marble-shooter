export interface PathTemplate {
    id: string;
    name: string;
    build: () => Phaser.Curves.Path;
}

export interface PathKnobs {
    flipH: boolean;
}

export const DEFAULT_KNOBS: PathKnobs = { flipH: false };

export interface ParametricTemplate {
    id: string;
    name: string;
    build: (knobs: PathKnobs) => Phaser.Curves.Path;
}
