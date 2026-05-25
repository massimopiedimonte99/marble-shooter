import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';

export class WinScene extends BaseScene {
    constructor() {
        super('Win');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const PANEL_DISPLAY = 620;
        const creamY = cy + 53;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45);

        this.add.image(cx, cy, AssetKeys.PANEL_VICTORY)
            .setDisplaySize(PANEL_DISPLAY, PANEL_DISPLAY);

        this.add.text(cx, creamY - 150, 'Level Complete!', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            color: '#3a1a0e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5);

        this.add.image(cx - 90, creamY - 75, AssetKeys.STAR_FILLED).setDisplaySize(70, 70);
        this.add.image(cx,       creamY - 85, AssetKeys.STAR_FILLED).setDisplaySize(80, 80);
        this.add.image(cx + 90, creamY - 75, AssetKeys.STAR_EMPTY).setDisplaySize(70, 70);

        this.add.image(cx, creamY + 20, AssetKeys.CHEST_CLOSED).setDisplaySize(180, 100);

        this.add.image(cx - 70, creamY + 100, AssetKeys.COIN).setDisplaySize(40, 40);
        this.add.text(cx - 45, creamY + 100, '+50', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#3a1a0e',
        }).setOrigin(0, 0.5);
        this.add.image(cx + 20, creamY + 100, AssetKeys.GEM).setDisplaySize(40, 40);
        this.add.text(cx + 45, creamY + 100, '+5', {
            fontFamily: 'Arial Black', fontSize: '22px', color: '#3a1a0e',
        }).setOrigin(0, 0.5);

        createButton(this, cx, creamY + 175, 'PLAY AGAIN',
            () => this.scene.start('Game'),
            { width: 320, fontSize: '32px', diagId: 'win_play_again' });
    }
}
