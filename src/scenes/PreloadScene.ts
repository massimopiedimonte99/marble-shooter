import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';

export class PreloadScene extends BaseScene {
    constructor() {
        super('Preload');
    }

    preload(): void {
        this.fadeIn(200);
        const cx = GAME_WIDTH / 2;
        const cy = GAME_HEIGHT / 2;
        const barW = 400;
        const barH = 20;

        this.add.rectangle(cx, cy, barW + 4, barH + 4).setStrokeStyle(2, 0xffffff);
        const fill = this.add.rectangle(cx - barW / 2, cy, 0, barH, 0xffffff).setOrigin(0, 0.5);

        this.load.on('progress', (p: number) => {
            fill.width = barW * p;
        });

        this.load.setPath('assets');
        this.load.image(AssetKeys.MARBLE_MASTER,  'marble_master.png');
        this.load.image(AssetKeys.SHOOTER_MASTER, 'shooter_master.png');
        this.load.image(AssetKeys.BG_MENU,        'bg_menu.png');
        this.load.image(AssetKeys.BG_GAMEPLAY,    'bg_gameplay.png');
        this.load.image(AssetKeys.LOGO,           'logo.png');
        // Blocco 2 — UI core
        this.load.image(AssetKeys.BUTTON_MASTER,   'button_master.png');
        this.load.image(AssetKeys.ICON_PAUSE,      'icon_pause.png');
        this.load.image(AssetKeys.ICON_SETTINGS,   'icon_settings.png');
        this.load.image(AssetKeys.ICON_SOUND_ON,   'icon_sound_on.png');
        this.load.image(AssetKeys.ICON_SOUND_OFF,  'icon_sound_off.png');
        this.load.image(AssetKeys.PARTICLE_CIRCLE, 'particle_circle.png');
        this.load.image(AssetKeys.PARTICLE_STAR,   'particle_star.png');
        // Blocco 3 — Polish screens
        this.load.image(AssetKeys.PANEL_VICTORY,           'panel_victory.png');
        this.load.image(AssetKeys.PANEL_LOSE,              'panel_lose.png');
        this.load.image(AssetKeys.ICON_POWERUP_BOMB,       'icon_powerup_bomb.png');
        this.load.image(AssetKeys.ICON_POWERUP_COLORBLAST, 'icon_powerup_colorblast.png');
        this.load.image(AssetKeys.ICON_POWERUP_FREEZE,     'icon_powerup_freeze.png');
        this.load.image(AssetKeys.ICON_POWERUP_SLINGSHOT,  'icon_powerup_slingshot.png');
        // Blocco 4 — Meta / monetization
        this.load.image(AssetKeys.CHEST_CLOSED,        'chest_closed.png');
        this.load.image(AssetKeys.CHEST_OPEN,          'chest_open.png');
        this.load.image(AssetKeys.COIN,                'coin.png');
        this.load.image(AssetKeys.GEM,                 'gem.png');
        this.load.image(AssetKeys.ADS_BADGE,           'ads_badge.png');
        this.load.image(AssetKeys.LEVEL_NODE_LOCKED,   'level_node_locked.png');
        this.load.image(AssetKeys.LEVEL_NODE_UNLOCKED, 'level_node_unlocked.png');
        this.load.image(AssetKeys.WHEEL_DISC,          'wheel_disc.png');
        this.load.image(AssetKeys.WHEEL_FRAME,         'wheel_frame.png');
        this.load.image(AssetKeys.STAR_FILLED,         'star_filled.png');
        this.load.image(AssetKeys.STAR_EMPTY,          'star_empty.png');
        this.load.image(AssetKeys.DRAIN_HOLE,          'drain_hole.png');
    }

    create(): void {
        this.scene.start('Menu');
    }
}
