import { Math as PhaserMath } from 'phaser';
import { CHAIN_SPEED, MARBLE_SPACING } from '@/constants/Config';
import { LinkedList, LinkedListNode } from '@/utils/LinkedList';
import { Marble } from '@/gameplay/Marble';
import { MarbleColor } from '@/gameplay/MarbleColor';
import { MarblePool } from '@/pool/MarblePool';
import { MatchDetector } from '@/gameplay/MatchDetector';
import { ArcLengthPath } from '@/gameplay/ArcLengthPath';
import { diag } from '@/utils/DiagLogger';

// Squared distance from point P to the nearest point on segment A→B.
// Using segment (not just marble centers) avoids picking the wrong marble
// when curves bring path-far marbles into Euclidean proximity.
function segmentDistSq(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) { const ex = px - ax, ey = py - ay; return ex * ex + ey * ey; }
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const qx = ax + t * dx - px, qy = ay + t * dy - py;
    return qx * qx + qy * qy;
}

export type MatchResolutionResult = {
    totalRemoved: number;
    chainSteps: number;
    groups: { color: MarbleColor; count: number; position: { x: number; y: number } }[];
};

export type { LinkedListNode };

export class MarbleChain {
    public frozen = false;
    private chain = new LinkedList<Marble>();
    /** Arc-length position of the head marble (pixels along the path) */
    private _headArcLen = 0;
    private readonly arcPath: ArcLengthPath;
    /** pixels / ms — keeps the same traversal time as the old t-based speed */
    private readonly speedPx: number;
    private readonly tmpVec = new PhaserMath.Vector2();

    constructor(
        path: Phaser.Curves.Path,
        private readonly pool: MarblePool,
        speed: number = CHAIN_SPEED,
    ) {
        this.arcPath = new ArcLengthPath(path);
        this.speedPx = speed * this.arcPath.totalLength;
    }

    spawnMarble(color: MarbleColor): void {
        const m = this.pool.acquire(color, 0, 0);
        if (!m) return;
        m.setVisible(false);
        const node = this.chain.pushBack(m);
        m.node = node;
    }

    update(_time: number, delta: number): void {
        if (!this.frozen) {
            this._headArcLen += this.speedPx * delta;
        }
        let i = 0;
        this.chain.forEach((marble) => {
            const s = this._headArcLen - i * MARBLE_SPACING;
            if (s < 0 || s > this.arcPath.totalLength) {
                marble.setVisible(false);
            } else {
                marble.setVisible(true);
                marble.setPathT(this.arcPath.tAt(s), this.arcPath.path, this.tmpVec);
            }
            i++;
        });
    }

    retractHead(slots: number): void {
        this._headArcLen -= slots * MARBLE_SPACING;
        if (this._headArcLen < 0) this._headArcLen = 0;
        diag.log('chain_retract', { slots, headArcLen: this._headArcLen });
    }

    forEachMarble(cb: (m: Marble) => void): void {
        this.chain.forEach((m) => cb(m));
    }

    findClosestNode(x: number, y: number, maxDistSq: number): LinkedListNode<Marble> | null {
        let best: LinkedListNode<Marble> | null = null;
        let bestDistSq = maxDistSq;
        let cur = this.chain.head;
        while (cur) {
            const m = cur.value;
            if (m.visible) {
                const dx = m.trueX - x;
                const dy = m.trueY - y;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestDistSq) { bestDistSq = d2; best = cur; }
            }
            cur = cur.next;
        }
        return best;
    }

    /**
     * Finds the node after which to insert a new marble so that it lands in the
     * gap geometrically closest to (x, y).
     *
     * Uses point-to-segment distance on each adjacent pair rather than
     * point-to-center distance on individual marbles. On curves, Euclidean
     * nearest-marble can return a marble that is path-far but happens to be
     * Euclidean-near (around the bend), causing the new marble to settle at the
     * wrong arc-length slot. Segment distance is immune to this because marbles
     * around the corner are not adjacent to the targeted gap.
     */
    findNearestGapNode(x: number, y: number, maxDistSq: number): LinkedListNode<Marble> | null {
        let best: LinkedListNode<Marble> | null = null;
        let bestDistSq = maxDistSq;
        let cur = this.chain.head;
        while (cur) {
            if (cur.value.visible) {
                const nxt = cur.next;
                const distSq = (nxt && nxt.value.visible)
                    ? segmentDistSq(x, y, cur.value.trueX, cur.value.trueY, nxt.value.trueX, nxt.value.trueY)
                    : (x - cur.value.trueX) ** 2 + (y - cur.value.trueY) ** 2;
                if (distSq < bestDistSq) { bestDistSq = distSq; best = cur; }
            }
            cur = cur.next;
        }
        return best;
    }

    insertMarbleAfter(
        after: LinkedListNode<Marble>,
        marble: Marble,
    ): { afterIndex: number; shiftedCount: number; node: LinkedListNode<Marble> } {
        const newNode = this.chain.insertAfter(after, marble);
        marble.node = newNode;
        let afterIndex = 0;
        let n: LinkedListNode<Marble> | null = this.chain.head;
        while (n && n !== newNode) { afterIndex++; n = n.next; }
        let shifted = 0;
        let cur = newNode.next;
        while (cur) { shifted++; cur = cur.next; }
        return { afterIndex, shiftedCount: shifted, node: newNode };
    }

    removeNodes(nodes: LinkedListNode<Marble>[]): void {
        for (const n of nodes) {
            this.chain.remove(n);
            this.pool.release(n.value);
        }
        diag.log('chain_removed', {
            removedCount: nodes.length,
            newLength: this.chain.length,
        });
    }

    resolveMatchesFrom(seed: LinkedListNode<Marble>): MatchResolutionResult {
        const groups: MatchResolutionResult['groups'] = [];
        let totalRemoved = 0;
        let chainSteps   = 0;
        let currentSeed: LinkedListNode<Marble> | null = seed;

        while (currentSeed) {
            const group = MatchDetector.findMatchGroup(currentSeed);
            if (!group) break;
            const before = group[0].prev;
            const after  = group[group.length - 1].next;
            const px = (group[0].value.x + group[group.length - 1].value.x) / 2;
            const py = (group[0].value.y + group[group.length - 1].value.y) / 2;
            const color = group[0].value.marbleColor;
            this.removeNodes(group);
            if (after) this.retractHead(group.length);
            groups.push({ color, count: group.length, position: { x: px, y: py } });
            totalRemoved += group.length;
            chainSteps++;
            currentSeed = (before && after && before.value.marbleColor === after.value.marbleColor)
                ? before : null;
        }

        diag.log('resolution_complete', { totalRemoved, chainSteps });
        return { totalRemoved, chainSteps, groups };
    }

    /** Bezier t of the head marble (0–1). */
    get headT(): number { return this.arcPath.tAt(this._headArcLen); }

    /** Fraction of path traversed (0–1) based on arc-length. Use for danger/lose checks. */
    get headFraction(): number { return this._headArcLen / this.arcPath.totalLength; }

    get length(): number { return this.chain.length; }

    setHeadArcLen(arcLen: number): void {
        this._headArcLen = arcLen;
    }

    clearAll(): void {
        const nodes: LinkedListNode<Marble>[] = [];
        let cur = this.chain.head;
        while (cur) { nodes.push(cur); cur = cur.next; }
        for (const n of nodes) { this.chain.remove(n); this.pool.release(n.value); }
        this._headArcLen = 0;
    }
}
