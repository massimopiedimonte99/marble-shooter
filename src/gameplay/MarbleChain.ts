import { Math as PhaserMath } from 'phaser';
import { CHAIN_SPEED, MARBLE_SPACING } from '@/constants/Config';
import { LinkedList, LinkedListNode } from '@/utils/LinkedList';
import { Marble } from '@/gameplay/Marble';
import { MarbleColor } from '@/gameplay/MarbleColor';
import { MarblePool } from '@/pool/MarblePool';
import { MatchDetector } from '@/gameplay/MatchDetector';
import { diag } from '@/utils/DiagLogger';

export type MatchResolutionResult = {
    totalRemoved: number;
    chainSteps: number;
    groups: { color: MarbleColor; count: number; position: { x: number; y: number } }[];
};

export type { LinkedListNode };

export class MarbleChain {
    private chain = new LinkedList<Marble>();
    private headT = 0;
    private readonly tSpacing: number;
    private readonly tmpVec = new PhaserMath.Vector2();
    private readonly speed: number;

    constructor(
        private readonly path: Phaser.Curves.Path,
        private readonly pool: MarblePool,
        speed: number = CHAIN_SPEED,
    ) {
        this.tSpacing = MARBLE_SPACING / path.getLength();
        this.speed = speed;
    }

    spawnMarble(color: MarbleColor): void {
        const m = this.pool.acquire(color, 0, 0);
        if (!m) return;
        m.setVisible(false);
        const node = this.chain.pushBack(m);
        m.node = node;
    }

    update(_time: number, delta: number): void {
        this.headT += this.speed * delta;

        let i = 0;
        this.chain.forEach((marble) => {
            const t = this.headT - i * this.tSpacing;
            if (t < 0 || t > 1) {
                marble.setVisible(false);
            } else {
                marble.setVisible(true);
                marble.setPathT(t, this.path, this.tmpVec);
            }
            i++;
        });
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
                const dx = m.x - x;
                const dy = m.y - y;
                const d2 = dx * dx + dy * dy;
                if (d2 < bestDistSq) { bestDistSq = d2; best = cur; }
            }
            cur = cur.next;
        }
        return best;
    }

    insertMarbleAfter(after: LinkedListNode<Marble>, marble: Marble): { afterIndex: number; shiftedCount: number; node: LinkedListNode<Marble> } {
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
            chainLen: this.chain.length,
            poolMarbleFreeAfter: this.pool.freeCount,
        });
    }

    resolveMatchesFrom(seed: LinkedListNode<Marble>): MatchResolutionResult {
        const groups: MatchResolutionResult['groups'] = [];
        let totalRemoved = 0;
        let chainSteps = 0;
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
            groups.push({ color, count: group.length, position: { x: px, y: py } });
            totalRemoved += group.length;
            chainSteps++;

            currentSeed = (before && after && before.value.marbleColor === after.value.marbleColor)
                ? before
                : null;
        }

        diag.log('resolution_complete', { totalRemoved, chainSteps, groupsCount: groups.length });
        return { totalRemoved, chainSteps, groups };
    }

    get length(): number { return this.chain.length; }
}
