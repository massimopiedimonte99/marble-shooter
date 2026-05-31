import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { createButton } from '@/utils/createButton';
import { diag } from '@/utils/DiagLogger';

export class PauseScene extends BaseScene {
    constructor() { super('Pause'); }

    create(): void {
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;

        // Dimmed overlay — setInteractive blocks pointer passthrough to Game.
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
            .setOrigin(0)
            .setInteractive();

        // Cream panel with coral border.
        const PANEL_W = 480;
        const PANEL_H = 560;
        const panel = this.add.graphics();
        panel.fillStyle(0xf4e5c2, 1);
        panel.fillRoundedRect(cx - PANEL_W / 2, cy - PANEL_H / 2, PANEL_W, PANEL_H, 32);
        panel.lineStyle(6, 0xe87363, 1);
        panel.strokeRoundedRect(cx - PANEL_W / 2, cy - PANEL_H / 2, PANEL_W, PANEL_H, 32);

        this.add.text(cx, cy - PANEL_H / 2 + 80, 'PAUSED', {
            fontFamily: 'Arial Black',
            fontSize: '52px',
            color: '#2da6a8',
        }).setOrigin(0.5);

        const BTN_GAP = 100;
        const btnStartY = cy + 10;

        createButton(this, cx, btnStartY, 'RESUME', () => {
            this.scene.stop();
            this.scene.resume('Game');
        }, { width: 200, diagId: 'pause_resume' });

        createButton(this, cx, btnStartY + BTN_GAP, 'RESTART', () => {
            this.scene.stop();
            this.scene.stop('Game');
            this.scene.start('Game');
        }, { width: 200, diagId: 'pause_restart' });

        createButton(this, cx, btnStartY + BTN_GAP * 2, 'QUIT', () => {
            this.scene.stop();
            this.scene.stop('Game');
            this.scene.start('Menu');
        }, { width: 200, diagId: 'pause_quit' });

        diag.log('scene_transition', { from: 'GameScene', to: 'PauseScene' });
    }
}
