import { MARBLE_POOL_SIZE, MARBLE_RADIUS } from '@/constants/Config';
import { Marble } from '@/gameplay/Marble';
import { MarbleColor } from '@/gameplay/MarbleColor';

export class MarblePool {
    private group: Phaser.GameObjects.Group;
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene, maxSize: number = MARBLE_POOL_SIZE) {
        this.scene = scene;
        this.group = scene.add.group({
            classType: Marble,
            maxSize,
            runChildUpdate: false,
        });
    }

    acquire(color: MarbleColor, x: number, y: number): Marble | null {
        const m = this.group.get(x, y) as Marble | null;
        if (!m) return null;
        // Reset stato visivo: una pallina riciclata non deve trascinarsi dietro
        // tween di settle/pop o uno scostamento residuo.
        this.scene.tweens.killTweensOf(m);
        m.settleT = 0;
        m.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
        m.setActive(true).setVisible(true);
        m.setPosition(x, y);
        m.trueX = x;
        m.trueY = y;
        m.setColor(color);
        return m;
    }

    release(marble: Marble): void {
        marble.node = null;
        this.group.killAndHide(marble);
    }

    get freeCount(): number {
        return this.group.maxSize - this.group.countActive();
    }
}
