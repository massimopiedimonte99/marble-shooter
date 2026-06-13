export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const SAVE_KEY = 'marble_shooter_save_v1';
export const SAVE_VERSION = 1;

export const MARBLE_RADIUS = 40;
export const MARBLE_SPACING = 48;    // centro-centro: 36px overlap keeps chain visually solid
export const CHAIN_SPEED = 0.00002; // Δt per ms

// Marbles che riempiono la catena a inizio livello (payload del livello).
export const CHAIN_INITIAL_MARBLES = 28;
// Capacità del pool: deve superare la capienza dell'intera path (~92 marble a 48px)
// + invisible tail backlog + 1 in volo. Con head-advance il lose arriva naturalmente
// (headFraction >= 1.0) prima che il pool si esaurisca.
export const MARBLE_POOL_SIZE = 120;

export const PROJECTILE_SPEED = 1.2;             // px/ms
export const PROJECTILE_MAX_LIFETIME_MS = 3000;
export const COLLISION_THRESHOLD = MARBLE_RADIUS * 2;
export const PROJECTILE_POOL_SIZE = 1;
