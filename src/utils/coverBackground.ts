import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import type { AssetKeys } from '@/constants/AssetKeys';

export function coverBackground(scene: Phaser.Scene, key: AssetKeys): Phaser.GameObjects.Image {
    const bg = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key as string);
    const s = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    return bg.setScale(s).setScrollFactor(0);
}
