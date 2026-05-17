export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
export const SAVE_KEY = 'marble_shooter_save_v1';
export const SAVE_VERSION = 1;

export const MARBLE_RADIUS = 16;
export const MARBLE_SPACING = 33;    // centro-centro, leggermente > 2*radius
export const CHAIN_SPEED = 0.00005; // Δt per ms
export const MARBLE_POOL_SIZE = 128;

export const PROJECTILE_SPEED = 0.6;             // px/ms
export const PROJECTILE_MAX_LIFETIME_MS = 3000;
export const COLLISION_THRESHOLD = MARBLE_RADIUS * 2;
export const PROJECTILE_POOL_SIZE = 5;
