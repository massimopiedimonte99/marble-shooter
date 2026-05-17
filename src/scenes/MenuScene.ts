import { BaseScene } from '@/scenes/BaseScene';
import { GameEvent } from '@/events/EventTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';

export class MenuScene extends BaseScene {
    constructor() {
        super('Menu');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        this.cameras.main.setBackgroundColor('#1a1a2e');

        this.add.text(cx, cy - 120, 'MARBLE SHOOTER', {
            fontFamily: 'Arial Black',
            fontSize: '52px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5);

        const btnBg = this.add.rectangle(cx, cy + 40, 200, 60, 0xe94560).setInteractive({ useHandCursor: true });
        this.add.text(cx, cy + 40, 'PLAY', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffffff',
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(0xff6b81));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0xe94560));
        btnBg.on('pointerdown', () => {
            this.eventBus.emit(GameEvent.MenuPlayPressed);
            this.scene.start('Game');
        });
    }
}
