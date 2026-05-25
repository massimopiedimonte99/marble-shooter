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

        coverBackground(this, AssetKeys.BG_GAMEPLAY);
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);

        this.add.image(cx, cy, AssetKeys.PANEL_LOSE).setDisplaySize(620, 880);

        this.add.text(cx, cy - 240, 'Game Over', {
            fontFamily: 'Arial Black',
            fontSize: '52px',
            color: '#ffffff',
            stroke: '#3a1a0e',
            strokeThickness: 6,
        }).setOrigin(0.5);

        createButton(this, cx, cy + 200, 'TRY AGAIN',
            () => this.scene.start('Game'),
            { width: 320, height: 90, fontSize: '30px', diagId: 'gameover_retry' });
    }
}
