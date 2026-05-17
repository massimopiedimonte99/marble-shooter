import { COLLISION_THRESHOLD } from '@/constants/Config';
import { diag } from '@/utils/DiagLogger';
import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import type { MarbleChain } from '@/gameplay/MarbleChain';
import type { ProjectilePool } from '@/pool/ProjectilePool';

const THRESH_SQ = COLLISION_THRESHOLD * COLLISION_THRESHOLD;

export class CollisionResolver {
    constructor(
        private readonly chain: MarbleChain,
        private readonly projectiles: ProjectilePool,
    ) {}

    update(): void {
        this.projectiles.forEachAlive((p) => {
            const m = p.marble;
            if (!m) return;
            const hit = this.chain.findClosestNode(m.x, m.y, THRESH_SQ);
            if (!hit) return;

            const { afterIndex, shiftedCount } = this.chain.insertMarbleAfter(hit, m);
            eventBus.emit(GameEvent.MarbleInserted, { color: m.marbleColor, x: m.x, y: m.y });
            diag.log('collision', { color: m.marbleColor, x: m.x, y: m.y });
            diag.log('chain_insert', {
                afterIndex,
                shiftedCount,
                newLength: this.chain.length,
                color: m.marbleColor,
            });
            p.marble = null;
            this.projectiles.release(p);
            diag.log('projectile_release', { reason: 'collision' });
        });
    }
}
