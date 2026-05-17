import { BaseScene } from '@/scenes/BaseScene';
import { installPreventScroll } from '@/utils/preventScroll';

export class BootScene extends BaseScene {
    constructor() {
        super('Boot');
    }

    create(): void {
        installPreventScroll();
        this.gameState.touchLastPlayed();
        this.scene.start('Preload');
    }
}
