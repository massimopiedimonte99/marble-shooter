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
import { MatchDetector } from '@/gameplay/MatchDetector';
import type { LinkedListNode } from '@/gameplay/MarbleChain';
import { MarblePool } from '@/pool/MarblePool';
import { MarbleChain } from '@/gameplay/MarbleChain';
import { Shooter, hslToHex } from '@/gameplay/Shooter';
import { ProjectilePool } from '@/pool/ProjectilePool';
import { CollisionResolver } from '@/gameplay/CollisionResolver';
import { AimGuide } from '@/gameplay/AimGuide';
import { ComboTracker } from '@/gameplay/ComboTracker';
import { BombController } from '@/gameplay/BombController';
import { ScreenEffects } from '@/utils/ScreenEffects';
import { diag } from '@/utils/DiagLogger';
import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import type { EventPayloads } from '@/events/EventTypes';
import { audioManager } from '@/audio/AudioManager';
import { saveManager } from '@/state/SaveManager';

const INSERT_SETTLE_MS = 90;
const RECOIL_MS = 200;
const BOMB_RADIUS = 100;

const COIN_REWARD: Record<number, number> = { 3: 10, 4: 50, 5: 100, 6: 200 };
const coinReward = (count: number): number => COIN_REWARD[count] ?? count * 50;

/**
 * Draws a seamless multi-layer groove via offset polygons, then bakes it into a
 * WebGL texture (one draw call per frame) so the per-point maths run only once.
 * Each layer is a single filled polygon traced along the path normals — no line
 * caps, no joint artifacts at corners.
 */
function bakePathGroove(scene: Phaser.Scene, path: Phaser.Curves.Path, depth: number): void {
    const pts = path.getPoints(256);
    const n = pts.length;

    const ox = new Float32Array(n);
    const oy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(n - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        ox[i] = -dy / len;
        oy[i] = dx / len;
    }

    const LAYERS: [number, number, number][] = [
        [40, 0x1A0900, 0.50],
        [33, 0x4B2412, 1.00],
        [26, 0x8B5A2B, 1.00],
        [19, 0xBE8540, 0.95],
        [11, 0xD9AC62, 0.78],
        [4, 0xF0D895, 0.40],
    ];

    const gfx = scene.add.graphics();
    for (const [hw, color, alpha] of LAYERS) {
        gfx.fillStyle(color, alpha);
        gfx.beginPath();
        gfx.moveTo(pts[0].x + ox[0] * hw, pts[0].y + oy[0] * hw);
        for (let i = 1; i < n; i++) gfx.lineTo(pts[i].x + ox[i] * hw, pts[i].y + oy[i] * hw);
        for (let i = n - 1; i >= 0; i--) gfx.lineTo(pts[i].x - ox[i] * hw, pts[i].y - oy[i] * hw);
        gfx.closePath();
        gfx.fillPath();
    }

    // Bake to texture — after this the Graphics object is no longer needed each frame
    const KEY = '__groove';
    if (scene.textures.exists(KEY)) scene.textures.remove(KEY);
    gfx.generateTexture(KEY, GAME_WIDTH, GAME_HEIGHT);
    gfx.destroy();

    scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, KEY).setDepth(depth);
}

// ─── Corner bezier helpers ────────────────────────────────────────────────────
// R = corner radius, K = 0.5523*R (circular arc bezier magic number)
const buildCorner = (
    path: Phaser.Curves.Path,
    ex: number, ey: number,   // endpoint
    c1x: number, c1y: number, // cp1
    c2x: number, c2y: number, // cp2
) => path.cubicBezierTo(ex, ey, c1x, c1y, c2x, c2y);

export class GameScene extends BaseScene {
    public chain!: MarbleChain;
    private marblePool!: MarblePool;
    private shooter!: Shooter;
    private projectilePool!: ProjectilePool;
    private resolver!: CollisionResolver;

    private _path!: Phaser.Curves.Path;

    // ── Visual overlays ────────────────────────────────────────────────────────
    private _flowGfx!: Phaser.GameObjects.Graphics;
    private _flowOffset = 0;
    private _marbleHighlightGfx!: Phaser.GameObjects.Graphics;
    private _burstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // ── HUD ────────────────────────────────────────────────────────────────────
    private _scoreText!: Phaser.GameObjects.Text;
    private _comboText!: Phaser.GameObjects.Text;
    private _score = 0;

    // ── Systems ────────────────────────────────────────────────────────────────
    private _aimGuide!: AimGuide;
    private _comboTracker!: ComboTracker;
    private _fx!: ScreenEffects;

    // ── Danger ─────────────────────────────────────────────────────────────────
    private _dangerOverlay!: Phaser.GameObjects.Graphics;
    private _dangerState = false;
    private _dangerTween?: Phaser.Tweens.Tween;
    private _dangerHeartbeatTimer?: Phaser.Time.TimerEvent;

    // ── State ──────────────────────────────────────────────────────────────────
    private _frameN = 0;
    private _spawnTimer?: Phaser.Time.TimerEvent;
    private _ended = false;
    private _chainEverPopulated = false;
    private _ignoreNextPointerUp = false;

    private _shelfRect!: Phaser.Geom.Rectangle;
    private _pauseRect!: Phaser.Geom.Rectangle;

    // ── Bomb power-up ──────────────────────────────────────────────────────────
    private _bombIcon!: Phaser.GameObjects.Image;
    private _bombBadge!: Phaser.GameObjects.Container;
    private _bombBadgeText!: Phaser.GameObjects.Text;
    private _bombTrailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
    private _bombCtrl!: BombController;

    // ─────────────────────────────────────────────────────────────────────────
    private readonly _onMatchHandler = (p: EventPayloads[GameEvent.Match]) => {
        const multi = this._comboTracker.registerMatch(this.time.now);
        const base = coinReward(p.count);
        const reward = base * multi;
        this._score += reward;
        this._scoreText.setText(String(this._score));

        this._spawnFloatingScore(reward, p.position.x, p.position.y);
        this._spawnParticleBurst(p.position.x, p.position.y, p.color);

        this._fx.shake(p.count >= 4 ? 6 : 3, p.count >= 4 ? 180 : 120);
        // TODO: Rendere meno "aggressivi" questi FX quano p.count >= 4
        // if (p.count >= 4) {
        //     this._fx.flash(0xffffff, 70);
        //     this._spawnShockwave(p.position.x, p.position.y, MARBLE_COLOR_HEX[p.color]);
        // }
        // if (p.count >= 5) this._fx.zoomPulse(1.03, 120);


        diag.log('score_increment', { amount: reward, total: this._score, count: p.count, multi });
    };

    private readonly _onMarbleInsertedHandler = (p: EventPayloads[GameEvent.MarbleInserted]) => {
        if (p.marble) this._popMarble(p.marble, p.x, p.y);
        const node = p.marble?.node;
        if (node && MatchDetector.hasMatch(node)) {
            this.time.delayedCall(INSERT_SETTLE_MS, () => this._runMatchSequence(node));
        }
    };

    constructor() { super('Game'); }

    // ─────────────────────────────────────────────────────────────────────────
    create(): void {
        this._ended = false;
        this._chainEverPopulated = false;
        this._frameN = 0;
        this._score = 0;
        this._flowOffset = 0;
        const POWERUP_SIZE = 120;
        const POWERUP_SPACING = 110;
        const POWERUP_COUNT = 4;
        const POWERUP_Y = 1170;
        const totalSpan = (POWERUP_COUNT - 1) * POWERUP_SPACING;
        const startX = (GAME_WIDTH - totalSpan) / 2;

        // ── Background ──────────────────────────────────────────────────────────
        coverBackground(this, AssetKeys.BG_GAMEPLAY).setDepth(-10);

        // ══════════════════════════════════════════════════════════════════════
        // PATH — "The Rounded Serpent"
        // Two nested rounded-rectangle loops, lineTo for straights (perfectly
        // uniform arc-length) + cubicBezierTo for corners (circular-arc approx).
        // All points in x:[55,665] y:[190,1005] — marbles fully on-screen.
        // Arc-length parameterisation in MarbleChain ensures constant spacing.
        // ══════════════════════════════════════════════════════════════════════
        const path = new Curves.Path(-MARBLE_RADIUS, 190);

        // ── Outer loop ──────────────────────────────────────────────────────────
        path.lineTo(605, 190);
        buildCorner(path, 665, 250, 638, 190, 665, 217);  // top-right  → ↓
        path.lineTo(665, 945);
        buildCorner(path, 605, 1005, 665, 978, 638, 1005); // bottom-right ↓ →
        path.lineTo(115, 1005);
        buildCorner(path, 55, 945, 88, 1005, 55, 978);  // bottom-left ← ↑
        path.lineTo(55, 405);

        // ── Transition outer left → inner (C1 at both ends: CP1 above start, CP2 above end) ─
        path.cubicBezierTo(560, 405, 55, 345, 560, 330);

        // ── Inner loop ─────────────────────────────────────────────────────────
        path.lineTo(560, 825);
        buildCorner(path, 490, 895, 560, 856, 529, 895);  // inner BR ↓ ←  R=70
        path.lineTo(225, 895);
        buildCorner(path, 155, 825, 194, 895, 155, 856);  // inner BL ← ↑  R=70
        path.lineTo(155, 470);
        this._path = path;

        // ── Path groove (baked to texture — zero per-frame cost) ────────────────
        bakePathGroove(this, path, -5);

        // ── Flow dots (animated, updated in update()) ────────────────────────────
        this._flowGfx = this.add.graphics().setDepth(-4);

        // ── Drain hole ───────────────────────────────────────────────────────────
        const endPt = path.getEndPoint();
        this.add.image(endPt.x, endPt.y, AssetKeys.DRAIN_HOLE)
            .setDisplaySize(100, 100).setDepth(-3);

        // ── Gameplay objects ─────────────────────────────────────────────────────
        this.marblePool = new MarblePool(this);
        this.chain = new MarbleChain(path, this.marblePool);
        this.projectilePool = new ProjectilePool();
        this.shooter = new Shooter(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.resolver = new CollisionResolver(this.chain, this.projectilePool);

        // ── 3D marble highlight overlay (updated in update()) ────────────────────
        this._marbleHighlightGfx = this.add.graphics().setDepth(2);

        // ── Danger vignette (updated in update()) ────────────────────────────────

        // ── Systems ──────────────────────────────────────────────────────────────
        this._fx = new ScreenEffects(this);
        this._aimGuide = new AimGuide(this);
        this._comboTracker = new ComboTracker()
            .onLevelUp((level) => {
                this._showComboText(level);
                audioManager.playCombo(level);
            });

        // ── Particles ────────────────────────────────────────────────────────────
        this._burstEmitter = this.add.particles(0, 0, AssetKeys.PARTICLE_CIRCLE, {
            lifespan: 420,
            speed: { min: 110, max: 240 },
            scale: { start: 0.07, end: 0 },
            alpha: { start: 0.95, end: 0 },
            emitting: false,
            blendMode: 'ADD',
        }).setDepth(15);

        // Bomb trail — warm fire tints, soft and short-lived
        this._bombTrailEmitter = this.add.particles(0, 0, AssetKeys.PARTICLE_CIRCLE, {
            lifespan: 220,
            speed: { min: 30, max: 80 },
            scale: { start: 0.06, end: 0 },
            alpha: { start: 0.85, end: 0 },
            tint: [0xff4d6d, 0xff8c4d, 0xffd84d],
            emitting: false,
            blendMode: 'ADD',
        }).setDepth(15);

        // ── Score HUD ─────────────────────────────────────────────────────────────
        const SCORE_Y = 50;
        const scoreBg = this.add.graphics().setDepth(15);
        scoreBg.fillStyle(0x2d4f5c, 0.85);
        scoreBg.fillRoundedRect(GAME_WIDTH / 2 - 110, SCORE_Y - 30, 220, 60, 25);
        this.add.image(GAME_WIDTH / 2 - 75, SCORE_Y, AssetKeys.COIN)
            .setDisplaySize(40, 40).setDepth(16);
        this._scoreText = this.add.text(GAME_WIDTH / 2 - 45, SCORE_Y, '0', {
            fontFamily: 'Arial Black',
            fontSize: '28px',
            color: '#ffffff',
        }).setOrigin(0, 0.5).setDepth(16);

        // ── Danger vignette ───────────────────────────────────────────────────────
        this._dangerState = false;
        this._dangerOverlay = this.add.graphics().setDepth(19).setAlpha(0);
        this._dangerOverlay.fillStyle(0xff4d6d, 1);
        const STRIP_W = 70;
        this._dangerOverlay.fillRect(0, 0, GAME_WIDTH, STRIP_W);
        this._dangerOverlay.fillRect(0, GAME_HEIGHT - STRIP_W, GAME_WIDTH, STRIP_W);
        this._dangerOverlay.fillRect(0, STRIP_W, STRIP_W, GAME_HEIGHT - 2 * STRIP_W);
        this._dangerOverlay.fillRect(GAME_WIDTH - STRIP_W, STRIP_W, STRIP_W, GAME_HEIGHT - 2 * STRIP_W);

        // ── Combo text ────────────────────────────────────────────────────────────
        this._comboText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.33, '', {
            fontFamily: 'Arial Black',
            fontSize: '56px',
            color: '#ffdd00',
            stroke: '#cc5500',
            strokeThickness: 7,
            shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 10, fill: true },
        }).setOrigin(0.5).setDepth(30).setAlpha(0).setScale(0);

        // ── Pause button ──────────────────────────────────────────────────────────
        const pauseBtn = this.add.image(GAME_WIDTH - 56, 56, AssetKeys.ICON_PAUSE)
            .setDisplaySize(64, 64).setDepth(16)
            .setInteractive({ useHandCursor: true });
        pauseBtn.on('pointerdown', () => {
            diag.log('button_pressed', { id: 'pause' });
            this.scene.pause();
            this.scene.launch('Pause');
        });
        this._pauseRect = pauseBtn.getBounds();

        // ── Power-up shelf ────────────────────────────────────────────────────────
        const SHELF_W = 510, SHELF_H = 140;
        const shelf = this.add.graphics().setDepth(12);
        shelf.fillStyle(0x0a0a0a, 0.55);
        shelf.fillRoundedRect(
            GAME_WIDTH / 2 - SHELF_W / 2, POWERUP_Y - SHELF_H / 2,
            SHELF_W, SHELF_H, 30,
        );
        this._shelfRect = new Geom.Rectangle(
            GAME_WIDTH / 2 - SHELF_W / 2, POWERUP_Y - SHELF_H / 2,
            SHELF_W, SHELF_H,
        );
        const powerUps: AssetKeys[] = [
            AssetKeys.ICON_POWERUP_BOMB,
            AssetKeys.ICON_POWERUP_COLORBLAST,
            AssetKeys.ICON_POWERUP_FREEZE,
            AssetKeys.ICON_POWERUP_SLINGSHOT,
        ];

        // Bomb — fire-and-detonate paradigm
        this._bombIcon = this.add.image(startX, POWERUP_Y, AssetKeys.ICON_POWERUP_BOMB)
            .setDisplaySize(POWERUP_SIZE, POWERUP_SIZE).setDepth(13)
            .setInteractive({ useHandCursor: true });

        // ── Inventory badge: dark disc + "×N" text, top-right of icon ───────────
        const badgeGfx = this.add.graphics();
        badgeGfx.fillStyle(0x2d4f5c, 0.95);
        badgeGfx.fillCircle(0, 0, 16);
        this._bombBadgeText = this.add.text(0, 0, '×1', {
            fontFamily: 'Arial Black', fontSize: '16px', color: '#ffffff',
        }).setOrigin(0.5);
        this._bombBadge = this.add.container(startX + 38, POWERUP_Y - 38, [badgeGfx, this._bombBadgeText])
            .setDepth(14);

        // BombController wires up setBombMode and icon glow
        this._bombCtrl = new BombController(this, this.shooter, this._bombIcon);

        this._bombIcon.on('pointerdown', () => {
            // if (saveManager.getInventory('bomb') <= 0 && !this._bombCtrl.isLoaded) {
            //     diag.log('button_pressed', { id: 'bomb', result: 'empty' });
            //     return;
            // }
            if (this._bombCtrl.isLoaded) this._bombCtrl.unload('user_toggle');
            else this._bombCtrl.load();
        });

        this._refreshBombBadge();

        // Remaining 3 power-ups — placeholder handlers
        powerUps.slice(1).forEach((key, i) => {
            this.add.image(startX + (i + 1) * POWERUP_SPACING, POWERUP_Y, key)
                .setDisplaySize(POWERUP_SIZE, POWERUP_SIZE).setDepth(13)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => diag.log('button_pressed', { id: key }));
        });

        if (import.meta.env.DEV) {
            this.add.text(16, GAME_HEIGHT - 16, `${GAME_WIDTH}×${GAME_HEIGHT}`, {
                fontFamily: 'Arial', fontSize: '12px', color: '#444466',
            }).setOrigin(0, 1);
        }

        // ── Marble spawn ──────────────────────────────────────────────────────────
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

        // ── Input ─────────────────────────────────────────────────────────────────
        // Suppress the leftover pointerup from the menu "Play" button only when the
        // pointer is already held down at scene-start (i.e., user hasn't released yet).
        this._ignoreNextPointerUp = this.input.activePointer.isDown;

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this._ignoreNextPointerUp) { this._ignoreNextPointerUp = false; return; }
            if (this._ended) return;
            if (!this.shooter.enabled) return;
            if (!this._pointerInAimZone(pointer)) return;

            const proj = this.projectilePool.acquire();
            if (!proj) return;
            const color = this.shooter.getNextColor();
            const marble = this.marblePool.acquire(color, this.shooter.x, this.shooter.y);
            if (!marble) { this.projectilePool.release(proj); return; }

            const isFiringBomb = this._bombCtrl.isLoaded;
            if (isFiringBomb) {
                proj.isBomb = true;
                this._bombCtrl.commitFire();
                this._refreshBombBadge();
            } else {
                this.shooter.consumeAndRoll();
            }

            proj.marble = marble;
            const dx = pointer.x - this.shooter.x;
            const dy = pointer.y - this.shooter.y;
            const len = Math.hypot(dx, dy) || 1;
            proj.vx = (dx / len) * PROJECTILE_SPEED;
            proj.vy = (dy / len) * PROJECTILE_SPEED;
            if (!isFiringBomb) eventBus.emit(GameEvent.ProjectileFired, { color });
        });

        audioManager.bindEvents();
        eventBus.on(GameEvent.Match, this._onMatchHandler);
        eventBus.on(GameEvent.MarbleInserted, this._onMarbleInsertedHandler);
        eventBus.on(GameEvent.BombInserted, this._onBombInsertedHandler);
        this.events.on('shutdown', this._shutdown, this);

        if (import.meta.env.DEV) {
            (window as any).__game = this.game;
            (window as any).__eventBus = eventBus;
            (window as any).__shooter = this.shooter;
            (window as any).__chainDebug = {
                snapshot: () => { const o: MarbleColor[] = []; this.chain.forEachMarble(m => o.push(m.marbleColor)); return o; },
                length: () => this.chain.length,
            };
            (window as any).__forceChainState = (colors: MarbleColor[]) => {
                this.chain.clearAll();
                for (const c of colors) this.chain.spawnMarble(c);
                this._chainEverPopulated = colors.length > 0;
            };
            (window as any).__disableShooter = (v = true) => this.shooter.setEnabled(!v);
            (window as any).__bomb = {
                load: () => this._bombCtrl.load(),
                unload: () => this._bombCtrl.unload('user_toggle'),
                isLoaded: () => this._bombCtrl.isLoaded,
                inventory: () => saveManager.getInventory('bomb'),
                grant: (n = 1) => { saveManager.grantPowerUp('bomb', n); this._refreshBombBadge(); },
            };
        }

        diag.log('game_reset', { chainLen: this.chain.length });
    }

    // ─────────────────────────────────────────────────────────────────────────
    update(_time: number, delta: number): void {
        if (this._ended) return;

        this.chain.update(_time, delta);
        const pointer = this.input.activePointer;
        const inAim = !this._ended && this.shooter.enabled && this._pointerInAimZone(pointer);
        this.shooter.update(pointer, inAim);
        this.shooter.drawGlow(_time);

        // Projectiles
        this.projectilePool.forEachAlive((p) => {
            const m = p.marble;
            if (!m) return;
            m.x += p.vx * delta;
            m.y += p.vy * delta;
            p.lifeMs += delta;
            // Bomb: same rainbow tint as the cannon display marble
            if (p.isBomb) m.setTint(hslToHex((_time * 0.0005) % 1, 1.0, 0.55));
            const oob = m.x < -32 || m.x > GAME_WIDTH + 32 || m.y < -32 || m.y > GAME_HEIGHT + 32;
            if (p.lifeMs > PROJECTILE_MAX_LIFETIME_MS || oob) {
                this.marblePool.release(m); p.marble = null; this.projectilePool.release(p);
                diag.log('projectile_release', { reason: oob ? 'oob' : 'lifetime' });
            }
        });
        this.resolver.update();

        // ── 3D marble highlights: specular (top-left) + shadow rim (bottom) ───────
        this._marbleHighlightGfx.clear();
        this.chain.forEachMarble((m) => {
            if (!m.visible) return;
            const r = MARBLE_RADIUS;
            // Main specular blob (bright, large)
            this._marbleHighlightGfx.fillStyle(0xffffff, 0.1);
            this._marbleHighlightGfx.fillEllipse(
                m.x - r * 0.22, m.y - r * 0.24,
                r * 0.80, r * 0.52,
            );
            // Inner bright nucleus
            this._marbleHighlightGfx.fillStyle(0xffffff, 0.28);
            this._marbleHighlightGfx.fillEllipse(
                m.x - r * 0.12, m.y - r * 0.30,
                r * 0.38, r * 0.26,
            );
        });

        // ── Path flow dots ─────────────────────────────────────────────────────────
        this._flowGfx.clear();
        const DOT_COUNT = 20;
        for (let i = 0; i < DOT_COUNT; i++) {
            const t = (this._flowOffset + i / DOT_COUNT) % 1;
            const pt = this._path.getPoint(t);
            if (!pt) continue;
            const fade = 0.12 + 0.18 * Math.sin(this._flowOffset * Math.PI * 40 + i * 0.85);
            this._flowGfx.fillStyle(0xffffff, Math.max(0, fade));
            this._flowGfx.fillCircle(pt.x, pt.y, 2.5);
        }
        this._flowOffset = (this._flowOffset + 0.00011 * delta) % 1;

        // ── Sync shooter color pool to chain (ensures no wasted shots) ────────────
        const chainColors: MarbleColor[] = [];
        this.chain.forEachMarble(m => {
            if (m.visible && !chainColors.includes(m.marbleColor)) chainColors.push(m.marbleColor);
        });
        this.shooter.setColorPool(chainColors);

        // ── Aim guide ──────────────────────────────────────────────────────────────
        const colorHex = this._bombCtrl.isLoaded
            ? hslToHex((_time * 0.0005) % 1, 1.0, 0.55)
            : MARBLE_COLOR_HEX[this.shooter.getNextColor()];
        this._aimGuide.update(pointer, this.shooter.x, this.shooter.y, colorHex, delta, inAim);

        // ── Win / lose ─────────────────────────────────────────────────────────────
        if (this._chainEverPopulated && this.chain.length === 0) {
            this._ended = true;
            eventBus.emit(GameEvent.LevelCompleted, {});
            this._endRun('Win');
            return;
        }
        if (this.chain.headFraction >= 1.0) {
            this._ended = true;
            eventBus.emit(GameEvent.GameOver, { chainLengthAtDeath: this.chain.length });
            this._endRun('GameOver');
            return;
        }

        // ── Danger state ───────────────────────────────────────────────────────────
        const isDanger = this.chain.headFraction >= 0.85;
        if (isDanger && !this._dangerState) this._enterDanger();
        else if (!isDanger && this._dangerState) this._exitDanger();

        this._frameN++;
        if (this._frameN % 60 === 0) {
            diag.log('frame_stats', {
                fps: Math.round(this.game.loop.actualFps),
                chainLen: this.chain.length,
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private _pointerInAimZone(pointer: Phaser.Input.Pointer): boolean {
        if (this._shelfRect.contains(pointer.x, pointer.y)) return false;
        if (this._pauseRect.contains(pointer.x, pointer.y)) return false;
        const dx = pointer.x - this.shooter.x;
        const dy = pointer.y - this.shooter.y;
        return Math.hypot(dx, dy) >= 50;
    }

    private _popMarble(m: Marble, fromX: number, fromY: number): void {
        const D = MARBLE_RADIUS * 2;
        const targets: Marble[] = [m];
        this.tweens.killTweensOf(m);
        m.beginSettle(fromX, fromY);
        // Head-side marbles (node.prev) slid forward one slot via advanceHead(1).
        // Settle them so they glide smoothly instead of snapping.
        // During an active cascade (chain.frozen=true), the cascade owns sibling tweens —
        // skip to avoid orphaning its onComplete and leaving chain.frozen=true stuck.
        if (!this.chain.frozen) {
            let n = m.node?.prev ?? null;
            while (n) {
                const nm = n.value;
                this.tweens.killTweensOf(nm);
                nm.setDisplaySize(D, D);      // cancel any stray drop-in scale
                nm.beginSettle(nm.x, nm.y);
                targets.push(nm);
                n = n.prev;
            }
        }
        this.tweens.add({
            targets,
            settleT: 0,
            duration: INSERT_SETTLE_MS,
            ease: 'Quad.easeOut',
            onComplete: () => {
                m.setDisplaySize(D * 1.15, D * 1.15);
                this.tweens.add({
                    targets: m, displayWidth: D, displayHeight: D,
                    duration: 90, ease: 'Back.easeOut',
                    onComplete: () => m.setDisplaySize(D, D),
                });
            },
        });
    }

    private _runMatchSequence(seed: LinkedListNode<Marble>): void {
        if (this._ended || !seed.value.node || this.chain.frozen) return;
        this.chain.frozen = true;
        const D = MARBLE_RADIUS * 2;

        // Settle the whole chain to current positions (kills mid-spawn tweens).
        this.chain.forEachMarble((m) => {
            this.tweens.killTweensOf(m);
            m.setDisplaySize(D, D);
            m.beginSettle(m.x, m.y);
        });

        let chainSteps = 0;
        let totalRemoved = 0;

        // Recursive helper — animates one cascade beat then schedules the next.
        const playStep = (currentSeed: LinkedListNode<Marble> | null): void => {
            if (this._ended || !currentSeed) { this._finishCascade(chainSteps, totalRemoved); return; }
            const step = this.chain.peekNextMatchGroup(currentSeed);
            if (!step) { this._finishCascade(chainSteps, totalRemoved); return; }

            // Emit Match NOW — score/SFX/particles fire per group, same payload, same order.
            eventBus.emit(GameEvent.Match, { count: step.count, color: step.color, position: step.position });
            chainSteps++;
            totalRemoved += step.count;

            const marbles = step.group.map(n => n.value);
            const { before, after } = step;

            // Phase 1 — Anticipation (A6): 1.0→1.08→1.0 yoyo 80ms.
            this.tweens.add({
                targets: marbles,
                displayWidth: D * 1.08,
                displayHeight: D * 1.08,
                duration: 80,
                ease: 'Quad.easeOut',
                yoyo: true,
                onComplete: () => {
                    // Phase 2 — Pop+fade (A5): 120ms scale 1.3 + alpha 0.
                    this.tweens.add({
                        targets: marbles,
                        displayWidth: D * 1.3,
                        displayHeight: D * 1.3,
                        alpha: 0,
                        duration: 120,
                        ease: 'Quad.easeOut',
                        onComplete: () => {
                            if (this._ended) return;
                            // Collect survivors BEFORE removal so they can animate sliding together.
                            const removedSet = new Set(step.group.map(n => n.value));
                            const remaining: Marble[] = [];
                            this.chain.forEachMarble(m => { if (!removedSet.has(m)) remaining.push(m); });
                            // Prime settle: each survivor records its current position.
                            // After retractHead the arc shifts; the tween slides them there.
                            remaining.forEach(m => m.beginSettle(m.x, m.y));
                            this.chain.removeMatchGroup(step.group, after !== null);
                            diag.log('match_detected', {
                                count: step.count,
                                color: step.color,
                                cascaded: !!(before && after &&
                                            before.value.marbleColor === after.value.marbleColor),
                            });
                            const nextSeed = (before && after &&
                                              before.value.marbleColor === after.value.marbleColor)
                                ? before : null;
                            // Slide survivors to fill the gap, then start the next beat.
                            if (remaining.length > 0) {
                                this.tweens.add({
                                    targets: remaining,
                                    settleT: 0,
                                    duration: 180,
                                    ease: 'Quad.easeOut',
                                    onComplete: () => { if (!this._ended) playStep(nextSeed); },
                                });
                            } else {
                                playStep(nextSeed);
                            }
                        },
                    });
                },
            });
        };

        playStep(seed);
    }

    private _finishCascade(chainSteps: number, totalRemoved: number): void {
        if (this._ended) return;
        diag.log('resolution_complete', { totalRemoved, chainSteps });
        if (chainSteps >= 2) {
            eventBus.emit(GameEvent.ChainReaction, { steps: chainSteps, totalRemoved });
        }
        if (this.chain.length === 0) { this.chain.frozen = false; return; }
        const marbles: Marble[] = [];
        this.chain.forEachMarble(m => { m.beginSettle(m.x, m.y); marbles.push(m); });
        this.tweens.add({
            targets: marbles,
            settleT: 0,
            duration: RECOIL_MS,
            ease: 'Quad.easeOut',
            onComplete: () => { if (!this._ended) this.chain.frozen = false; },
        });
    }

    private _enterDanger(): void {
        if (this._dangerState || this._ended) return;
        this._dangerState = true;
        diag.log('chain_danger_enter', { headFraction: this.chain.headFraction });
        this._dangerTween = this.tweens.add({
            targets: this._dangerOverlay,
            alpha: { from: 0.05, to: 0.22 },
            duration: 600,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
        audioManager.playDanger();
        this._dangerHeartbeatTimer = this.time.addEvent({
            delay: 1200,
            callback: () => audioManager.playDanger(),
            loop: true,
        });
    }

    private _exitDanger(): void {
        if (!this._dangerState) return;
        this._dangerState = false;
        diag.log('chain_danger_exit', {});
        this._dangerTween?.stop();
        this._dangerTween = undefined;
        this._dangerHeartbeatTimer?.remove(false);
        this._dangerHeartbeatTimer = undefined;
        this.tweens.add({
            targets: this._dangerOverlay,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeOut',
        });
    }

    private _showComboText(level: number): void {
        const labels = ['', '', '×2 COMBO!', '×3 HOT!', '×4 BLAZING!', '×5 INSANE!', 'FEVER!!!'];
        const colors = ['', '', '#ffdd00', '#ff8800', '#ff3300', '#ff00cc', '#ffffff'];
        const strokes = ['', '', '#883300', '#882200', '#550000', '#660055', '#ff00cc'];
        const idx = Math.min(level, 6);
        this.tweens.killTweensOf(this._comboText);
        this._comboText
            .setText(labels[idx] ?? `×${level}!`)
            .setColor(colors[idx] ?? '#ffffff')
            .setStroke(strokes[idx] ?? '#000000', 7)
            .setY(GAME_HEIGHT * 0.33).setAlpha(1).setScale(0.4);
        this.tweens.add({
            targets: this._comboText, scale: 1, duration: 210, ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: this._comboText,
                    alpha: 0, y: GAME_HEIGHT * 0.33 - 45,
                    delay: 650, duration: 340, ease: 'Quad.easeIn',
                });
            },
        });
    }

    // private _spawnShockwave(x: number, y: number, colorHex: number): void {
    //     const ring = this.add.graphics().setDepth(18).setPosition(x, y);
    //     ring.lineStyle(5, colorHex, 1.0);
    //     ring.strokeCircle(0, 0, 10);
    //     ring.setScale(0.1);
    //     this.tweens.add({
    //         targets: ring, scaleX: 9, scaleY: 9, alpha: 0,
    //         duration: 420, ease: 'Quad.easeOut',
    //         onComplete: () => ring.destroy(),
    //     });
    // }

    private _spawnFloatingScore(amount: number, x: number, y: number): void {
        const txt = this.add.text(0, 0, `+${amount}`, {
            fontFamily: 'Arial Black', fontSize: '40px', color: '#ffe066', strokeThickness: 5,
        }).setOrigin(0, 0.5);
        const COIN_SIZE = 38, GAP = 6;
        const totalW = COIN_SIZE + GAP + txt.width;
        const coin = this.add.image(-totalW / 2 + COIN_SIZE / 2, 0, AssetKeys.COIN)
            .setDisplaySize(COIN_SIZE, COIN_SIZE);
        txt.setX(-totalW / 2 + COIN_SIZE + GAP);
        const group = this.add.container(x, y, [coin, txt]).setDepth(20);
        this.tweens.add({
            targets: group,
            x: this._scoreText.x, y: this._scoreText.y,
            scale: { from: 1, to: 0.55 }, alpha: { from: 1, to: 0 },
            duration: 700, ease: 'Cubic.easeIn',
            onComplete: () => group.destroy(),
        });
    }

    private _spawnParticleBurst(x: number, y: number, color: MarbleColor): void {
        this._burstEmitter.setParticleTint(MARBLE_COLOR_HEX[color]);
        this._burstEmitter.explode(32, x, y);
    }

    private _endRun(target: 'Win' | 'GameOver'): void {
        this._ended = true;
        this._exitDanger();
        if (this._bombCtrl?.isLoaded) this._bombCtrl.unload('scene_end');
        this._spawnTimer?.remove(false);
        this.chain.frozen = true;
        this.shooter.setEnabled(false);
        this.projectilePool.forEachAlive((p) => {
            if (p.marble) { this.marblePool.release(p.marble); p.marble = null; }
            this.projectilePool.release(p);
        });
        const { isHighScore, previous } = saveManager.submitScore(this._score);
        diag.log('score_submitted', { score: this._score, isHighScore, previousHigh: previous, target });

        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.time.delayedCall(280, () => {
            this.scene.start(target === 'Win' ? 'Win' : 'GameOver', {
                score: this._score,
                isHighScore,
                previousHigh: previous,
            });
        });
    }

    // ── Bomb power-up handlers ─────────────────────────────────────────────────

    /**
     * Fired when CollisionResolver inserts a bomb marble into the chain.
     * Plays a brief "charge" animation on the inserted marble, then detonates.
     */
    private readonly _onBombInsertedHandler = (payload: EventPayloads[GameEvent.BombInserted]) => {
        const { marble: bombMarble } = payload;
        if (this._ended) return;

        // 1. Funzione per mantenere vivo l'effetto arcobaleno nella catena
        const animateBomb = (time: number) => {
            if (bombMarble && bombMarble.active) {
                bombMarble.setTint(hslToHex((time * 0.0005) % 1, 1.0, 0.55));
            }
        };
        
        // 2. Aggancia la funzione al ciclo di update
        this.events.on('update', animateBomb);

        // 3. Attendi 200ms, poi pulisci e detona
        this.time.delayedCall(1000, () => {
            this.events.off('update', animateBomb); // Rimuove l'animazione
            
            if (this._ended) return;
            
            this.chain.frozen = true;
            this._detonateFromChain(bombMarble, bombMarble.trueX, bombMarble.trueY);
        });
    };

    private _detonateFromChain(bombMarble: Marble, ix: number, iy: number): void {
        if (this._ended) { this.chain.frozen = false; return; }

        const RADIUS_SQ = BOMB_RADIUS * BOMB_RADIUS;
        const D = MARBLE_RADIUS * 2;

        // ── VFX ────────────────────────────────────────────────────────────────
        this._burstEmitter.explode(18, ix, iy);

        // Emit BombImpact so AudioManager plays the detonate SFX
        eventBus.emit(GameEvent.BombImpact, { x: ix, y: iy, marble: bombMarble });

        // ── Collect victims (bomb marble always included) ──────────────────────
        const victims: LinkedListNode<Marble>[] = [];
        this.chain.forEachMarble(m => {
            if (!m.visible || !m.node) return;
            const isBomb = m === bombMarble;
            const dx = m.trueX - ix, dy = m.trueY - iy;
            if (isBomb || dx * dx + dy * dy <= RADIUS_SQ) victims.push(m.node);
        });

        if (victims.length === 0) {
            diag.log('powerup_bomb_impact', { x: ix, y: iy, removed: 0 });
            if (!this._ended) this.chain.frozen = false;
            return;
        }

        const seedBefore = victims[0].prev;
        const popTargets = victims.map(n => n.value);

        // Scale-out + fade
        this.tweens.add({
            targets: popTargets,
            displayWidth: D * 1.5,
            displayHeight: D * 1.5,
            alpha: 0,
            duration: 160,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.chain.removeNodes(victims);
                this.chain.retractHead(victims.length);

                if (seedBefore?.value?.node) {
                    this.chain.frozen = false;
                    this._runMatchSequence(seedBefore);
                } else {
                    const remaining: Marble[] = [];
                    this.chain.forEachMarble(m => { m.beginSettle(m.x, m.y); remaining.push(m); });
                    if (remaining.length === 0) {
                        if (!this._ended) this.chain.frozen = false;
                    } else {
                        this.tweens.add({
                            targets: remaining, settleT: 0, duration: 200, ease: 'Quad.easeOut',
                            onComplete: () => { if (!this._ended) this.chain.frozen = false; },
                        });
                    }
                }
                diag.log('powerup_bomb_impact', { x: ix, y: iy, removed: victims.length });
            },
        });
    }

    /**
     * Gumball/Adventure Time style explosion:
     * white impact flash → flat orange disc with dark outline →
     * organic blob shards flying outward → white sparkle dots at periphery.
     * No geometric star points — organic and flat, bold dark outlines.
     */
    private _spawnExplosionVFX(x: number, y: number): void {
        // 1 — White impact flash (classic AT "hit frame"): fast expand + fade
        const flash = this.add.graphics().setDepth(28).setPosition(x, y);
        flash.fillStyle(0xffffff, 1.0);
        flash.fillCircle(0, 0, 50);
        flash.setScale(0.2);
        this.tweens.add({
            targets: flash, scaleX: 2, scaleY: 2, alpha: 0,
            duration: 180, ease: 'Quad.easeOut',
            onComplete: () => flash.destroy(),
        });

        // 2 — Orange flat disc with thick dark outline
        this.time.delayedCall(15, () => {
            const disc = this.add.graphics().setDepth(27).setPosition(x, y);
            disc.fillStyle(0xff8800, 1.0);
            disc.fillCircle(0, 0, 46);
            disc.lineStyle(6, 0x1a0a00, 1.0);
            disc.strokeCircle(0, 0, 46);
            disc.setScale(0.25);
            this.tweens.add({
                targets: disc, scaleX: 1.4, scaleY: 1.4, alpha: 0,
                duration: 310, ease: 'Quad.easeOut',
                onComplete: () => disc.destroy(),
            });
        });

        // 3 — Organic blob shards (yellow/orange/red, dark outlines) flying outward
        const BLOBS: [number, number, number, number, number][] = [
            // [color, rx, ry, angleFrac, dist]
            [0xffdd00, 15, 10, 0 / 6, 90],
            [0xff6600, 11, 15, 1 / 6, 98],
            [0xffaa00, 16, 9, 2 / 6, 85],
            [0xff4400, 10, 14, 3 / 6, 92],
            [0xffdd00, 13, 11, 4 / 6, 87],
            [0xff8800, 12, 13, 5 / 6, 95],
        ];
        BLOBS.forEach(([color, rx, ry, af, dist]) => {
            const angle = af * Math.PI * 2;
            const blob = this.add.graphics().setDepth(26).setPosition(x, y);
            blob.fillStyle(color, 1.0);
            blob.fillEllipse(0, 0, rx * 2, ry * 2);
            blob.lineStyle(3, 0x1a0a00, 1.0);
            blob.strokeEllipse(0, 0, rx * 2, ry * 2);
            this.tweens.add({
                targets: blob,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                scaleX: 0.15, scaleY: 0.15, alpha: 0,
                duration: 380, ease: 'Quad.easeOut', delay: 25,
                onComplete: () => blob.destroy(),
            });
        });

        // 4 — White sparkle dots at periphery (8 evenly spaced)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + 0.4;
            const dot = this.add.graphics().setDepth(25).setPosition(x, y);
            dot.fillStyle(0xffffff, 1.0);
            dot.fillCircle(0, 0, 5);
            this.tweens.add({
                targets: dot,
                x: x + Math.cos(angle) * 115,
                y: y + Math.sin(angle) * 115,
                scaleX: 0.3, scaleY: 0.3, alpha: 0,
                duration: 360, ease: 'Quad.easeOut', delay: 40,
                onComplete: () => dot.destroy(),
            });
        }
    }

    private _refreshBombBadge(): void {
        const inv = saveManager.getInventory('bomb');
        if (inv <= 0) {
            this._bombIcon.setAlpha(0.45);
            this._bombBadge.setVisible(false);
        } else {
            this._bombIcon.setAlpha(1);
            this._bombBadgeText.setText(`×${inv}`);
            this._bombBadge.setVisible(true);
        }
    }

    private _spawnShockwave(x: number, y: number): void {
        const ring = this.add.graphics().setDepth(18).setPosition(x, y);
        ring.lineStyle(6, 0xff4d6d, 0.9);
        ring.strokeCircle(0, 0, 1);
        this.tweens.add({
            targets: ring,
            scaleX: 150, scaleY: 150, alpha: 0,
            duration: 280, ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy(),
        });
    }

    private _shutdown(): void {
        this._exitDanger();
        eventBus.off(GameEvent.Match, this._onMatchHandler);
        eventBus.off(GameEvent.MarbleInserted, this._onMarbleInsertedHandler);
        eventBus.off(GameEvent.BombInserted, this._onBombInsertedHandler);
        if (import.meta.env.DEV) {
            delete (window as any).__forceChainState;
            delete (window as any).__disableShooter;
            delete (window as any).__bomb;
        }
    }
}
