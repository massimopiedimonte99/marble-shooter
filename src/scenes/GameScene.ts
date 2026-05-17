import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';

export class GameScene extends BaseScene {
    constructor() {
        super('Game');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        this.cameras.main.setBackgroundColor('#16213e');

        this.add.text(cx, cy - 40, 'GAME', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#e94560',
            stroke: '#000000',
            strokeThickness: 6,
        }).setOrigin(0.5);

        this.add.text(cx, cy + 40, '[ placeholder — Fase 2 ]', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#aaaaaa',
        }).setOrigin(0.5);

        const back = this.add.text(cx, cy + 120, '← torna al menu', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        back.on('pointerover', () => back.setColor('#e94560'));
        back.on('pointerout', () => back.setColor('#ffffff'));
        back.on('pointerdown', () => this.scene.start('Menu'));
    }
}
