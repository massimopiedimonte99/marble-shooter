import { GameObjects } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { MarbleColor, MARBLE_COLOR_COUNT, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';

const SHOOTER_SIZE = 240;

export class Shooter {
    public readonly x: number;
    public readonly y: number;
    private readonly _sprite: GameObjects.Sprite;
    private readonly _preview: GameObjects.Sprite;
    private _nextColor: MarbleColor;
    private _enabled = true;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.x = x;
        this.y = y;

        // Asset canna a 3 o'clock = angolo 0 Phaser → offset rotazione 0.
        // setRotation(atan2) mira direttamente al puntatore. Vedi ARCHITECTURE.md § Assets.
        this._sprite = scene.add.sprite(x, y, AssetKeys.SHOOTER_MASTER)
            .setDisplaySize(SHOOTER_SIZE, SHOOTER_SIZE);

        this._nextColor = this._rollColor();
        this._preview = scene.add.sprite(x, y, AssetKeys.MARBLE_MASTER)
            .setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2)
            .setTint(MARBLE_COLOR_HEX[this._nextColor]);
    }

    get enabled(): boolean { return this._enabled; }
    setEnabled(v: boolean): void { this._enabled = v; }

    getNextColor(): MarbleColor { return this._nextColor; }

    consumeAndRoll(): MarbleColor {
        const c = this._nextColor;
        this._nextColor = this._rollColor();
        this._preview.setTint(MARBLE_COLOR_HEX[this._nextColor]);
        return c;
    }

    update(pointerX: number, pointerY: number): void {
        const angle = Math.atan2(pointerY - this.y, pointerX - this.x);
        this._sprite.setRotation(angle);
    }

    forceNextColor(color: MarbleColor): void {
        if (!import.meta.env.DEV) return;
        this._nextColor = color;
        this._preview.setTint(MARBLE_COLOR_HEX[color]);
    }

    private _rollColor(): MarbleColor {
        return Math.floor(Math.random() * MARBLE_COLOR_COUNT) as MarbleColor;
    }
}
