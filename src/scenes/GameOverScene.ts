import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';

export class GameOverScene extends BaseScene {
    constructor() {
        super('GameOver');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const PANEL_DISPLAY = 620;
        const creamY = cy + 53;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);

        this.add.image(cx, cy, AssetKeys.PANEL_LOSE)
            .setDisplaySize(PANEL_DISPLAY, PANEL_DISPLAY);

        this.add.text(cx, creamY - 130, 'Game Over', {
            fontFamily: 'Arial Black',
            fontSize: '42px',
            color: '#3a1a0e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5);

        createButton(this, cx, creamY + 80, 'TRY AGAIN',
            () => this.scene.start('Game'),
            { width: 320, fontSize: '32px', diagId: 'gameover_retry' });
    }
}
