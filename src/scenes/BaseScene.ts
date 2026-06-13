import { Cameras, Scene } from 'phaser';
import { eventBus } from '@/events/EventBus';
import { gameState } from '@/state/GameState';
import { diag } from '@/utils/DiagLogger';

export abstract class BaseScene extends Scene {
    protected get eventBus() { return eventBus; }
    protected get gameState() { return gameState; }

    /** Fade the camera in from black. Uniform default across all scenes. */
    protected fadeIn(duration = 280, onComplete?: () => void): void {
        this.cameras.main.fadeIn(duration, 0, 0, 0);
        diag.log('scene_fade_in', { scene: this.scene.key, duration });
        if (onComplete) this.cameras.main.once(Cameras.Scene2D.Events.FADE_IN_COMPLETE, onComplete);
    }

    /** Fade the camera out to black, then start the target scene. */
    protected fadeOutTo(targetSceneKey: string, duration = 280, data?: object): void {
        this.cameras.main.fadeOut(duration, 0, 0, 0);
        diag.log('scene_fade_out', { from: this.scene.key, to: targetSceneKey, duration });
        this.cameras.main.once(Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start(targetSceneKey, data);
        });
    }
}
