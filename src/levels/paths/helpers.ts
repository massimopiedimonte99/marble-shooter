export function corner(
    path: Phaser.Curves.Path,
    ex: number, ey: number,
    c1x: number, c1y: number,
    c2x: number, c2y: number,
): void {
    path.cubicBezierTo(ex, ey, c1x, c1y, c2x, c2y);
}
