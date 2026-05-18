import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';

export class WinScene extends BaseScene {
    constructor() {
        super('Win');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        this.cameras.main.setBackgroundColor('#1a1a2e');

        this.add.text(cx, cy - 80, 'Level Complete!', {
            fontFamily: 'Arial Black',
            fontSize: '48px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5);

        const btnBg = this.add.rectangle(cx, cy + 40, 220, 60, 0x4ecca3).setInteractive({ useHandCursor: true });
        this.add.text(cx, cy + 40, 'Play Again', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#1a1a2e',
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(0x80ffe8));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0x4ecca3));
        btnBg.on('pointerdown', () => this.scene.start('Game'));
    }
}
