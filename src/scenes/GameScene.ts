import { Curves, Geom } from 'phaser';
import { BaseScene } from '@/scenes/BaseScene';
import {
    GAME_WIDTH, GAME_HEIGHT,
    MARBLE_RADIUS, CHAIN_INITIAL_MARBLES, PROJECTILE_SPEED, PROJECTILE_MAX_LIFETIME_MS,
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
import { Math as PhaserMath } from 'phaser';

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
    private _shelfRect!: Phaser.Geom.Rectangle;
    private _pauseRect!: Phaser.Geom.Rectangle;

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
        if (p.marble) this._popMarble(p.marble, p.x, p.y);
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
        const path = new Curves.Path(-20 ,150);

        path.cubicBezierTo(630, 150, 300,  60, 570,  60);
        path.cubicBezierTo(640,1000, 675, 300, 675, 760);
        path.cubicBezierTo( 80,1010, 630,1040,  80,1040);
        path.cubicBezierTo( 90, 340,  70, 820,  70, 540);

        path.cubicBezierTo(480, 280, 110, 140, 340, 210);
        path.cubicBezierTo(490, 800, 560, 420, 560, 640);
        path.cubicBezierTo(260, 840, 490, 960, 340, 960);
        path.cubicBezierTo(360, 760, 220, 700, 330, 800);

        if (import.meta.env.DEV) {
            const gfx = this.add.graphics();

            const points = path.getPoints(1024);

            const thickness = 30;

            const left: Phaser.Math.Vector2[] = [];
            const right: Phaser.Math.Vector2[] = [];

            for (let i = 0; i < points.length; i++) {
                const p = points[i];

                const prev = points[i - 1] || points[i];
                const next = points[i + 1] || points[i];

                const dx = next.x - prev.x;
                const dy = next.y - prev.y;

                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len;
                const ny = dx / len;

                left.push(new PhaserMath.Vector2(p.x + nx * thickness, p.y + ny * thickness));
                right.push(new PhaserMath.Vector2(p.x - nx * thickness, p.y - ny * thickness));
            }

            // disegna shape unica
            gfx.fillStyle(0x445566, 0.45);
            gfx.beginPath();

            gfx.moveTo(left[0].x, left[0].y);

            for (let i = 1; i < left.length; i++) {
                gfx.lineTo(left[i].x, left[i].y);
            }

            for (let i = right.length - 1; i >= 0; i--) {
                gfx.lineTo(right[i].x, right[i].y);
            }

            gfx.closePath();
            gfx.fillPath();
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
            repeat: CHAIN_INITIAL_MARBLES - 1,
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
            if (!this._pointerInAimZone(pointer)) return;

            const proj = this.projectilePool.acquire();
            if (!proj) return;
            const color = this.shooter.getNextColor();
            const marble = this.marblePool.acquire(color, this.shooter.x, this.shooter.y);
            if (!marble) { this.projectilePool.release(proj); return; }
            this.shooter.consumeAndRoll();
            proj.marble = marble;
            const dx = pointer.x - this.shooter.x;
            const dy = pointer.y - this.shooter.y;
            const len = Math.hypot(dx, dy) || 1;
            proj.vx = (dx / len) * PROJECTILE_SPEED;
            proj.vy = (dy / len) * PROJECTILE_SPEED;
            diag.log('projectile_fire', { color, vx: proj.vx, vy: proj.vy, targetX: pointer.x, targetY: pointer.y });
            eventBus.emit(GameEvent.ProjectileFired, { color });
        });

        const pauseBtn = this.add.image(GAME_WIDTH - 56, 56, AssetKeys.ICON_PAUSE)
            .setDisplaySize(64, 64)
            .setInteractive({ useHandCursor: true });
        pauseBtn.on('pointerdown', () => diag.log('button_pressed', { id: 'pause' }));
        this._pauseRect = pauseBtn.getBounds();

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

        // Solo il rettangolo dello scaffale blocca il tiro: lo spazio vuoto
        // sotto/ai lati resta zona di mira valida.
        this._shelfRect = new Geom.Rectangle(
            GAME_WIDTH / 2 - SHELF_WIDTH / 2,
            POWERUP_Y - SHELF_HEIGHT / 2,
            SHELF_WIDTH, SHELF_HEIGHT,
        );

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

    // Zona in cui si può mirare/sparare: bloccano il tiro solo gli elementi
    // davvero interattivi (scaffale power-up, tasto pausa) e il cannone stesso.
    // Il totalizzatore coin è solo display, quindi resta sparabile.
    private _pointerInAimZone(pointer: Phaser.Input.Pointer): boolean {
        if (this._shelfRect.contains(pointer.x, pointer.y)) return false;
        if (this._pauseRect.contains(pointer.x, pointer.y)) return false;
        const dx = pointer.x - this.shooter.x;
        const dy = pointer.y - this.shooter.y;
        return Math.hypot(dx, dy) >= 50;
    }

    update(_time: number, delta: number): void {
        if (this._ended) return;

        this.chain.update(_time, delta);
        const pointer = this.input.activePointer;
        this.shooter.update(pointer, !this._ended && this.shooter.enabled && this._pointerInAimZone(pointer));
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

    private _popMarble(m: Marble, fromX: number, fromY: number): void {
        const D = MARBLE_RADIUS * 2;
        diag.log('marble_pop', { color: m.marbleColor });

        // Inserimento come UN UNICO movimento: la pallina entra dal punto
        // d'impatto e, nello stesso istante e con la stessa durata, tutte le
        // palline dietro scivolano indietro di uno slot. Niente "scatto" dei
        // vicini seguito da una planata lenta: tutto parte e finisce insieme.
        const targets: Marble[] = [m];
        this.tweens.killTweensOf(m);
        m.beginSettle(fromX, fromY);

        let n = m.node?.next ?? null;
        while (n) {
            const nm = n.value;
            this.tweens.killTweensOf(nm);
            nm.beginSettle(nm.x, nm.y); // parte dalla posizione attuale (slot vecchio)
            targets.push(nm);
            n = n.next;
        }

        this.tweens.add({
            targets,
            settleT: 0,
            duration: 90,
            ease: 'Quad.easeOut',
            onComplete: () => {
                // "Pop" di arrivo solo sulla pallina inserita.
                m.setDisplaySize(D * 1.15, D * 1.15);
                this.tweens.add({
                    targets: m,
                    displayWidth: D,
                    displayHeight: D,
                    duration: 90,
                    ease: 'Back.easeOut',
                    onComplete: () => m.setDisplaySize(D, D),
                });
            },
        });
    }

    private _spawnFloatingScore(amount: number, x: number, y: number): void {
        const txt = this.add.text(0, 0, `+${amount}`, {
            fontFamily: 'Arial Black',
            fontSize: '40px',
            color: '#ffe066',
            strokeThickness: 5,
        }).setOrigin(0, 0.5);

        // Coin + testo raggruppati in un container, centrati sul punto del match
        // e fatti volare insieme verso il totalizzatore.
        const COIN_SIZE = 38;
        const GAP = 6;
        const totalW = COIN_SIZE + GAP + txt.width;
        const coin = this.add.image(-totalW / 2 + COIN_SIZE / 2, 0, AssetKeys.COIN)
            .setDisplaySize(COIN_SIZE, COIN_SIZE);
        txt.setX(-totalW / 2 + COIN_SIZE + GAP);

        const group = this.add.container(x, y, [coin, txt]).setDepth(20);
        this.tweens.add({
            targets: group,
            x: this._scoreText.x,
            y: this._scoreText.y,
            scale: { from: 1, to: 0.55 },
            alpha: { from: 1, to: 0 },
            duration: 700,
            ease: 'Cubic.easeIn',
            onComplete: () => group.destroy(),
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
