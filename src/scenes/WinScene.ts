import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { createButton } from '@/utils/createButton';
import { diag } from '@/utils/DiagLogger';
import { levelManager } from '@/levels/LevelManager';
import type { EndRunSceneData } from '@/scenes/types';

export class WinScene extends BaseScene {
    private _data: EndRunSceneData = { score: 0, isHighScore: false, previousHigh: 0 };
    private _levelId: number | null = null;
    private _starsEarned: 0 | 1 | 2 | 3 = 0;

    constructor() {
        super('Win');
    }

    init(data: Partial<EndRunSceneData>): void {
        this._data = {
            score: data?.score ?? 0,
            isHighScore: data?.isHighScore ?? false,
            previousHigh: data?.previousHigh ?? 0,
        };
        this._levelId = data?.levelId ?? null;
        this._starsEarned = data?.stars ?? 0;
        diag.log('win_scene_init', { ...this._data, levelId: this._levelId, stars: this._starsEarned });
    }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const PANEL_DISPLAY_WIDTH = 750;
        const PANEL_DISPLAY_HEIGHT = 950;
        const creamY = cy + 53;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);
        this.fadeIn();
        this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45);

        // Panel slides in from above with a soft bounce, in parallel with the fade.
        const panel = this.add.image(cx, cy - 200, AssetKeys.PANEL_VICTORY)
            .setDisplaySize(PANEL_DISPLAY_WIDTH, PANEL_DISPLAY_HEIGHT);
        this.tweens.add({
            targets: panel,
            y: cy,
            duration: 500,
            ease: 'Back.easeOut',
        });

        if (this._data.isHighScore) {
            const hs = this.add.text(cx, creamY - 270, 'NEW HIGH SCORE!', {
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

        this.add.text(cx, creamY - 200, 'Level Complete!', {
            fontFamily: 'Arial Black',
            fontSize: '36px',
            color: '#3a1a0e',
            stroke: '#f4e5c2',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // Stars: render based on earned count
        const starKeys: AssetKeys[] = [
            this._starsEarned >= 1 ? AssetKeys.STAR_FILLED : AssetKeys.STAR_EMPTY,
            this._starsEarned >= 2 ? AssetKeys.STAR_FILLED : AssetKeys.STAR_EMPTY,
            this._starsEarned >= 3 ? AssetKeys.STAR_FILLED : AssetKeys.STAR_EMPTY,
        ];
        this.add.image(cx - 90, creamY - 130, starKeys[0]).setDisplaySize(70, 70);
        this.add.image(cx,       creamY - 135, starKeys[1]).setDisplaySize(80, 80);
        this.add.image(cx + 90, creamY - 130, starKeys[2]).setDisplaySize(70, 70);

        this.add.image(cx, creamY + 40, AssetKeys.CHEST_CLOSED).setDisplaySize(240, 140);

        this.add.image(cx, creamY + 170, AssetKeys.COIN).setDisplaySize(80, 80);

        this.add.text(cx, creamY + 230, `${this._data.score}`, {
            fontFamily: 'Arial Black', fontSize: '30px', color: '#3a1a0e',
        }).setOrigin(0.5, 0.5);

        // Button: NEXT LEVEL if there's a next level, BACK TO MAP otherwise
        const nextId = this._levelId ? levelManager.getNextLevelId(this._levelId) : null;
        if (nextId !== null) {
            createButton(this, cx, creamY + 450, 'NEXT LEVEL',
                () => this.fadeOutTo('Game', 280, { levelId: nextId }),
                { width: 320, fontSize: '32px', diagId: 'win_next_level' });
        } else {
            createButton(this, cx, creamY + 450, 'BACK TO MAP',
                () => this.fadeOutTo('Map', 280),
                { width: 320, fontSize: '32px', diagId: 'win_back_to_map' });
        }
    }
}
