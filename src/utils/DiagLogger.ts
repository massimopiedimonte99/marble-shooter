export type DiagKind =
    | 'projectile_fire' | 'projectile_release'
    | 'collision' | 'chain_insert'
    | 'match_detected' | 'chain_removed' | 'resolution_complete'
    | 'audio_play'
    | 'frame_stats';

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
