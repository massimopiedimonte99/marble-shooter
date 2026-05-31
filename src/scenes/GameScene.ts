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
import { Shooter } from '@/gameplay/Shooter';
import { ProjectilePool } from '@/pool/ProjectilePool';
import { CollisionResolver } from '@/gameplay/CollisionResolver';
import { AimGuide } from '@/gameplay/AimGuide';
import { ComboTracker } from '@/gameplay/ComboTracker';
import { ScreenEffects } from '@/utils/ScreenEffects';
import { diag } from '@/utils/DiagLogger';
import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import type { EventPayloads } from '@/events/EventTypes';
import { audioManager } from '@/audio/AudioManager';
import { saveManager } from '@/state/SaveManager';

const INSERT_SETTLE_MS = 90;
const MATCH_HOLD_MS    = 120;
const RECOIL_MS        = 200;

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
    const n   = pts.length;

    const ox = new Float32Array(n);
    const oy = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(n - 1, i + 1)];
        const dx   = next.x - prev.x;
        const dy   = next.y - prev.y;
        const len  = Math.hypot(dx, dy) || 1;
        ox[i] = -dy / len;
        oy[i] =  dx / len;
    }

    const LAYERS: [number, number, number][] = [
        [40, 0x1A0900, 0.50],
        [33, 0x4B2412, 1.00],
        [26, 0x8B5A2B, 1.00],
        [19, 0xBE8540, 0.95],
        [11, 0xD9AC62, 0.78],
        [ 4, 0xF0D895, 0.40],
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

    // ── State ──────────────────────────────────────────────────────────────────
    private _frameN = 0;
    private _startTime = 0;
    private _spawnTimer?: Phaser.Time.TimerEvent;
    private _holdTimer?: Phaser.Time.TimerEvent;
    private _ended = false;
    private _chainEverPopulated = false;
    private _ignoreNextPointerUp = false;

    private _shelfRect!: Phaser.Geom.Rectangle;
    private _pauseRect!: Phaser.Geom.Rectangle;

    // ─────────────────────────────────────────────────────────────────────────
    private readonly _onMatchHandler = (p: EventPayloads[GameEvent.Match]) => {
        const multi  = this._comboTracker.registerMatch(this.time.now);
        const base   = coinReward(p.count);
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
        this._ended              = false;
        this._chainEverPopulated = false;
        this._frameN             = 0;
        this._score              = 0;
        this._flowOffset         = 0;
        this._startTime          = this.time.now;

        const POWERUP_SIZE    = 120;
        const POWERUP_SPACING = 110;
        const POWERUP_COUNT   = 4;
        const POWERUP_Y       = 1170;
        const totalSpan       = (POWERUP_COUNT - 1) * POWERUP_SPACING;
        const startX          = (GAME_WIDTH - totalSpan) / 2;

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
        buildCorner(path, 665, 250,   638, 190,   665, 217);  // top-right  → ↓
        path.lineTo(665, 945);
        buildCorner(path, 605, 1005,  665, 978,   638, 1005); // bottom-right ↓ →
        path.lineTo(115, 1005);
        buildCorner(path, 55, 945,    88, 1005,    55, 978);  // bottom-left ← ↑
        path.lineTo(55, 405);

        // ── Transition outer left → inner (C1 at both ends: CP1 above start, CP2 above end) ─
        path.cubicBezierTo(560, 405,   55, 345,   560, 330);

        // ── Inner loop ─────────────────────────────────────────────────────────
        path.lineTo(560, 825);
        buildCorner(path, 490, 895,   560, 856,   529, 895);  // inner BR ↓ ←  R=70
        path.lineTo(225, 895);
        buildCorner(path, 155, 825,   194, 895,   155, 856);  // inner BL ← ↑  R=70
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
        this.marblePool     = new MarblePool(this);
        this.chain          = new MarbleChain(path, this.marblePool);
        this.projectilePool = new ProjectilePool();
        this.shooter        = new Shooter(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);
        this.resolver       = new CollisionResolver(this.chain, this.projectilePool);

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
        powerUps.forEach((key, i) => {
            this.add.image(startX + i * POWERUP_SPACING, POWERUP_Y, key)
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
            if (this._ended || !this.shooter.enabled) return;
            if (!this._pointerInAimZone(pointer)) return;
            const proj = this.projectilePool.acquire();
            if (!proj) return;
            const color  = this.shooter.getNextColor();
            const marble = this.marblePool.acquire(color, this.shooter.x, this.shooter.y);
            if (!marble) { this.projectilePool.release(proj); return; }
            this.shooter.consumeAndRoll();
            proj.marble = marble;
            const dx = pointer.x - this.shooter.x;
            const dy = pointer.y - this.shooter.y;
            const len = Math.hypot(dx, dy) || 1;
            proj.vx = (dx / len) * PROJECTILE_SPEED;
            proj.vy = (dy / len) * PROJECTILE_SPEED;
            eventBus.emit(GameEvent.ProjectileFired, { color });
        });

        audioManager.bindEvents();
        eventBus.on(GameEvent.Match, this._onMatchHandler);
        eventBus.on(GameEvent.MarbleInserted, this._onMarbleInsertedHandler);
        this.events.on('shutdown', this._shutdown, this);

        if (import.meta.env.DEV) {
            (window as any).__game     = this.game;
            (window as any).__eventBus = eventBus;
            (window as any).__shooter  = this.shooter;
            (window as any).__chainDebug = {
                snapshot: () => { const o: MarbleColor[] = []; this.chain.forEachMarble(m => o.push(m.marbleColor)); return o; },
                length:   () => this.chain.length,
            };
            (window as any).__forceChainState = (colors: MarbleColor[]) => {
                this.chain.clearAll();
                for (const c of colors) this.chain.spawnMarble(c);
                this._chainEverPopulated = colors.length > 0;
            };
            (window as any).__disableShooter = (v = true) => this.shooter.setEnabled(!v);
        }

        diag.log('game_reset', { chainLen: this.chain.length });
    }

    // ─────────────────────────────────────────────────────────────────────────
    update(_time: number, delta: number): void {
        if (this._ended) return;

        this.chain.update(_time, delta);
        const pointer = this.input.activePointer;
        const inAim   = !this._ended && this.shooter.enabled && this._pointerInAimZone(pointer);
        this.shooter.update(pointer, inAim);
        this.shooter.drawGlow(_time);

        // Projectiles
        this.projectilePool.forEachAlive((p) => {
            const m = p.marble;
            if (!m) return;
            m.x += p.vx * delta;
            m.y += p.vy * delta;
            p.lifeMs += delta;
            const oob = m.x < -32 || m.x > GAME_WIDTH + 32 || m.y < -32 || m.y > GAME_HEIGHT + 32;
            if (p.lifeMs > PROJECTILE_MAX_LIFETIME_MS || oob) {
                this.marblePool.release(m); p.marble = null; this.projectilePool.release(p);
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

        // ── Aim guide ──────────────────────────────────────────────────────────────
        const colorHex = MARBLE_COLOR_HEX[this.shooter.getNextColor()];
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
        let n = m.node?.next ?? null;
        while (n) {
            const nm = n.value;
            this.tweens.killTweensOf(nm);
            nm.beginSettle(nm.x, nm.y);
            targets.push(nm);
            n = n.next;
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
        this.chain.forEachMarble((m) => {
            this.tweens.killTweensOf(m);
            m.setDisplaySize(D, D);
            m.beginSettle(m.x, m.y);
        });
        const result = this.chain.resolveMatchesFrom(seed);
        for (const g of result.groups) {
            eventBus.emit(GameEvent.Match, { count: g.count, color: g.color, position: g.position });
        }
        if (result.chainSteps >= 2) {
            eventBus.emit(GameEvent.ChainReaction, { steps: result.chainSteps, totalRemoved: result.totalRemoved });
        }
        if (this.chain.length === 0) { this.chain.frozen = false; return; }

        this._holdTimer?.remove(false);
        this._holdTimer = this.time.delayedCall(MATCH_HOLD_MS, () => {
            this._holdTimer = undefined;
            if (this._ended) return;
            const marbles: Marble[] = [];
            this.chain.forEachMarble((m) => marbles.push(m));
            this.tweens.add({
                targets: marbles,
                settleT: 0,
                duration: RECOIL_MS,
                ease: 'Quad.easeOut',
                onComplete: () => { if (!this._ended) this.chain.frozen = false; },
            });
        });
    }

    private _showComboText(level: number): void {
        const labels  = ['', '', '×2 COMBO!', '×3 HOT!', '×4 BLAZING!', '×5 INSANE!', 'FEVER!!!'];
        const colors  = ['', '', '#ffdd00',   '#ff8800', '#ff3300',     '#ff00cc',    '#ffffff'];
        const strokes = ['', '', '#883300',   '#882200', '#550000',     '#660055',    '#ff00cc'];
        const idx     = Math.min(level, 6);
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
        this._spawnTimer?.remove(false);
        this._holdTimer?.remove(false);
        this._holdTimer = undefined;
        this.chain.frozen = true;
        this.shooter.setEnabled(false);
        this.projectilePool.forEachAlive((p) => {
            if (p.marble) { this.marblePool.release(p.marble); p.marble = null; }
            this.projectilePool.release(p);
        });
        const elapsedMs = this.time.now - this._startTime;

        const { isHighScore, previous } = saveManager.submitScore(this._score);
        diag.log('score_submitted', { score: this._score, isHighScore, previousHigh: previous, target });

        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.time.delayedCall(280, () => {
            if (target === 'Win') {
                this.scene.start('Win', { score: this._score, elapsedMs });
            } else {
                this.scene.start('GameOver');
            }
        });
    }

    private _shutdown(): void {
        eventBus.off(GameEvent.Match, this._onMatchHandler);
        eventBus.off(GameEvent.MarbleInserted, this._onMarbleInsertedHandler);
        this._holdTimer?.remove(false);
        if (import.meta.env.DEV) {
            delete (window as any).__forceChainState;
            delete (window as any).__disableShooter;
        }
    }
}
