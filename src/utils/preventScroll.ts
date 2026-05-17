const BLOCKED_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

export function installPreventScroll(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    document.addEventListener('wheel', (e) => {
        if (document.activeElement === canvas) e.preventDefault();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
        if (document.activeElement === canvas && BLOCKED_KEYS.has(e.key)) {
            e.preventDefault();
        }
    });
}
