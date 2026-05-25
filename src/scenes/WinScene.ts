import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';
import { diag } from '@/utils/DiagLogger';

export class WinScene extends BaseScene {
    constructor() {
        super('Win');
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45);

        this.add.image(cx, cy, AssetKeys.PANEL_VICTORY).setDisplaySize(620, 880);

        this.add.text(cx, cy - 320, 'Level Complete!', {
            fontFamily: 'Arial Black',
            fontSize: '40px',
            color: '#ffffff',
            stroke: '#3a1a0e',
            strokeThickness: 6,
        }).setOrigin(0.5);

        // 3 stelle (2 filled + 1 empty)
        this.add.image(cx - 100, cy - 215, AssetKeys.STAR_FILLED).setDisplaySize(85, 85);
        this.add.image(cx,       cy - 225, AssetKeys.STAR_FILLED).setDisplaySize(100, 100);
        this.add.image(cx + 100, cy - 215, AssetKeys.STAR_EMPTY).setDisplaySize(85, 85);

        this.add.image(cx, cy - 60, AssetKeys.CHEST_CLOSED).setDisplaySize(200, 200);

        const rewardY = cy + 90;
        this.add.image(cx - 100, rewardY, AssetKeys.COIN).setDisplaySize(48, 48);
        this.add.text(cx - 70, rewardY, '+50', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#ffffff',
            stroke: '#3a1a0e', strokeThickness: 4,
        }).setOrigin(0, 0.5);
        this.add.image(cx + 20, rewardY, AssetKeys.GEM).setDisplaySize(48, 48);
        this.add.text(cx + 50, rewardY, '+5', {
            fontFamily: 'Arial Black', fontSize: '28px', color: '#ffffff',
            stroke: '#3a1a0e', strokeThickness: 4,
        }).setOrigin(0, 0.5);

        createButton(this, cx, cy + 200, 'PLAY AGAIN',
            () => this.scene.start('Game'),
            { width: 320, height: 90, fontSize: '30px', diagId: 'win_play_again' });

        const dr = createButton(this, cx, cy + 310, 'DOUBLE REWARDS',
            () => diag.log('button_pressed', { id: 'win_double_rewards' }),
            { width: 320, height: 80, fontSize: '22px', diagId: 'win_double_rewards' });
        this.add.image(dr.container.x + 140, dr.container.y - 30, AssetKeys.ADS_BADGE)
            .setDisplaySize(56, 56);
    }
}
