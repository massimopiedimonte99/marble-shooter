import { Curves } from 'phaser';
import { BaseScene } from '@/scenes/BaseScene';
import {
    GAME_WIDTH, GAME_HEIGHT,
    PROJECTILE_SPEED, PROJECTILE_MAX_LIFETIME_MS,
} from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
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

        const POWERUP_SIZE = 100;
        const POWERUP_SPACING = 110;
        const POWERUP_COUNT = 4;
        const POWERUP_Y = 1170;
        const totalSpan = (POWERUP_COUNT - 1) * POWERUP_SPACING;
        const startX = (GAME_WIDTH - totalSpan) / 2;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);

        const W = GAME_WIDTH, H = GAME_HEIGHT;
        const path = new Curves.Path(0.14 * W, 0.18 * H);
        path.cubicBezierTo(0.88 * W, 0.32 * H, 0.55 * W, 0.10 * H, 0.92 * W, 0.20 * H);
        path.cubicBezierTo(0.10 * W, 0.48 * H, 0.92 * W, 0.42 * H, 0.08 * W, 0.38 * H);
        path.cubicBezierTo(0.50 * W, 0.66 * H, 0.10 * W, 0.62 * H, 0.85 * W, 0.54 * H);

        if (import.meta.env.DEV) {
            const gfx = this.add.graphics();
            gfx.lineStyle(2, 0x445566, 0.25);
            path.draw(gfx, 128);
        }

        const endPt = path.getEndPoint();
        this.add.image(endPt.x, endPt.y, AssetKeys.DRAIN_HOLE)
            .setDisplaySize(70, 70)
            .setDepth(-5);

        this.marblePool = new MarblePool(this);
        this.chain = new MarbleChain(path, this.marblePool);
        this.projectilePool = new ProjectilePool();
        this.shooter = new Shooter(this, GAME_WIDTH / 2, 990);
        this.resolver = new CollisionResolver(this.chain, this.projectilePool);

        const SCORE_Y = 50;
        const scoreBg = this.add.graphics();
        scoreBg.fillStyle(0x2d4f5c, 0.85);
        scoreBg.fillRoundedRect(GAME_WIDTH / 2 - 110, SCORE_Y - 30, 220, 60, 25);
        scoreBg.setDepth(10);
        this.add.image(GAME_WIDTH / 2 - 75, SCORE_Y, AssetKeys.COIN).setDisplaySize(40, 40).setDepth(11);
        this.add.text(GAME_WIDTH / 2 - 45, SCORE_Y, '0', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffffff',
        }).setOrigin(0, 0.5).setDepth(11);

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
            if (pointer.y < 90 || pointer.y > 1100) return;

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

        this.add.image(GAME_WIDTH - 56, 56, AssetKeys.ICON_PAUSE)
            .setDisplaySize(64, 64)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => diag.log('button_pressed', { id: 'pause' }));

        const SHELF_WIDTH = 510;
        const SHELF_HEIGHT = 140;
        const shelf = this.add.graphics();
        shelf.fillStyle(0xe87363, 0.85);
        shelf.fillRoundedRect(
            GAME_WIDTH / 2 - SHELF_WIDTH / 2,
            POWERUP_Y - SHELF_HEIGHT / 2,
            SHELF_WIDTH, SHELF_HEIGHT, 30,
        );
        shelf.setDepth(0);

        const powerUps: AssetKeys[] = [
            AssetKeys.ICON_POWERUP_BOMB,
            AssetKeys.ICON_POWERUP_COLORBLAST,
            AssetKeys.ICON_POWERUP_FREEZE,
            AssetKeys.ICON_POWERUP_SLINGSHOT,
        ];
        powerUps.forEach((key, i) => {
            const px = startX + i * POWERUP_SPACING;
            this.add.image(px, POWERUP_Y, key)
                .setDisplaySize(POWERUP_SIZE, POWERUP_SIZE)
                .setDepth(1)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => diag.log('button_pressed', { id: key }));
        });

        if (import.meta.env.DEV) {
            this.add.text(16, GAME_HEIGHT - 16, `${GAME_WIDTH}×${GAME_HEIGHT}`, {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: '#444466',
            }).setOrigin(0, 1);
        }

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
