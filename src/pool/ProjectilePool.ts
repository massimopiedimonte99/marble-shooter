import { PROJECTILE_POOL_SIZE } from '@/constants/Config';
import { Projectile } from '@/gameplay/Projectile';

export class ProjectilePool {
    private readonly slots: Projectile[] = [];

    constructor(size: number = PROJECTILE_POOL_SIZE) {
        for (let i = 0; i < size; i++) this.slots.push(new Projectile());
    }

    acquire(): Projectile | null {
        for (const p of this.slots) {
            if (!p.alive) { p.alive = true; p.lifeMs = 0; return p; }
        }
        return null;
    }

    release(p: Projectile): void {
        p.alive = false;
        p.marble = null;
        p.vx = 0;
        p.vy = 0;
        p.lifeMs = 0;
    }

    forEachAlive(cb: (p: Projectile) => void): void {
        for (const p of this.slots) if (p.alive) cb(p);
    }

    get freeCount(): number {
        let n = 0;
        for (const p of this.slots) if (!p.alive) n++;
        return n;
    }
}
