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
import { audioManager } from '@/audio/AudioManager';

export class GameScene extends BaseScene {
    public chain!: MarbleChain;
    private marblePool!: MarblePool;
    private shooter!: Shooter;
    private projectilePool!: ProjectilePool;
    private resolver!: CollisionResolver;
    private _frameN = 0;
    private _spawnTimer?: Phaser.Time.TimerEvent;
    private _ended = false;
    private _chainEverPopulated = false;
    private _onMatchHandler = () => {
        diag.log('frame_stats', {
            fps: Math.round(this.game.loop.actualFps),
            chainLen: this.chain.length,
            projFree: this.projectilePool.freeCount,
            poolMarbleFree: this.marblePool.freeCount,
        });
    };

    constructor() {
        super('Game');
    }

    create(): void {
        this._ended = false;
        this._chainEverPopulated = false;
        this._frameN = 0;

        this.cameras.main.setBackgroundColor('#16213e');

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

        diag.log('game_reset', {
            poolMarbleFreeAfter: this.marblePool.freeCount,
            poolProjFreeAfter: this.projectilePool.freeCount,
            chainLen: this.chain.length,
        });

        this._spawnTimer = this.time.addEvent({
            delay: 200,
            repeat: 29,
            callback: () => {
                const color = (Math.floor(Math.random() * MARBLE_COLOR_COUNT)) as MarbleColor;
                this.chain.spawnMarble(color);
                this._chainEverPopulated = true;
            },
        });

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this._ended || !this.shooter.enabled) return;
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

        audioManager.bindEvents();

        eventBus.on(GameEvent.Match, this._onMatchHandler);

        this.events.on('shutdown', this._shutdown, this);

        if (import.meta.env.DEV) {
            (window as Window & { __game?: Phaser.Game; __eventBus?: typeof eventBus }).__game = this.game;
            (window as any).__eventBus = eventBus;
            (window as any).__audioMgr = audioManager;
            (window as any).__shooter = this.shooter;
            (window as any).__chainDebug = {
                snapshot: () => {
                    const out: MarbleColor[] = [];
                    this.chain.forEachMarble((m) => out.push(m.marbleColor));
                    return out;
                },
                length: () => this.chain.length,
                poolFree: () => this.marblePool.freeCount,
                forceSpawnPattern: (colors: MarbleColor[]) => {
                    for (const color of colors) this.chain.spawnMarble(color);
                },
            };
            (window as any).__forceChainState = (colors: MarbleColor[]) => {
                this.chain.clearAll();
                for (const color of colors) this.chain.spawnMarble(color);
                this._chainEverPopulated = colors.length > 0;
            };
            (window as any).__disableShooter = (v: boolean = true) => {
                this.shooter.setEnabled(!v);
            };
        }
    }

    update(_time: number, delta: number): void {
        if (this._ended) return;

        this.chain.update(_time, delta);
        this.shooter.update(this.input.activePointer.x, this.input.activePointer.y);

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

        if (this._chainEverPopulated && this.chain.length === 0) {
            diag.log('win_condition_met', { chainLen: 0, t: this.time.now });
            this._ended = true;
            eventBus.emit(GameEvent.LevelCompleted, {});
            this._endRun('Win');
            return;
        }

        if (this.chain.headT >= 1.0) {
            diag.log('lose_condition_met', { headT: this.chain.headT, chainLen: this.chain.length });
            this._ended = true;
            eventBus.emit(GameEvent.GameOver, { chainLengthAtDeath: this.chain.length });
            this._endRun('GameOver');
            return;
        }

        this._frameN++;
        if (this._frameN % 60 === 0) {
            diag.log('frame_stats', {
                fps: Math.round(this.game.loop.actualFps),
                chainLen: this.chain.length,
                projFree: this.projectilePool.freeCount,
            });
        }
    }

    private _endRun(target: 'Win' | 'GameOver'): void {
        this._ended = true;
        this._spawnTimer?.remove(false);
        this.chain.frozen = true;
        this.shooter.setEnabled(false);
        this.projectilePool.forEachAlive((p) => {
            if (p.marble) { this.marblePool.release(p.marble); p.marble = null; }
            this.projectilePool.release(p);
        });
        diag.log('scene_transition', { from: 'GameScene', to: `${target}Scene` });
        this.scene.start(target);
    }

    private _shutdown(): void {
        eventBus.off(GameEvent.Match, this._onMatchHandler);
        if (import.meta.env.DEV) {
            delete (window as any).__forceChainState;
            delete (window as any).__disableShooter;
        }
    }
}
