import { Math as PhaserMath } from 'phaser';
import { CHAIN_SPEED, MARBLE_SPACING } from '@/constants/Config';
import { LinkedList, LinkedListNode } from '@/utils/LinkedList';
import { Marble } from '@/gameplay/Marble';
import { MarbleColor } from '@/gameplay/MarbleColor';
import { MarblePool } from '@/pool/MarblePool';

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

    insertMarbleAfter(after: LinkedListNode<Marble>, marble: Marble): { afterIndex: number; shiftedCount: number } {
        const newNode = this.chain.insertAfter(after, marble);
        marble.node = newNode;

        let afterIndex = 0;
        let n: LinkedListNode<Marble> | null = this.chain.head;
        while (n && n !== newNode) { afterIndex++; n = n.next; }

        let shifted = 0;
        let cur = newNode.next;
        while (cur) { shifted++; cur = cur.next; }

        return { afterIndex, shiftedCount: shifted };
    }

    get length(): number { return this.chain.length; }
}
