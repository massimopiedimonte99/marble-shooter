import { Math as PhaserMath } from 'phaser';
import { CHAIN_SPEED, MARBLE_SPACING } from '@/constants/Config';
import { LinkedList } from '@/utils/LinkedList';
import { Marble } from '@/gameplay/Marble';
import { MarbleColor } from '@/gameplay/MarbleColor';
import { MarblePool } from '@/pool/MarblePool';

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

    get length(): number { return this.chain.length; }
}
