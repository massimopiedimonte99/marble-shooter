import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';

export class PreloadScene extends BaseScene {
    constructor() {
        super('Preload');
    }

    preload(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const barW = 400;
        const barH = 20;

        this.add.rectangle(cx, cy, barW + 4, barH + 4).setStrokeStyle(2, 0xffffff);
        const fill = this.add.rectangle(cx - barW / 2, cy, 0, barH, 0xffffff).setOrigin(0, 0.5);

        this.load.on('progress', (p: number) => {
            fill.width = barW * p;
        });

        // TODO Fase 1b: aggiungere asset reali qui
        // this.load.setPath('assets');
        // this.load.atlas('marble', 'marble.png', 'marble.json');
    }

    create(): void {
        this.scene.start('Menu');
    }
}
