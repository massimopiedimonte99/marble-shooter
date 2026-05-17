import { Curves } from 'phaser';
import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { MarbleColor, MARBLE_COLOR_COUNT } from '@/gameplay/MarbleColor';
import { MarblePool } from '@/pool/MarblePool';
import { MarbleChain } from '@/gameplay/MarbleChain';

export class GameScene extends BaseScene {
    private chain!: MarbleChain;

    constructor() {
        super('Game');
    }

    create(): void {
        this.cameras.main.setBackgroundColor('#16213e');

        // S-path: 2 CubicBezier attraverso 1024×768
        const path = new Curves.Path(60, 100);
        // Segmento 1: alto-sinistra → centro-destra
        path.cubicBezierTo(960, 350, 500, 60, 960, 200);
        // Segmento 2: centro-destra → basso-sinistra
        path.cubicBezierTo(100, 660, 960, 520, 200, 660);

        // Debug-draw (rimovibile in futuro)
        const gfx = this.add.graphics();
        gfx.lineStyle(3, 0x445566, 0.7);
        path.draw(gfx, 128);

        const pool = new MarblePool(this);
        this.chain = new MarbleChain(path, pool);

        // Spawna 30 marble di colori random ogni 200ms
        this.time.addEvent({
            delay: 200,
            repeat: 29,
            callback: () => {
                const color = (Math.floor(Math.random() * MARBLE_COLOR_COUNT)) as MarbleColor;
                this.chain.spawnMarble(color);
            },
        });

        // Pulsante di ritorno al menu
        const back = this.add.text(GAME_WIDTH - 16, 16, '← menu', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        back.on('pointerover', () => back.setColor('#ffffff'));
        back.on('pointerout', () => back.setColor('#aaaaaa'));
        back.on('pointerdown', () => this.scene.start('Menu'));

        // Indicatore dimensioni canvas per debug (rimuovere in Fase 2)
        this.add.text(16, GAME_HEIGHT - 16, `${GAME_WIDTH}×${GAME_HEIGHT}`, {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#444466',
        }).setOrigin(0, 1);
    }

    update(time: number, delta: number): void {
        this.chain.update(time, delta);
    }
}
