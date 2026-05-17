import { MARBLE_POOL_SIZE } from '@/constants/Config';
import { Marble } from '@/gameplay/Marble';
import { MarbleColor } from '@/gameplay/MarbleColor';

export class MarblePool {
    private group: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene, maxSize: number = MARBLE_POOL_SIZE) {
        this.group = scene.add.group({
            classType: Marble,
            maxSize,
            runChildUpdate: false,
        });
    }

    acquire(color: MarbleColor, x: number, y: number): Marble | null {
        const m = this.group.get(x, y) as Marble | null;
        if (!m) return null;
        m.setActive(true).setVisible(true);
        m.setPosition(x, y);
        m.setColor(color);
        return m;
    }

    release(marble: Marble): void {
        marble.node = null;
        this.group.killAndHide(marble);
    }
}
