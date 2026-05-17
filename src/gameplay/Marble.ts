import { GameObjects } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { MarbleColor, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';
import type { LinkedListNode } from '@/utils/LinkedList';

export class Marble extends GameObjects.Arc {
    public marbleColor: MarbleColor = MarbleColor.RED;
    public node: LinkedListNode<Marble> | null = null;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, MARBLE_RADIUS, 0, 360, false, MARBLE_COLOR_HEX[MarbleColor.RED]);
    }

    setColor(color: MarbleColor): this {
        this.marbleColor = color;
        this.setFillStyle(MARBLE_COLOR_HEX[color]);
        return this;
    }

    getColor(): MarbleColor {
        return this.marbleColor;
    }

    setPathT(t: number, path: Phaser.Curves.Path, out: Phaser.Math.Vector2): this {
        path.getPoint(t, out);
        this.setPosition(out.x, out.y);
        return this;
    }
}
