import { GameObjects } from 'phaser';

const DASH_LEN   = 14;
const GAP_LEN    = 10;
const TOTAL_STEP = DASH_LEN + GAP_LEN;
const START_DIST = 58;
const MAX_DIST   = 420;

export class AimGuide {
    private readonly _gfx: GameObjects.Graphics;
    private _animOffset = 0;

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
        this._animOffset = (this._animOffset + 0.35) % TOTAL_STEP;

        if (!visible) {
            this._gfx.setAlpha(0);
            this._gfx.clear();
            return;
        }

        const dx = pointer.x - cannonX;
        const dy = pointer.y - cannonY;
        const dist = Math.hypot(dx, dy);
        if (dist < 55) {
            this._gfx.setAlpha(0);
            this._gfx.clear();
            return;
        }

        this._gfx.setAlpha(1);
        this._gfx.clear();

        const nx = dx / dist;
        const ny = dy / dist;

        let d = START_DIST + this._animOffset;
        while (d < MAX_DIST) {
            const fadeAlpha = 0.55 * (1 - d / MAX_DIST);
            this._gfx.lineStyle(4, colorHex, Math.max(0.1, fadeAlpha));
            const d2 = Math.min(d + DASH_LEN, MAX_DIST);
            this._gfx.beginPath();
            this._gfx.moveTo(cannonX + nx * d,  cannonY + ny * d);
            this._gfx.lineTo(cannonX + nx * d2, cannonY + ny * d2);
            this._gfx.strokePath();
            d += TOTAL_STEP;
        }

        const tx = cannonX + nx * MAX_DIST;
        const ty = cannonY + ny * MAX_DIST;
        this._gfx.fillStyle(colorHex, 0.55);
        this._gfx.fillTriangle(
            tx + nx * 10,          ty + ny * 10,
            tx - ny * 7,           ty + nx * 7,
            tx + ny * 7,           ty - nx * 7,
        );
    }
}
