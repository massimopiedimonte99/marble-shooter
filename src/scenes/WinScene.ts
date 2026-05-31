import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';
import { diag } from '@/utils/DiagLogger';
import type { EndRunSceneData } from '@/scenes/types';

export class WinScene extends BaseScene {
    private _data: EndRunSceneData = { score: 0, isHighScore: false, previousHigh: 0 };

    constructor() {
        super('Win');
    }

    init(data: Partial<EndRunSceneData>): void {
        this._data = {
            score: data?.score ?? 0,
            isHighScore: data?.isHighScore ?? false,
            previousHigh: data?.previousHigh ?? 0,
        };
        diag.log('win_scene_init', { ...this._data });
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

        if (this._data.isHighScore) {
            const hs = this.add.text(cx, creamY - 210, 'NEW HIGH SCORE!', {
                fontFamily: 'Arial Black',
                fontSize: '36px',
                color: '#ffe066',
                stroke: '#a8631c',
                strokeThickness: 6,
            }).setOrigin(0.5);

            this.tweens.add({
                targets: hs,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

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

        this.add.image(cx, creamY + 20, AssetKeys.CHEST_CLOSED).setDisplaySize(240, 140);

        this.add.image(cx - 90, creamY + 110, AssetKeys.COIN).setDisplaySize(80, 80);
        this.add.text(cx - 65, creamY + 110, `+${this._data.score}`, {
            fontFamily: 'Arial Black', fontSize: '30px', color: '#3a1a0e',
        }).setOrigin(0, 0.5);
        this.add.image(cx + 50, creamY + 110, AssetKeys.GEM).setDisplaySize(80, 80);
        this.add.text(cx + 75, creamY + 110, '+5', {
            fontFamily: 'Arial Black', fontSize: '30px', color: '#3a1a0e',
        }).setOrigin(0, 0.5);

        createButton(this, cx, creamY + 300, 'PLAY AGAIN',
            () => this.scene.start('Game'),
            { width: 320, fontSize: '32px', diagId: 'win_play_again' });
    }
}
