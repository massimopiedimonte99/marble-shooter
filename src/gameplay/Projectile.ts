import type { Marble } from '@/gameplay/Marble';

export class Projectile {
    marble: Marble | null = null;
    vx = 0;
    vy = 0;
    alive = false;
    lifeMs = 0;
}
