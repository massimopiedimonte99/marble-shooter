import { Curves } from 'phaser';
import { BaseScene } from '@/scenes/BaseScene';
import {
    GAME_WIDTH, GAME_HEIGHT,
    MARBLE_RADIUS, MARBLE_POOL_SIZE, PROJECTILE_SPEED, PROJECTILE_MAX_LIFETIME_MS,
} from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { MarbleColor, MARBLE_COLOR_COUNT, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';
import type { Marble } from '@/gameplay/Marble';
import { MarblePool } from '@/pool/MarblePool';
import { MarbleChain } from '@/gameplay/MarbleChain';
import { Shooter } from '@/gameplay/Shooter';
import { ProjectilePool } from '@/pool/ProjectilePool';
import { CollisionResolver } from '@/gameplay/CollisionResolver';
import { diag } from '@/utils/DiagLogger';
import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import type { EventPayloads } from '@/events/EventTypes';
import { audioManager } from '@/audio/AudioManager';

const CHAIN_FREEZE_MS = 500;
const COIN_REWARD: Record<number, number> = { 3: 10, 4: 50, 5: 100, 6: 200 };
const coinReward = (count: number): number => COIN_REWARD[count] ?? count * 50;

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

    private _scoreText!: Phaser.GameObjects.Text;
    private _score = 0;
    private _freezeTimer?: Phaser.Time.TimerEvent;
    private _burstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    private _ignoreNextPointerUp = true;

    private _onMatchHandler = (p: EventPayloads[GameEvent.Match]) => {
        this.chain.frozen = true;
        this._freezeTimer?.remove(false);
        this._freezeTimer = this.time.delayedCall(CHAIN_FREEZE_MS, () => {
            this._freezeTimer = undefined;
            if (this._ended) return;
            this.chain.frozen = false;
            diag.log('chain_freeze_end', {});
        });
        diag.log('chain_freeze_start', { ms: CHAIN_FREEZE_MS, count: p.count });

        const reward = coinReward(p.count);
        this._score += reward;
        this._scoreText.setText(String(this._score));
        diag.log('score_increment', { amount: reward, total: this._score, count: p.count });

        this._spawnFloatingScore(reward, p.position.x, p.position.y);
        this._spawnParticleBurst(p.position.x, p.position.y, p.color);

        diag.log('frame_stats', {
            fps: Math.round(this.game.loop.actualFps),
            chainLen: this.chain.length,
            projFree: this.projectilePool.freeCount,
            poolMarbleFree: this.marblePool.freeCount,
        });
    };

    private _onMarbleInsertedHandler = (p: EventPayloads[GameEvent.MarbleInserted]) => {
        if (p.marble) this._popMarble(p.marble);
    };

    constructor() {
        super('Game');
    }

    create(): void {
        this._ignoreNextPointerUp = true;
        this._ended = false;
        this._chainEverPopulated = false;
        this._frameN = 0;
        this._score = 0;

        const POWERUP_SIZE = 100;
        const POWERUP_SPACING = 110;
        const POWERUP_COUNT = 4;
        const POWERUP_Y = 1170;
        const totalSpan = (POWERUP_COUNT - 1) * POWERUP_SPACING;
        const startX = (GAME_WIDTH - totalSpan) / 2;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);

        // SPIRAL-v6r: outer oval CCW then inner loop → drain below cannon.
        // Tuned for MARBLE_RADIUS=40: right CPs at x=675 (675+40=715<720), top CPs at y=60
        // (marble top at y=20), bottom CPs at y=1040 (marble bottom at y=1080 < shelf at 1100).
        const path = new Curves.Path(80, 150);
        path.cubicBezierTo(630, 150,  300,  60,  570,  60);   // outer top
        path.cubicBezierTo(640,1000,  675, 300,  675, 760);   // outer right
        path.cubicBezierTo( 80,1010,  630,1040,  80,1040);    // outer bottom
        path.cubicBezierTo( 90, 340,   70, 820,  70, 540);    // outer left
        path.cubicBezierTo(480, 280,  110, 140,  340, 210);   // inner top
        path.cubicBezierTo(490, 800,  560, 420,  560, 640);   // inner right
        path.cubicBezierTo(260, 840,  490, 960,  340, 960);   // inner bottom
        path.cubicBezierTo(360, 760,  220, 700,  330, 800);   // drain

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
        this.shooter = new Shooter(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.resolver = new CollisionResolver(this.chain, this.projectilePool);

        const SCORE_Y = 50;
        const scoreBg = this.add.graphics();
        scoreBg.fillStyle(0x2d4f5c, 0.85);
        scoreBg.fillRoundedRect(GAME_WIDTH / 2 - 110, SCORE_Y - 30, 220, 60, 25);
        scoreBg.setDepth(10);
        this.add.image(GAME_WIDTH / 2 - 75, SCORE_Y, AssetKeys.COIN).setDisplaySize(40, 40).setDepth(11);
        this._scoreText = this.add.text(GAME_WIDTH / 2 - 45, SCORE_Y, '0', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffffff',
        }).setOrigin(0, 0.5).setDepth(11);

        this._burstEmitter = this.add.particles(0, 0, AssetKeys.PARTICLE_CIRCLE, {
            lifespan: 420,
            speed: { min: 110, max: 230 },
            scale: { start: 0.06, end: 0 },
            alpha: { start: 0.95, end: 0 },
            emitting: false,
            blendMode: 'ADD'
        }).setDepth(15);

        diag.log('game_reset', {
            poolMarbleFreeAfter: this.marblePool.freeCount,
            poolProjFreeAfter: this.projectilePool.freeCount,
            chainLen: this.chain.length,
        });

        let lastSpawnColor = Math.floor(Math.random() * MARBLE_COLOR_COUNT) as MarbleColor;
        this._spawnTimer = this.time.addEvent({
            delay: 200,
            repeat: MARBLE_POOL_SIZE - 1,
            callback: () => {
                const color = Math.random() < 0.3
                    ? lastSpawnColor
                    : Math.floor(Math.random() * MARBLE_COLOR_COUNT) as MarbleColor;
                lastSpawnColor = color;
                this.chain.spawnMarble(color);
                this._chainEverPopulated = true;
            },
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            // Evitare che cliccando su "Play" nel menu venga sparata una marble a inizio game
            if (this._ignoreNextPointerUp) {
                this._ignoreNextPointerUp = false;
                return;
            }

            if (this._ended || !this.shooter.enabled) return;
            if (pointer.y < 90 || pointer.y > 1100) return;
            const adx = pointer.x - this.shooter.x;
            const ady = pointer.y - this.shooter.y;
            if (Math.hypot(adx, ady) < 50) return;

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
        eventBus.on(GameEvent.MarbleInserted, this._onMarbleInsertedHandler);

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
this.shooter.update(this.input.activePointer);
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
            this._endRun('GameOver');
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

    private _popMarble(m: Marble): void {
        this.tweens.killTweensOf(m);
        const D = MARBLE_RADIUS * 2;
        m.setDisplaySize(D * 1.6, D * 1.6);
        diag.log('marble_pop', { color: m.marbleColor });
        this.tweens.add({
            targets: m,
            displayWidth: D,
            displayHeight: D,
            duration: 160,
            ease: 'Back.easeOut',
            onComplete: () => m.setDisplaySize(D, D),
        });
    }

    private _spawnFloatingScore(amount: number, x: number, y: number): void {
        const txt = this.add.text(x, y, `+${amount}`, {
            fontFamily: 'Arial Black',
            fontSize: '40px',
            color: '#ffe066',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(20);
        this.tweens.add({
            targets: txt,
            x: this._scoreText.x,
            y: this._scoreText.y,
            scale: { from: 1, to: 0.55 },
            alpha: { from: 1, to: 0 },
            duration: 700,
            ease: 'Cubic.easeIn',
            onComplete: () => txt.destroy(),
        });
    }

    private _spawnParticleBurst(x: number, y: number, color: MarbleColor): void {
        this._burstEmitter.setParticleTint(MARBLE_COLOR_HEX[color]);
        this._burstEmitter.explode(30, x, y);
    }

    private _endRun(target: 'Win' | 'GameOver'): void {
        this._ended = true;
        this._spawnTimer?.remove(false);
        this._freezeTimer?.remove(false);
        this._freezeTimer = undefined;
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
        eventBus.off(GameEvent.MarbleInserted, this._onMarbleInsertedHandler);
        this._freezeTimer?.remove(false);
        if (import.meta.env.DEV) {
            delete (window as any).__forceChainState;
            delete (window as any).__disableShooter;
        }
    }
}
