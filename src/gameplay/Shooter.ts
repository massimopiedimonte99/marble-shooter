import { GameObjects, Math as PhaserMath } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { MarbleColor, MARBLE_COLOR_COUNT, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';

const SHOOTER_SIZE  = 240;
const MAX_RECOIL    = 18;
const RECOIL_LERP   = 0.15;
/** Fixed Y offset below cannon for the "loaded marble" display */
const MARBLE_DISPLAY_OFFSET_Y = 150;

export class Shooter {
    public readonly x: number;
    public readonly y: number;

    private readonly _scene: Phaser.Scene;
    private readonly _sprite: GameObjects.Sprite;
    /** Glow + ring drawn around the loaded marble each frame */
    private readonly _glowGfx: GameObjects.Graphics;
    /** The loaded marble shown at a fixed position below the cannon */
    private readonly _marbleDisplay: GameObjects.Image;

    private _currentColor: MarbleColor;
    private _enabled = true;
    private _recoil = 0;
    private _targetRecoil = 0;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this._scene = scene;
        this.x = x;
        this.y = y;

        this._glowGfx = scene.add.graphics().setDepth(4);

        this._sprite = scene.add.sprite(x, y, AssetKeys.SHOOTER_MASTER)
            .setDisplaySize(SHOOTER_SIZE, SHOOTER_SIZE)
            .setDepth(5);

        this._currentColor = this._rollColor();

        // Marble shown at a fixed position below cannon — intentional, clean
        this._marbleDisplay = scene.add.image(x, y + MARBLE_DISPLAY_OFFSET_Y, AssetKeys.MARBLE_MASTER)
            .setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2)
            .setTint(MARBLE_COLOR_HEX[this._currentColor])
            .setDepth(6);
    }

    update(pointer: Phaser.Input.Pointer, canCharge: boolean): void {
        const angle = Math.atan2(pointer.y - this.y, pointer.x - this.x);
        this._sprite.setRotation(angle);

        this._targetRecoil = canCharge && pointer.isDown ? MAX_RECOIL : 0;
        this._recoil = PhaserMath.Linear(this._recoil, this._targetRecoil, RECOIL_LERP);

        const rx = -Math.cos(angle) * this._recoil;
        const ry = -Math.sin(angle) * this._recoil;
        this._sprite.setPosition(this.x + rx, this.y + ry);
        // Marble display stays fixed — it's not part of the rotating cannon
    }

    /** Draw the animated glow ring around the loaded marble. Call every frame. */
    drawGlow(time: number): void {
        const mx = this._marbleDisplay.x;
        const my = this._marbleDisplay.y;
        const r  = MARBLE_RADIUS;
        const color = MARBLE_COLOR_HEX[this._currentColor];

        this._glowGfx.clear();

        // Subtle pulsing soft halo (kept small)
        const pulse = 0.16 + 0.06 * Math.sin(time * 0.004);
        this._glowGfx.fillStyle(color, pulse);
        this._glowGfx.fillCircle(mx, my, r * 1.35);

        // Dark backing disc
        this._glowGfx.fillStyle(0x000000, 0.24);
        this._glowGfx.fillCircle(mx, my, r * 1.08);

        // Crisp white ring
        this._glowGfx.lineStyle(3, 0xffffff, 0.92);
        this._glowGfx.strokeCircle(mx, my, r + 3);

        // Thin colour ring
        this._glowGfx.lineStyle(2, color, 0.70);
        this._glowGfx.strokeCircle(mx, my, r + 7);
    }

    get enabled(): boolean { return this._enabled; }
    setEnabled(v: boolean): void { this._enabled = v; }

    getNextColor(): MarbleColor { return this._currentColor; }

    /** Returns the colour that was loaded; advances to next. */
    consumeAndRoll(): MarbleColor {
        const c = this._currentColor;
        this._currentColor = this._rollColor();
        this._marbleDisplay.setTint(MARBLE_COLOR_HEX[this._currentColor]);
        // Pop feedback — must tween displayWidth/Height, NOT scaleX/Y.
        // Using scaleX:{from:1.25} overrides setDisplaySize and renders the
        // marble at textureWidth*1.25 (potentially 320–640px) for the duration.
        const D = MARBLE_RADIUS * 2;
        this._marbleDisplay.setDisplaySize(D * 1.25, D * 1.25);
        this._scene.tweens.add({
            targets: this._marbleDisplay,
            displayWidth: D,
            displayHeight: D,
            duration: 160,
            ease: 'Back.easeOut',
            onComplete: () => this._marbleDisplay.setDisplaySize(D, D),
        });
        return c;
    }

    forceNextColor(color: MarbleColor): void {
        if (!import.meta.env.DEV) return;
        this._currentColor = color;
        this._marbleDisplay.setTint(MARBLE_COLOR_HEX[color]);
    }

    private _rollColor(): MarbleColor {
        return Math.floor(Math.random() * MARBLE_COLOR_COUNT) as MarbleColor;
    }
}
