export class ScreenEffects {
    private readonly _scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this._scene = scene;
    }

    shake(intensity = 4, duration = 150): void {
        this._scene.cameras.main.shake(duration, intensity * 0.001);
    }

    flash(color = 0xffffff, duration = 80): void {
        this._scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
    }

    /** Quick zoom-in-and-back, good for big combo moments */
    zoomPulse(scale = 1.04, duration = 120): void {
        const cam = this._scene.cameras.main;
        this._scene.tweens.add({
            targets: cam,
            zoom: scale,
            duration: duration / 2,
            ease: 'Quad.easeOut',
            yoyo: true,
        });
    }
}
