export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const SAVE_KEY = 'marble_shooter_save_v1';
export const SAVE_VERSION = 1;

export const MARBLE_RADIUS = 40;
export const MARBLE_SPACING = 44;    // centro-centro: 36px overlap keeps chain visually solid
export const CHAIN_SPEED = 0.00002; // Δt per ms

// Marbles che riempiono la catena a inizio livello (payload del livello).
export const CHAIN_INITIAL_MARBLES = 28;
// Capacità del pool: DEVE superare la catena iniziale + inserimenti senza match
// + proiettili in volo, altrimenti il cannone resta a secco e smette di sparare.
export const MARBLE_POOL_SIZE = 64;

export const PROJECTILE_SPEED = 1.2;             // px/ms
export const PROJECTILE_MAX_LIFETIME_MS = 3000;
export const COLLISION_THRESHOLD = MARBLE_RADIUS * 2;
export const PROJECTILE_POOL_SIZE = 1;
