import { Curves } from 'phaser';
import { BaseScene } from '@/scenes/BaseScene';
import {
    GAME_WIDTH, GAME_HEIGHT,
    PROJECTILE_SPEED, PROJECTILE_MAX_LIFETIME_MS,
} from '@/constants/Config';
import { MarbleColor, MARBLE_COLOR_COUNT } from '@/gameplay/MarbleColor';
import { MarblePool } from '@/pool/MarblePool';
import { MarbleChain } from '@/gameplay/MarbleChain';
import { Shooter } from '@/gameplay/Shooter';
import { ProjectilePool } from '@/pool/ProjectilePool';
import { CollisionResolver } from '@/gameplay/CollisionResolver';
import { diag } from '@/utils/DiagLogger';
import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';

export class GameScene extends BaseScene {
    public chain!: MarbleChain;
    private marblePool!: MarblePool;
    private shooter!: Shooter;
    private projectilePool!: ProjectilePool;
    private resolver!: CollisionResolver;
    private _frameN = 0;

    constructor() {
        super('Game');
    }

    create(): void {
        this.cameras.main.setBackgroundColor('#16213e');

        // S-path: 2 CubicBezier attraverso 1024×768
        const path = new Curves.Path(60, 100);
        path.cubicBezierTo(960, 350, 500, 60, 960, 200);
        path.cubicBezierTo(100, 660, 960, 520, 200, 660);

        const gfx = this.add.graphics();
        gfx.lineStyle(3, 0x445566, 0.7);
        path.draw(gfx, 128);

        this.marblePool = new MarblePool(this);
        this.chain = new MarbleChain(path, this.marblePool);
        this.projectilePool = new ProjectilePool();
        this.shooter = new Shooter(this, GAME_WIDTH / 2, GAME_HEIGHT - 60);
        this.resolver = new CollisionResolver(this.chain, this.projectilePool);

        // Spawna 30 marble di colori random ogni 200ms
        this.time.addEvent({
            delay: 200,
            repeat: 29,
            callback: () => {
                const color = (Math.floor(Math.random() * MARBLE_COLOR_COUNT)) as MarbleColor;
                this.chain.spawnMarble(color);
            },
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Ignora click nella zona del pulsante "← menu"
            if (pointer.y < 40 && pointer.x > GAME_WIDTH - 80) return;

            const proj = this.projectilePool.acquire();
            if (!proj) return;
            const color = this.shooter.consumeAndRoll();
            const marble = this.marblePool.acquire(color, this.shooter.x, this.shooter.y);
            if (!marble) { this.projectilePool.release(proj); return; }
            proj.marble = marble;
            const dx = pointer.x - this.shooter.x;
            const dy = pointer.y - this.shooter.y;
            const len = Math.hypot(dx, dy) || 1;
            proj.vx = (dx / len) * PROJECTILE_SPEED;
            proj.vy = (dy / len) * PROJECTILE_SPEED;
            diag.log('projectile_fire', { color, vx: proj.vx, vy: proj.vy, targetX: pointer.x, targetY: pointer.y });
            eventBus.emit(GameEvent.ProjectileFired, { color });
        });

        const back = this.add.text(GAME_WIDTH - 16, 16, '← menu', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#aaaaaa',
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        back.on('pointerover', () => back.setColor('#ffffff'));
        back.on('pointerout', () => back.setColor('#aaaaaa'));
        back.on('pointerdown', () => this.scene.start('Menu'));

        this.add.text(16, GAME_HEIGHT - 16, `${GAME_WIDTH}×${GAME_HEIGHT}`, {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#444466',
        }).setOrigin(0, 1);

        if (import.meta.env.DEV) {
            (window as Window & { __game?: Phaser.Game; __eventBus?: typeof eventBus }).__game = this.game;
            (window as any).__eventBus = eventBus;
        }
    }

    update(_time: number, delta: number): void {
        this.chain.update(_time, delta);

        this.projectilePool.forEachAlive((p) => {
            const m = p.marble;
            if (!m) return;
            m.x += p.vx * delta;
            m.y += p.vy * delta;
            p.lifeMs += delta;
            const oob = m.x < -32 || m.x > GAME_WIDTH + 32 || m.y < -32 || m.y > GAME_HEIGHT + 32;
            if (p.lifeMs > PROJECTILE_MAX_LIFETIME_MS || oob) {
                const reason = oob ? 'out_of_bounds' : 'lifetime';
                this.marblePool.release(m);
                p.marble = null;
                this.projectilePool.release(p);
                diag.log('projectile_release', { reason });
            }
        });

        this.resolver.update();

        this._frameN++;
        if (this._frameN % 60 === 0) {
            diag.log('frame_stats', {
                fps: Math.round(this.game.loop.actualFps),
                chainLen: this.chain.length,
                projFree: this.projectilePool.freeCount,
            });
        }
    }
}
