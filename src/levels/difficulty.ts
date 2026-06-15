export const DIFFICULTY_CURVE = {
    totalMarbles:         { start: 30,  end: 75,  idMax: 200 },
    colorCount:           { start: 3,   end: 6,   idMax: 200 },
    chainSpeedMultiplier: { start: 1.0, end: 1.9, idMax: 200 },
    // Average run length: easy levels have long same-color runs (easy matches),
    // hard levels have short runs / singletons (must create combos deliberately).
    avgRunLength:         { start: 4.5, end: 1.5, idMax: 200 },
} as const;

export function lerpDifficulty(
    id: number,
    curve: { start: number; end: number; idMax: number },
): number {
    const t = Math.max(0, Math.min(1, (id - 1) / (curve.idMax - 1)));
    return curve.start + (curve.end - curve.start) * t;
}
