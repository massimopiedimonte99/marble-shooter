import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';
import { diag } from '@/utils/DiagLogger';
import { saveManager } from '@/state/SaveManager';
import type { EndRunSceneData } from '@/scenes/types';

export class GameOverScene extends BaseScene {
    private _data: EndRunSceneData = { score: 0, isHighScore: false, previousHigh: 0 };

    constructor() { super('GameOver'); }

    init(data: Partial<EndRunSceneData>): void {
        this._data = {
            score: data?.score ?? 0,
            isHighScore: data?.isHighScore ?? false,
            previousHigh: data?.previousHigh ?? 0,
        };
        diag.log('gameover_scene_init', { ...this._data });
    }

    create(): void {
        const cx     = GAME_WIDTH / 2;
        const cy     = GAME_HEIGHT / 2;
        const PANEL_DISPLAY_WIDTH = 750;
        const PANEL_DISPLAY_HEIGHT = 950;
        const creamY = cy + 53;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);

        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setDepth(0);

        // Panel slides in from above with a soft bounce, in parallel with the fade.
        const panel = this.add.image(cx, cy - 200, AssetKeys.PANEL_LOSE)
            .setDisplaySize(PANEL_DISPLAY_WIDTH, PANEL_DISPLAY_HEIGHT).setDepth(5);
        this.tweens.add({
            targets: panel,
            y: cy,
            duration: 500,
            ease: 'Back.easeOut',
        });

        this.add.text(cx, creamY - 200, 'Game Over', {
            fontFamily: 'Arial Black',
            fontSize: '44px',
            color: '#3a1a0e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(6);

        this.add.image(cx, creamY - 30, AssetKeys.ADS_BADGE).setDepth(5).setScale(1.2);

        const highScore = saveManager.getHighScore();

        this.add.text(cx, creamY + 150, `Score: ${this._data.score}`, {
            fontFamily: 'Arial Black',
            fontSize: '35px',
            color: '#3a1a0e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(6);

        this.add.text(cx, creamY + 200, `Best: ${highScore}`, {
            fontFamily: 'Arial Black',
            fontSize: '22px',
            color: '#5a2a1e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(6);

        const btn = createButton(this, cx, creamY + 450, 'TRY AGAIN',
            () => this.fadeOutTo('Game', 280),
            { width: 320, fontSize: '32px', diagId: 'gameover_retry' });
        btn.container.setDepth(6);

        this.fadeIn(180);
    }
}
