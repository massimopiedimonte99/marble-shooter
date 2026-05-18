import { AUTO, Game, Scale } from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { MenuScene } from '@/scenes/MenuScene';
import { GameScene } from '@/scenes/GameScene';
import { WinScene } from '@/scenes/WinScene';
import { GameOverScene } from '@/scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, WinScene, GameOverScene],
};

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game(config);
    if (import.meta.env.DEV) (window as any).__game = game;
});
