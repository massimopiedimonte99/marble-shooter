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

            // Proximity gate: any chain marble within collision range?
            if (!this.chain.findClosestNode(m.x, m.y, THRESH_SQ)) return;

            // The collision fires ~COLLISION_THRESHOLD pixels before the projectile
            // reaches the chain centre (diagonal approach displaces the current position
            // by up to THRESH × sin(angle) perpendicular to the chain — more than one
            // marble spacing at typical shot angles). Project forward along the velocity
            // to recover the true impact point, then find the nearest gap there.
            const speed = Math.hypot(p.vx, p.vy) || 1;
            const impactX = m.x + (p.vx / speed) * COLLISION_THRESHOLD;
            const impactY = m.y + (p.vy / speed) * COLLISION_THRESHOLD;
            const hit = this.chain.findNearestGapNode(impactX, impactY, Number.MAX_SAFE_INTEGER);
            if (!hit) return;

            const { afterIndex, shiftedCount, node: newNode } = this.chain.insertMarbleAfter(hit, m);
            eventBus.emit(GameEvent.MarbleInserted, { color: m.marbleColor, x: m.x, y: m.y, marble: m });
            diag.log('collision', { color: m.marbleColor, x: impactX, y: impactY });
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
