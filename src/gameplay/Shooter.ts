import { GameObjects, Math as PhaserMath } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { MarbleColor, MARBLE_COLOR_COUNT, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';

function hslToHex(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if      (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else              { r = c; g = 0; b = x; }
    return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8) | Math.round((b + m) * 255);
}

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

    /** Colors currently present in the chain; empty = unconstrained */
    private _colorPool: MarbleColor[] = [];

    // ── Bomb visual ────────────────────────────────────────────────────────────
    private _bombMode = false;
    private _bombDisplay?: GameObjects.Container;
    private _bombPulseTween?: Phaser.Tweens.Tween;

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
        if (this._bombMode) {
            this._glowGfx.clear();
            if (this._bombDisplay) {
                // Cycle hue through rainbow (full rotation every ~3.3 s)
                const col = hslToHex((time * 0.0003) % 1, 1.0, 0.58);
                (this._bombDisplay.list[0] as GameObjects.Image).setTint(col);
                // Soft rainbow halo from the shared glow graphics
                const mx = this._bombDisplay.x;
                const my = this._bombDisplay.y;
                const r  = MARBLE_RADIUS;
                const pulse = 0.18 + 0.08 * Math.sin(time * 0.006);
                this._glowGfx.fillStyle(col, pulse);
                this._glowGfx.fillCircle(mx, my, r * 1.45);
                this._glowGfx.lineStyle(3, col, 0.9);
                this._glowGfx.strokeCircle(mx, my, r + 6);
            }
            return;
        }

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

    /** Switch the cannon to display a dark composite bomb marble (on=true) or restore the normal colored marble. */
    setBombMode(on: boolean): void {
        this._bombMode = on;
        if (on) {
            this._marbleDisplay.setVisible(false);
            this._glowGfx.clear();
            this._buildBombDisplay();
            this._bombDisplay!.setVisible(true);
        } else {
            this._killBombVisuals();
            this._bombDisplay?.setVisible(false);
            this._marbleDisplay.setVisible(true);
        }
    }

    isBombMode(): boolean { return this._bombMode; }

    private _buildBombDisplay(): void {
        const mx = this.x;
        const my = this.y + MARBLE_DISPLAY_OFFSET_Y;
        const D  = MARBLE_RADIUS * 2;

        if (this._bombDisplay) {
            this._bombDisplay.setVisible(true);
            this._startBombTweens();
            return;
        }

        // Single marble image — tint is driven frame-by-frame via drawGlow()
        const marble = this._scene.add.image(0, 0, AssetKeys.MARBLE_MASTER).setDisplaySize(D, D);
        this._bombDisplay = this._scene.add.container(mx, my, [marble]).setDepth(6);
        this._startBombTweens();
    }

    private _startBombTweens(): void {
        if (!this._bombDisplay) return;
        this._bombPulseTween?.stop();
        this._bombPulseTween = this._scene.tweens.add({
            targets: this._bombDisplay,
            scaleX: { from: 1.0, to: 1.07 },
            scaleY: { from: 1.0, to: 1.07 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private _killBombVisuals(): void {
        this._bombPulseTween?.stop();
        this._bombPulseTween = undefined;
        if (this._bombDisplay) this._bombDisplay.setScale(1, 1);
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

    /**
     * Call whenever the chain's color composition changes so the next shot
     * always targets a colour still present in the chain.
     */
    setColorPool(pool: MarbleColor[]): void {
        // Only reroll the current marble when its colour WAS in the pool before and
        // then disappeared (chain lost that colour). Never reroll during initial build-up
        // (where _currentColor was rolled before the chain existed) — that would cause a
        // visible colour flash at scene start.
        const wasPresent = this._colorPool.includes(this._currentColor);
        this._colorPool = pool;
        if (pool.length > 0 && wasPresent && !pool.includes(this._currentColor)) {
            this._currentColor = this._rollColor();
            this._marbleDisplay.setTint(MARBLE_COLOR_HEX[this._currentColor]);
        }
    }

    private _rollColor(): MarbleColor {
        const pool = this._colorPool;
        if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
        return Math.floor(Math.random() * MARBLE_COLOR_COUNT) as MarbleColor;
    }
}
