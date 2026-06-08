import { GameObjects } from 'phaser';

const DASH_LEN   = 14;
const GAP_LEN    = 10;
const TOTAL_STEP = DASH_LEN + GAP_LEN;
const START_DIST = 58;
const MAX_DIST   = 420;

const STILL_THRESHOLD_MS     = 500;
const STILL_MOVE_TOLERANCE_PX = 4;
const PULSE_PERIOD_MS         = 600;
const PULSE_ALPHA_MIN         = 0.85;
const PULSE_ALPHA_MAX         = 1.0;

export class AimGuide {
    private readonly _gfx: GameObjects.Graphics;
    private _animOffset = 40;

    private _lastPointerX = 0;
    private _lastPointerY = 0;
    private _stillMs      = 0;
    private _internalTime = 0;

    constructor(scene: Phaser.Scene) {
        this._gfx = scene.add.graphics().setDepth(12).setAlpha(0);
    }

    update(
        pointer: Phaser.Input.Pointer,
        cannonX: number,
        cannonY: number,
        colorHex: number,
        delta: number,
        visible: boolean,
    ): void {

        if (!visible) {
            this._gfx.setAlpha(0);
            this._gfx.clear();
            this._stillMs = 0;
            return;
        }

        const dx = pointer.x - cannonX;
        const dy = pointer.y - cannonY;
        const dist = Math.hypot(dx, dy);
        if (dist < 55) {
            this._gfx.setAlpha(0);
            this._gfx.clear();
            this._stillMs = 0;
            return;
        }

        this._internalTime += delta;

        const dxFromLast    = pointer.x - this._lastPointerX;
        const dyFromLast    = pointer.y - this._lastPointerY;
        const movedThisFrame = Math.hypot(dxFromLast, dyFromLast) > STILL_MOVE_TOLERANCE_PX;
        this._lastPointerX  = pointer.x;
        this._lastPointerY  = pointer.y;

        if (movedThisFrame) {
            this._stillMs = 0;
        } else {
            this._stillMs += delta;
        }

        let alpha = 1;
        if (this._stillMs >= STILL_THRESHOLD_MS) {
            const phase = (this._internalTime / PULSE_PERIOD_MS) * Math.PI * 2;
            const t     = (Math.sin(phase) + 1) * 0.5;
            alpha = PULSE_ALPHA_MIN + (PULSE_ALPHA_MAX - PULSE_ALPHA_MIN) * t;
        }
        this._gfx.setAlpha(alpha);
        this._gfx.clear();

        const nx = dx / dist;
        const ny = dy / dist;

        let d = START_DIST + this._animOffset;
        while (d < MAX_DIST) {
            this._gfx.lineStyle(4, colorHex, 1);
            const d2 = Math.min(d + DASH_LEN, MAX_DIST);
            this._gfx.beginPath();
            this._gfx.moveTo(cannonX + nx * d,  cannonY + ny * d);
            this._gfx.lineTo(cannonX + nx * d2, cannonY + ny * d2);
            this._gfx.strokePath();
            d += TOTAL_STEP;
        }

        const tx = cannonX + nx * MAX_DIST;
        const ty = cannonY + ny * MAX_DIST;
        this._gfx.fillStyle(colorHex, 1);
        this._gfx.fillTriangle(
            tx + nx * 10,          ty + ny * 10,
            tx - ny * 7,           ty + nx * 7,
            tx + ny * 7,           ty - nx * 7,
        );
    }
}
