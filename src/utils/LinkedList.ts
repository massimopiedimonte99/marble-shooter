export class LinkedListNode<T> {
    constructor(
        public value: T,
        public prev: LinkedListNode<T> | null = null,
        public next: LinkedListNode<T> | null = null,
    ) {}
}

export class LinkedList<T> {
    private _head: LinkedListNode<T> | null = null;
    private _tail: LinkedListNode<T> | null = null;
    private _length = 0;

    get head(): LinkedListNode<T> | null { return this._head; }
    get tail(): LinkedListNode<T> | null { return this._tail; }
    get length(): number { return this._length; }

    pushBack(value: T): LinkedListNode<T> {
        const node = new LinkedListNode(value, this._tail, null);
        if (this._tail) {
            this._tail.next = node;
        } else {
            this._head = node;
        }
        this._tail = node;
        this._length++;
        return node;
    }

    insertAfter(after: LinkedListNode<T>, value: T): LinkedListNode<T> {
        const node = new LinkedListNode(value, after, after.next);
        if (after.next) {
            after.next.prev = node;
        } else {
            this._tail = node;
        }
        after.next = node;
        this._length++;
        return node;
    }

    remove(node: LinkedListNode<T>): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this._head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this._tail = node.prev;
        }
        node.prev = null;
        node.next = null;
        this._length--;
    }

    forEach(cb: (value: T, node: LinkedListNode<T>, index: number) => void): void {
        let current = this._head;
        let i = 0;
        while (current) {
            const next = current.next; // cache in case cb mutates the list
            cb(current.value, current, i++);
            current = next;
        }
    }
}
