import { BaseScene } from '@/scenes/BaseScene';
import { GameEvent } from '@/events/EventTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';
import { diag } from '@/utils/DiagLogger';

export class MenuScene extends BaseScene {
    constructor() {
        super('Menu');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;

        coverBackground(this, AssetKeys.BG_MENU);

        const logo = this.add.image(cx, GAME_HEIGHT * 0.25, AssetKeys.LOGO);
        logo.setDisplaySize(480, 480 * (logo.height / logo.width));

        createButton(this, cx, GAME_HEIGHT * 0.55, 'PLAY', () => {
            this.eventBus.emit(GameEvent.MenuPlayPressed);
            this.scene.start('Game');
        }, { width: 280, height: 90, fontSize: '32px', diagId: 'menu_play' });

        // Sound toggle (stato volatile locale)
        let soundOn = true;
        const soundIcon = this.add.image(56, 56, AssetKeys.ICON_SOUND_ON)
            .setDisplaySize(64, 64)
            .setInteractive({ useHandCursor: true });
        soundIcon.on('pointerdown', () => {
            soundOn = !soundOn;
            soundIcon.setTexture(soundOn ? AssetKeys.ICON_SOUND_ON : AssetKeys.ICON_SOUND_OFF);
            diag.log('button_pressed', { id: 'sound_toggle', state: soundOn });
        });

        // Settings (placeholder silenzioso)
        this.add.image(GAME_WIDTH - 56, 56, AssetKeys.ICON_SETTINGS)
            .setDisplaySize(64, 64)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => diag.log('button_pressed', { id: 'settings' }));
    }
}
