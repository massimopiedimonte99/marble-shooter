export enum MarbleColor {
    RED = 0,
    BLUE = 1,
    GREEN = 2,
    YELLOW = 3,
    PURPLE = 4,
}

export const MARBLE_COLOR_HEX: Record<MarbleColor, number> = {
    [MarbleColor.RED]: 0xe94560,
    [MarbleColor.BLUE]: 0x4a90e2,
    [MarbleColor.GREEN]: 0x7ed957,
    [MarbleColor.YELLOW]: 0xffd166,
    [MarbleColor.PURPLE]: 0xa06cd5,
};

export const MARBLE_COLOR_COUNT = 5;
