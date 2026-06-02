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

    /** Colors currently present in the chain; empty = unconstrained */
    private _colorPool: MarbleColor[] = [];

    // ── Bomb visual ────────────────────────────────────────────────────────────
    private _bombMode = false;
    private _bombDisplay?: GameObjects.Container;
    private _bombGlowTween?: Phaser.Tweens.Tween;
    private _bombPulseTween?: Phaser.Tweens.Tween;
    private _bombFlickerEvent?: Phaser.Time.TimerEvent;

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
            // In bomb mode, clear the colored glow and let the bomb container handle visuals.
            this._glowGfx.clear();
            // Slowly rotate the bomb container
            if (this._bombDisplay) {
                this._bombDisplay.angle = (time * 0.04) % 360;
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
        const r  = MARBLE_RADIUS;
        const D  = r * 2;

        // Build only once; reuse on subsequent calls
        if (this._bombDisplay) {
            this._bombDisplay.setVisible(true);
            this._startBombTweens();
            return;
        }

        // ── Base dark marble ────────────────────────────────────────────────────
        const base = this._scene.add.image(0, 0, AssetKeys.MARBLE_MASTER)
            .setDisplaySize(D, D)
            .setTint(0x1a0a0a);

        // ── Overlay graphics (dark disc + highlight stars + fuse) ───────────────
        const overlay = this._scene.add.graphics();
        // Dark semi-transparent disc
        overlay.fillStyle(0x000000, 0.55);
        overlay.fillCircle(0, 0, r * 0.85);
        // 3 white highlight stars
        const stars: [number, number][] = [[-r * 0.25, -r * 0.30], [r * 0.18, -r * 0.38], [-r * 0.10, r * 0.22]];
        overlay.fillStyle(0xffffff, 0.85);
        for (const [sx, sy] of stars) overlay.fillCircle(sx, sy, 3);
        // Fuse line — up-right from top of marble
        overlay.lineStyle(4, 0x8b5a2b, 1.0);
        overlay.beginPath();
        overlay.moveTo(r * 0.1, -r * 0.9);
        overlay.lineTo(r * 0.55, -r * 1.4);
        overlay.strokePath();

        // ── Fuse flickering tip (two alternating Graphics objects) ──────────────
        const flickA = this._scene.add.graphics();
        flickA.fillStyle(0xffee22, 1.0);
        flickA.fillCircle(r * 0.55, -r * 1.4, 5);
        const flickB = this._scene.add.graphics();
        flickB.fillStyle(0xff7700, 0.9);
        flickB.fillCircle(r * 0.55, -r * 1.4, 4);
        flickB.setVisible(false);
        this._bombFlickerEvent = this._scene.time.addEvent({
            delay: 80,
            loop: true,
            callback: () => {
                if (!this._bombMode) return;
                const vis = flickA.visible;
                flickA.setVisible(!vis);
                flickB.setVisible(vis);
            },
        });

        // ── Glow ring ───────────────────────────────────────────────────────────
        const glowRing = this._scene.add.graphics();
        glowRing.lineStyle(5, 0xe87363, 0.6);
        glowRing.strokeCircle(0, 0, r + 12);

        // ── Container ───────────────────────────────────────────────────────────
        this._bombDisplay = this._scene.add.container(mx, my, [base, overlay, flickA, flickB, glowRing])
            .setDepth(6);

        this._startBombTweens();
    }

    private _startBombTweens(): void {
        if (!this._bombDisplay) return;

        // Glow ring alpha pulse
        const glowRing = this._bombDisplay.list[4] as GameObjects.Graphics;
        this._bombGlowTween?.stop();
        this._bombGlowTween = this._scene.tweens.add({
            targets: glowRing,
            alpha: { from: 0.35, to: 0.85 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Container scale pulse
        this._bombPulseTween?.stop();
        this._bombPulseTween = this._scene.tweens.add({
            targets: this._bombDisplay,
            scaleX: { from: 1.0, to: 1.06 },
            scaleY: { from: 1.0, to: 1.06 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private _killBombVisuals(): void {
        this._bombGlowTween?.stop();
        this._bombGlowTween = undefined;
        this._bombPulseTween?.stop();
        this._bombPulseTween = undefined;
        this._bombFlickerEvent?.remove(false);
        this._bombFlickerEvent = undefined;
        if (this._bombDisplay) {
            this._bombDisplay.setScale(1, 1);
        }
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
        this._colorPool = pool;
        // If the marble currently in the cannon is no longer in the chain, reroll it
        if (pool.length > 0 && !pool.includes(this._currentColor)) {
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
