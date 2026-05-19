import { GameObjects } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { MarbleColor, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';
import type { LinkedListNode } from '@/utils/LinkedList';

export class Marble extends GameObjects.Sprite {
    public marbleColor: MarbleColor = MarbleColor.RED;
    public node: LinkedListNode<Marble> | null = null;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, AssetKeys.MARBLE_MASTER);
        this.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
    }

    setColor(color: MarbleColor): this {
        this.marbleColor = color;
        this.setTint(MARBLE_COLOR_HEX[color]);
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
