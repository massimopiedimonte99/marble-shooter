export type DiagKind =
    | 'projectile_fire' | 'projectile_release'
    | 'collision' | 'chain_insert'
    | 'match_detected' | 'chain_removed' | 'resolution_complete'
    | 'audio_play'
    | 'frame_stats'
    | 'win_condition_met' | 'lose_condition_met'
    | 'scene_transition' | 'game_reset'
    | 'button_pressed'
    | 'chain_freeze_start' | 'chain_freeze_end'
    | 'back_movement_start' | 'back_movement_end' | 'chain_retract'
    | 'score_increment' | 'marble_pop'
    | 'save_load' | 'save_persist' | 'save_persist_error'
    | 'save_version_mismatch' | 'save_reset'
    | 'score_submitted';

interface DiagEntry { kind: DiagKind; t: number; [k: string]: unknown; }

declare global { interface Window { __diagEvents?: DiagEntry[]; __game?: Phaser.Game } }

const DEV = import.meta.env.DEV;

export const diag = {
    log(kind: DiagKind, payload: Record<string, unknown> = {}): void {
        if (!DEV) return;
        const entry: DiagEntry = { kind, t: performance.now(), ...payload };
        if (typeof window !== 'undefined') {
            (window.__diagEvents ??= []).push(entry);
        }
        console.log('[DIAG]', JSON.stringify(entry));
    },
    clear(): void { if (typeof window !== 'undefined') window.__diagEvents = []; },
};
