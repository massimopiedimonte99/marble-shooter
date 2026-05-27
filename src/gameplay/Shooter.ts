import { GameObjects, Math as PhaserMath } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { MarbleColor, MARBLE_COLOR_COUNT, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';

const SHOOTER_SIZE = 240;
const MAX_RECOIL = 18;
const RECOIL_LERP_SPEED = 0.15;

export class Shooter {
    public readonly x: number;
    public readonly y: number;

    private readonly _sprite: GameObjects.Sprite;
    private readonly _preview: GameObjects.Sprite;

    private _nextColor: MarbleColor;
    private _enabled = true;

    private _recoil = 0;
    private _targetRecoil = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.x = x;
        this.y = y;

        this._sprite = scene.add.sprite(x, y, AssetKeys.SHOOTER_MASTER)
            .setDisplaySize(SHOOTER_SIZE, SHOOTER_SIZE);

        this._nextColor = this._rollColor();

        this._preview = scene.add.sprite(x, y, AssetKeys.MARBLE_MASTER)
            .setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2)
            .setTint(MARBLE_COLOR_HEX[this._nextColor]);
    }

    update(pointer: Phaser.Input.Pointer, canCharge: boolean): void {

        const angle = Math.atan2(
            pointer.y - this.y,
            pointer.x - this.x
        );

        this._sprite.setRotation(angle);

        // Recoil solo se sto premendo NELLA zona di mira: cliccando su UI
        // (power-up, totalizzatore coin) il cannone non rincula.
        this._targetRecoil = (canCharge && pointer.isDown) ? MAX_RECOIL : 0;

        // Smooth interpolation
this._recoil = PhaserMath.Linear(
    this._recoil,
    this._targetRecoil,
    RECOIL_LERP_SPEED
);

        // Spostamento all'indietro rispetto alla direzione
        const recoilX = -Math.cos(angle) * this._recoil;
        const recoilY = -Math.sin(angle) * this._recoil;

        this._sprite.setPosition(
            this.x + recoilX,
            this.y + recoilY
        );

        // Anche la preview segue il recoil
        this._preview.setPosition(
            this.x + recoilX,
            this.y + recoilY
        );
    }

    get enabled(): boolean { return this._enabled; }

    setEnabled(v: boolean): void {
        this._enabled = v;
    }

    getNextColor(): MarbleColor {
        return this._nextColor;
    }

    consumeAndRoll(): MarbleColor {
        const c = this._nextColor;

        this._nextColor = this._rollColor();

        this._preview.setTint(
            MARBLE_COLOR_HEX[this._nextColor]
        );

        return c;
    }

    forceNextColor(color: MarbleColor): void {
        if (!import.meta.env.DEV) return;

        this._nextColor = color;
        this._preview.setTint(MARBLE_COLOR_HEX[color]);
    }

    private _rollColor(): MarbleColor {
        return Math.floor(
            Math.random() * MARBLE_COLOR_COUNT
        ) as MarbleColor;
    }
}