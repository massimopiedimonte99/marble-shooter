import { BaseScene } from '@/scenes/BaseScene';
import { GameEvent } from '@/events/EventTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';

export class MenuScene extends BaseScene {
    constructor() {
        super('Menu');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;

        coverBackground(this, AssetKeys.BG_MENU);

        const logo = this.add.image(cx, GAME_HEIGHT * 0.25, AssetKeys.LOGO);
        logo.setDisplaySize(480, 480 * (logo.height / logo.width));

        const btnBg = this.add.rectangle(cx, GAME_HEIGHT * 0.55, 200, 60, 0xe94560).setInteractive({ useHandCursor: true });
        this.add.text(cx, GAME_HEIGHT * 0.55, 'PLAY', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffffff',
        }).setOrigin(0.5);

        btnBg.on('pointerover', () => btnBg.setFillStyle(0xff6b81));
        btnBg.on('pointerout',  () => btnBg.setFillStyle(0xe94560));
        btnBg.on('pointerdown', () => {
            this.eventBus.emit(GameEvent.MenuPlayPressed);
            this.scene.start('Game');
        });
    }
}
