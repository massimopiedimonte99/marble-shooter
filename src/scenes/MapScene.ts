import { BaseScene } from '@/scenes/BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { coverBackground } from '@/utils/coverBackground';
import { diag } from '@/utils/DiagLogger';
import { saveManager } from '@/state/SaveManager';
import { levelManager } from '@/levels/LevelManager';
import { CHAPTERS, CHAPTER_BG_TINTS, CHAPTER_NODE_TINTS, BG_TINT_ALPHA } from '@/levels/chapters';

// ── Layout constants ────────────────────────────────────────────────────────
const NODE_SPACING   = 150;
const DIVIDER_HEIGHT = 200;
const CHAPTER_BLOCK  = 20 * NODE_SPACING + DIVIDER_HEIGHT; // 3200

// Level 200's forward-y (bottom-to-top order): used to compute total height
const MAX_FORWARD_Y = DIVIDER_HEIGHT + 9 * CHAPTER_BLOCK + 19 * NODE_SPACING; // 31850
const TOTAL_H       = MAX_FORWARD_Y + NODE_SPACING / 2 + 400;                 // 32325

const HUD_HEIGHT  = 110;
const NODE_RADIUS = 55;  // hit-test radius (half of 110px displaySize)
const TAP_THRESH  = 8;   // px drag before it counts as scroll not tap

function clamp(v: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, v));
}

function formatCoins(n: number): string {
    if (n >= 10000) return `${Math.round(n / 1000)}K`;
    if (n >= 1000)  return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

// ── Inverted layout: level 1 at BOTTOM (large y), level 200 at TOP (small y) ─
function getLevelY(id: number): number {
    const chapterIdx = Math.floor((id - 1) / 20);
    const localIdx   = (id - 1) % 20;
    const forwardY   = DIVIDER_HEIGHT + chapterIdx * CHAPTER_BLOCK + localIdx * NODE_SPACING;
    return TOTAL_H - forwardY;
}

function getLevelX(id: number): number {
    const cx       = GAME_WIDTH / 2;
    const localIdx = (id - 1) % 20;
    const baseX    = localIdx % 2 === 0 ? cx - 90 : cx + 90;
    const jitter   = (id * 13 + 7) % 41 - 20;
    return baseX + jitter;
}

export class MapScene extends BaseScene {
    private _scrollContainer!: Phaser.GameObjects.Container;
    private _chapterLabel!: Phaser.GameObjects.Text;
    private _coinText!: Phaser.GameObjects.Text;
    private _nodePositions = new Map<number, { x: number; y: number }>();
    private _minScrollY = 0;

    constructor() { super('Map'); }

    create(): void {
        const cx = GAME_WIDTH / 2;

        coverBackground(this, AssetKeys.BG_GAMEPLAY);
        this.fadeIn();
        diag.log('map_open', { currentLevel: levelManager.getCurrentLevelId() });

        this._scrollContainer = this.add.container(0, 0).setDepth(5);
        this._minScrollY = GAME_HEIGHT - TOTAL_H;

        this._buildBackground();
        this._buildConnectingLines();
        this._buildChapterDividers();
        this._buildNodes();
        this._buildHUD(cx);
        this._wireScroll();

        this._scrollToCurrentLevel();
        this._updateChapterLabel();
    }

    // ── Scroll content ─────────────────────────────────────────────────────────

    private _buildBackground(): void {
        const gfx = this.add.graphics();
        this._scrollContainer.add(gfx);

        gfx.fillStyle(0x0a0a1a, 0.72);
        gfx.fillRect(0, 0, GAME_WIDTH, TOTAL_H);

        // Chapter tint bands — each chapter occupies 20*NODE_SPACING px in forward space,
        // but in flipped layout it's positioned at the inverted y.
        for (let ch = 0; ch < 10; ch++) {
            const forwardY0 = DIVIDER_HEIGHT + ch * CHAPTER_BLOCK;
            const bandH     = 20 * NODE_SPACING;
            // In flipped layout: the top of this band is TOTAL_H - (forwardY0 + bandH)
            const flippedY0 = TOTAL_H - forwardY0 - bandH;
            gfx.fillStyle(CHAPTER_BG_TINTS[ch], BG_TINT_ALPHA);
            gfx.fillRect(0, flippedY0, GAME_WIDTH, bandH);
        }
    }

    private _buildConnectingLines(): void {
        const gfx = this.add.graphics();
        this._scrollContainer.add(gfx);
        gfx.lineStyle(8, 0xf4e5c2, 0.45);

        for (let id = 1; id < 200; id++) {
            gfx.beginPath();
            gfx.moveTo(getLevelX(id),     getLevelY(id));
            gfx.lineTo(getLevelX(id + 1), getLevelY(id + 1));
            gfx.strokePath();
        }
    }

    private _buildChapterDividers(): void {
        const gfx    = this.add.graphics();
        this._scrollContainer.add(gfx);
        const panelW = GAME_WIDTH - 80;
        const panelH = 140;
        const cx     = GAME_WIDTH / 2;

        // Chapter 1 welcome banner — just below level 1 (bottom of the map)
        this._drawDividerBanner(gfx, cx, getLevelY(1) + NODE_SPACING, panelW, panelH, 1);

        // Inter-chapter banners — in the gap between last node of ch k and first of ch k+1
        for (let k = 1; k <= 9; k++) {
            const bannerY = (getLevelY(k * 20) + getLevelY(k * 20 + 1)) / 2;
            this._drawDividerBanner(gfx, cx, bannerY - 70, panelW, panelH, k + 1);
        }
    }

    private _drawDividerBanner(
        gfx: Phaser.GameObjects.Graphics,
        cx: number, cy: number,
        w: number, h: number,
        chapterId: number,
    ): void {
        const x0 = cx - w / 2;
        const y0 = cy - h / 2;

        gfx.fillStyle(0xf4e5c2, 0.95);
        gfx.fillRoundedRect(x0, y0, w, h, 30);
        gfx.lineStyle(6, 0xe87363, 1);
        gfx.strokeRoundedRect(x0, y0, w, h, 30);

        const ch = CHAPTERS[chapterId - 1];
        const t1 = this.add.text(cx, cy - 22, `CHAPTER ${ch.id}`, {
            fontFamily: 'Arial Black', fontSize: '22px',
            color: '#2da6a8', stroke: '#f4e5c2', strokeThickness: 2,
        }).setOrigin(0.5, 0.5);
        const t2 = this.add.text(cx, cy + 20, ch.name.toUpperCase(), {
            fontFamily: 'Arial Black', fontSize: '38px',
            color: '#e87363', stroke: '#f4e5c2', strokeThickness: 3,
        }).setOrigin(0.5, 0.5);
        this._scrollContainer.add([t1, t2]);
    }

    private _buildNodes(): void {
        const currentId   = levelManager.getCurrentLevelId();
        const completed   = saveManager.getCompletedLevels();
        const maxUnlocked = levelManager.getMaxUnlockedLevelId();

        for (let id = 1; id <= 200; id++) {
            const x = getLevelX(id);
            const y = getLevelY(id);
            this._nodePositions.set(id, { x, y });

            const chapterIdx = Math.floor((id - 1) / 20);
            const unlocked   = id <= maxUnlocked;
            const progress   = completed[id] ?? null;
            const isCurrent  = id === currentId;

            const nc = this.add.container(x, y);
            this._scrollContainer.add(nc);

            if (isCurrent) {
                const glow = this.add.image(0, -30, AssetKeys.LEVEL_NODE_UNLOCKED)
                    .setDisplaySize(132, 132).setAlpha(0.2)
                    .setTint(CHAPTER_NODE_TINTS[chapterIdx]);
                nc.add(glow);
                this.tweens.add({
                    targets: glow, scaleX: 0.7, scaleY: 0.7,
                    duration: 1400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
                });
            }

            const bg = this.add.image(0, - 30,
                unlocked ? AssetKeys.LEVEL_NODE_UNLOCKED : AssetKeys.LEVEL_NODE_LOCKED)
                .setDisplaySize(110, 110);
            if (unlocked) bg.setTint(CHAPTER_NODE_TINTS[chapterIdx]);
            nc.add(bg);

            if (unlocked) {
                nc.add(this.add.text(0, -30, String(id), {
                    fontFamily: 'Arial Black', fontSize: '34px',
                    color: '#ffffff', stroke: '#e87363', strokeThickness: 5,
                }).setOrigin(0.5, 0.5));
            }

            if (progress !== null) {
                for (let s = 0; s < 3; s++) {
                    nc.add(this.add.image(-28 + s * 28, 40,
                        s < progress.stars ? AssetKeys.STAR_FILLED : AssetKeys.STAR_EMPTY)
                        .setDisplaySize(24, 24));
                }
            }

            if (isCurrent) {
                this.tweens.add({
                    targets: nc, scaleX: 1.08, scaleY: 1.08,
                    duration: 1400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
                });
            }
        }
    }

    // ── HUD (fixed, does not scroll) ───────────────────────────────────────────

    private _buildHUD(cx: number): void {
        const CY   = HUD_HEIGHT / 2;      // vertical center of bar = 55
        const PILL_W = 158;
        const PILL_H = 52;
        const PILL_R = GAME_WIDTH - 14;   // pill right edge
        const PILL_L = PILL_R - PILL_W;   // 548
        const PILL_T = (HUD_HEIGHT - PILL_H) / 2; // 29

        // ── Bar background ────────────────────────────────────────────────────
        const hudGfx = this.add.graphics().setDepth(18);

        // Subtle outer shadow strip
        hudGfx.fillStyle(0xb07040, 0.22);
        hudGfx.fillRoundedRect(0, 0, GAME_WIDTH, HUD_HEIGHT + 6, { tl: 0, tr: 0, bl: 26, br: 26 });

        // Main cream bar
        hudGfx.fillStyle(0xfbedd5, 1);
        hudGfx.fillRoundedRect(0, 0, GAME_WIDTH, HUD_HEIGHT, { tl: 0, tr: 0, bl: 22, br: 22 });

        // Coral bottom accent line
        hudGfx.lineStyle(3, 0xe87363, 0.9);
        hudGfx.beginPath();
        hudGfx.moveTo(20, HUD_HEIGHT);
        hudGfx.lineTo(GAME_WIDTH - 20, HUD_HEIGHT);
        hudGfx.strokePath();

        // ── Coin pill ─────────────────────────────────────────────────────────
        // Pill background
        hudGfx.fillStyle(0xffffff, 1);
        hudGfx.fillRoundedRect(PILL_L, PILL_T, PILL_W, PILL_H, PILL_H / 2);
        hudGfx.lineStyle(2.5, 0xe87363, 1);
        hudGfx.strokeRoundedRect(PILL_L, PILL_T, PILL_W, PILL_H, PILL_H / 2);

        // Thin divider inside pill separating count from "+"
        hudGfx.lineStyle(1.5, 0xe8d4a2, 1);
        hudGfx.beginPath();
        hudGfx.moveTo(PILL_R - 46, PILL_T + 10);
        hudGfx.lineTo(PILL_R - 46, PILL_T + PILL_H - 10);
        hudGfx.strokePath();

        // ── Back arrow ────────────────────────────────────────────────────────
        const backArrow = this.add.text(30, CY, '←', {
            fontFamily: 'Arial Black',
            fontSize: '46px',
            color: '#e87363',
            stroke: '#3a1a0e',
            strokeThickness: 3,
        }).setOrigin(0, 0.5).setDepth(20).setInteractive({ useHandCursor: true });
        backArrow.on('pointerdown', () => {
            diag.log('button_pressed', { id: 'map_back' });
            this.fadeOutTo('Menu', 280);
        });

        // ── Chapter label (center of bar) ─────────────────────────────────────
        this._chapterLabel = this.add.text(cx - 20, CY, '', {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: '#2da6a8',
            stroke: '#fdf5e8',
            strokeThickness: 3,
        }).setOrigin(0.5, 0.5).setDepth(20);

        // ── Coin icon + count ─────────────────────────────────────────────────
        this.add.image(PILL_L + 28, CY, AssetKeys.COIN)
            .setDisplaySize(36, 36).setDepth(20);

        this._coinText = this.add.text(PILL_L + 54, CY,
            formatCoins(saveManager.getTotalCoins()), {
                fontFamily: 'Arial Black',
                fontSize: '28px',
                color: '#3a1a0e',
            }).setOrigin(0, 0.5).setDepth(20);

        // ── "+" ads stub ──────────────────────────────────────────────────────
        const plusBtn = this.add.text(PILL_R - 23, CY, '+', {
            fontFamily: 'Arial Black',
            fontSize: '34px',
            color: '#e87363',
            stroke: '#fdf5e8',
            strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setDepth(20).setInteractive({ useHandCursor: true });
        plusBtn.on('pointerdown', () => diag.log('ad_watched', { reward: 'pending' }));
    }

    // ── Scroll ─────────────────────────────────────────────────────────────────

    private _wireScroll(): void {
        let dragStartY     = 0;
        let dragScrollStart = 0;
        let isDragScroll   = false;

        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            dragStartY      = p.y;
            dragScrollStart = this._scrollContainer.y;
            isDragScroll    = false;
        });

        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            if (!p.isDown) return;
            const dy = p.y - dragStartY;
            if (Math.abs(dy) > TAP_THRESH) isDragScroll = true;
            if (isDragScroll) {
                this._scrollContainer.y = clamp(dragScrollStart + dy, this._minScrollY, 0);
                this._updateChapterLabel();
            }
        });

        this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
            if (isDragScroll) return;
            const worldY = p.y - this._scrollContainer.y;
            const hit    = this._findNodeAt(p.x, worldY);
            if (hit !== null) this._onNodeTap(hit);
        });
    }

    private _findNodeAt(worldX: number, worldY: number): number | null {
        for (const [levelId, pos] of this._nodePositions) {
            if (Math.hypot(worldX - pos.x, worldY - pos.y) < NODE_RADIUS) return levelId;
        }
        return null;
    }

    private _onNodeTap(id: number): void {
        if (!levelManager.isLevelUnlocked(id)) {
            diag.log('map_node_locked_tap', { levelId: id });
            return;
        }
        diag.log('map_node_tap', { levelId: id });
        this.fadeOutTo('Game', 280, { levelId: id });
    }

    private _scrollToCurrentLevel(): void {
        const y = getLevelY(levelManager.getCurrentLevelId());
        this._scrollContainer.y = clamp(-y + GAME_HEIGHT / 2, this._minScrollY, 0);
    }

    private _updateChapterLabel(): void {
        const centerWorldY  = GAME_HEIGHT / 2 - this._scrollContainer.y;
        // Invert the flipped Y back to a forward-Y to determine the chapter
        const forwardEquiv  = TOTAL_H - centerWorldY;
        const raw           = Math.floor((forwardEquiv - DIVIDER_HEIGHT) / CHAPTER_BLOCK);
        const chapterIdx    = clamp(raw, 0, 9);
        const ch            = CHAPTERS[chapterIdx];
        this._chapterLabel.setText(`Chapter ${ch.id} — ${ch.name}`);
    }
}
