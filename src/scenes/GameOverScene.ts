import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';

export class GameOverScene extends BaseScene {
    constructor() { super('GameOver'); }

    create(): void {
        const cx     = GAME_WIDTH / 2;
        const cy     = GAME_HEIGHT / 2;
        const PANEL  = 620;
        const creamY = cy + 53;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);

        // Dark overlay fades in
        const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(0);
        this.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: 300 });

        // Panel drops from above with a bounce
        const panel = this.add.image(cx, -PANEL / 2 - 60, AssetKeys.PANEL_LOSE)
            .setDisplaySize(PANEL, PANEL).setDepth(5);
        this.tweens.add({
            targets: panel,
            y: cy,
            duration: 680,
            delay: 120,
            ease: 'Bounce.easeOut',
        });

        // "Game Over" text — slides in from left after panel lands
        const title = this.add.text(cx - GAME_WIDTH, creamY - 130, 'Game Over', {
            fontFamily: 'Arial Black',
            fontSize: '44px',
            color: '#3a1a0e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(6);
        this.tweens.add({
            targets: title,
            x: cx,
            duration: 380,
            delay: 620,
            ease: 'Back.easeOut',
        });

        // "Try again?" sub-text
        const sub = this.add.text(cx, creamY + 10, 'Better luck next time!', {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#5a2a1e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(6).setAlpha(0);
        this.tweens.add({ targets: sub, alpha: 1, delay: 820, duration: 240 });

        // Button
        const btn = createButton(this, cx, creamY + 300, 'TRY AGAIN',
            () => {
                this.cameras.main.fadeOut(220, 0, 0, 0);
                this.time.delayedCall(220, () => this.scene.start('Game'));
            },
            { width: 320, fontSize: '32px', diagId: 'gameover_retry' });
        btn.container.setAlpha(0).setDepth(6);
        this.tweens.add({ targets: btn.container, alpha: 1, delay: 950, duration: 280 });

        this.cameras.main.fadeIn(180, 0, 0, 0);
    }
}
