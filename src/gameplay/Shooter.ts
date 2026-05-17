import { GameObjects } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { MarbleColor, MARBLE_COLOR_COUNT, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';

export class Shooter {
    public readonly x: number;
    public readonly y: number;
    private readonly _body: GameObjects.Arc;
    private readonly _preview: GameObjects.Arc;
    private _nextColor: MarbleColor;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.x = x;
        this.y = y;
        this._body = scene.add.circle(x, y, MARBLE_RADIUS + 6, 0x223355).setStrokeStyle(2, 0x6688aa);
        this._nextColor = this._rollColor();
        this._preview = scene.add.circle(x, y, MARBLE_RADIUS, MARBLE_COLOR_HEX[this._nextColor]);
    }

    getNextColor(): MarbleColor { return this._nextColor; }

    consumeAndRoll(): MarbleColor {
        const c = this._nextColor;
        this._nextColor = this._rollColor();
        this._preview.setFillStyle(MARBLE_COLOR_HEX[this._nextColor]);
        return c;
    }

    private _rollColor(): MarbleColor {
        return Math.floor(Math.random() * MARBLE_COLOR_COUNT) as MarbleColor;
    }
}
