import { GameObjects } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { MarbleColor, MARBLE_COLOR_COUNT, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';

const BARREL_LENGTH = 30;

export class Shooter {
    public readonly x: number;
    public readonly y: number;
    private readonly _body: GameObjects.Arc;
    private readonly _preview: GameObjects.Arc;
    private readonly _barrel: GameObjects.Graphics;
    private _nextColor: MarbleColor;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.x = x;
        this.y = y;
        this._body = scene.add.circle(x, y, MARBLE_RADIUS + 6, 0x223355).setStrokeStyle(2, 0x6688aa);
        this._nextColor = this._rollColor();
        this._preview = scene.add.circle(x, y, MARBLE_RADIUS, MARBLE_COLOR_HEX[this._nextColor]);

        // Barrel drawn once in local space (0,0)→(BARREL_LENGTH,0); rotated in update()
        this._barrel = scene.add.graphics();
        this._barrel.lineStyle(3, 0x6688aa, 1);
        this._barrel.lineBetween(0, 0, BARREL_LENGTH, 0);
        this._barrel.setPosition(x, y);
    }

    getNextColor(): MarbleColor { return this._nextColor; }

    consumeAndRoll(): MarbleColor {
        const c = this._nextColor;
        this._nextColor = this._rollColor();
        this._preview.setFillStyle(MARBLE_COLOR_HEX[this._nextColor]);
        return c;
    }

    update(pointerX: number, pointerY: number): void {
        const angle = Math.atan2(pointerY - this.y, pointerX - this.x);
        this._barrel.setRotation(angle);
    }

    forceNextColor(color: MarbleColor): void {
        if (!import.meta.env.DEV) return;
        this._nextColor = color;
        this._preview.setFillStyle(MARBLE_COLOR_HEX[color]);
    }

    private _rollColor(): MarbleColor {
        return Math.floor(Math.random() * MARBLE_COLOR_COUNT) as MarbleColor;
    }
}
