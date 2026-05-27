import type { LinkedListNode } from '@/utils/LinkedList';
import type { Marble } from '@/gameplay/Marble';
import { diag } from '@/utils/DiagLogger';

const MIN_MATCH = 3;

export class MatchDetector {
    static hasMatch(seed: LinkedListNode<Marble>): boolean {
        const color = seed.value.marbleColor;
        let count = 1;
        let cur: LinkedListNode<Marble> | null = seed.prev;
        while (cur && cur.value.marbleColor === color) { count++; cur = cur.prev; }
        cur = seed.next;
        while (cur && cur.value.marbleColor === color) { count++; cur = cur.next; }
        return count >= MIN_MATCH;
    }

    static findMatchGroup(seed: LinkedListNode<Marble>): LinkedListNode<Marble>[] | null {
        const color = seed.value.marbleColor;
        const backward: LinkedListNode<Marble>[] = [];
        let cur: LinkedListNode<Marble> | null = seed.prev;
        while (cur && cur.value.marbleColor === color) {
            backward.push(cur);
            cur = cur.prev;
        }
        backward.reverse();

        const forward: LinkedListNode<Marble>[] = [];
        cur = seed.next;
        while (cur && cur.value.marbleColor === color) {
            forward.push(cur);
            cur = cur.next;
        }

        const group = [...backward, seed, ...forward];
        if (group.length < MIN_MATCH) return null;

        // seedIndex: count from head to seed
        let seedIndex = backward.length;
        let n: LinkedListNode<Marble> | null = backward[0] ?? seed;
        let headOffset = 0;
        while (n?.prev) { headOffset++; n = n.prev; }
        seedIndex += headOffset;

        diag.log('match_detected', { color, count: group.length, seedIndex });
        return group;
    }
}
