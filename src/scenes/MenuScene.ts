import { BaseScene } from '@/scenes/BaseScene';
import { GameEvent } from '@/events/EventTypes';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';
import { diag } from '@/utils/DiagLogger';

export class MenuScene extends BaseScene {
    constructor() { super('Menu'); }

    create(): void {
        const cx = GAME_WIDTH / 2;

        coverBackground(this, AssetKeys.BG_MENU);
        this.fadeIn();

        // ── Logo — breathes gently ───────────────────────────────────────────────
        const logo = this.add.image(cx, GAME_HEIGHT * 0.25, AssetKeys.LOGO).setDepth(5);
        logo.setDisplaySize(480, 480 * (logo.height / logo.width));
        this.tweens.add({
            targets: logo,
            scaleX: logo.scaleX * 1.04,
            scaleY: logo.scaleY * 1.04,
            duration: 1800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // ── PLAY button ──────────────────────────────────────────────────────────
        const BTN_Y = GAME_HEIGHT * 0.55;

        createButton(this, cx, BTN_Y, 'PLAY', () => {
            this.eventBus.emit(GameEvent.MenuPlayPressed);
            this.fadeOutTo('Game', 280);
        }, { width: 300, diagId: 'menu_play' });

        // ── Sound toggle ─────────────────────────────────────────────────────────
        let soundOn = true;
        const soundIcon = this.add.image(56, 56, AssetKeys.ICON_SOUND_ON)
            .setDisplaySize(64, 64)
            .setDepth(10)
            .setInteractive({ useHandCursor: true });
        soundIcon.on('pointerdown', () => {
            soundOn = !soundOn;
            soundIcon.setTexture(soundOn ? AssetKeys.ICON_SOUND_ON : AssetKeys.ICON_SOUND_OFF);
            diag.log('button_pressed', { id: 'sound_toggle', state: soundOn });
        });

        // ── Settings (placeholder) ───────────────────────────────────────────────
        this.add.image(GAME_WIDTH - 56, 56, AssetKeys.ICON_SETTINGS)
            .setDisplaySize(64, 64)
            .setDepth(10)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => diag.log('button_pressed', { id: 'settings' }));
    }
}
