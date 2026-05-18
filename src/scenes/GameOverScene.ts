import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';

export class GameOverScene extends BaseScene {
    constructor() {
        super('GameOver');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        this.cameras.main.setBackgroundColor('#1a1a2e');

        this.add.text(cx, cy - 80, 'Game Over', {
            fontFamily: 'Arial Black',
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5);

        const btnBg = this.add.rectangle(cx, cy + 40, 220, 60, 0xe94560).setInteractive({ useHandCursor: true });
        this.add.text(cx, cy + 40, 'Try Again', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(0xff6b81));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0xe94560));
        btnBg.on('pointerdown', () => this.scene.start('Game'));
    }
}
