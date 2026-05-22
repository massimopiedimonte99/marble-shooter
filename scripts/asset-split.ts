#!/usr/bin/env tsx
/**
 * asset-split — slice a grid sprite sheet into individual normalised PNGs.
 *
 * Usage:
 *   pnpm asset:split <input.png> <COLSxROWS> <name1,name2,...> [--size=128] [--padding=14] [--outDir=public/assets]
 *
 * Each output tile is: trim alpha → resize to (size-2*padding) inside → extend with padding → size×size PNG.
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

function parseArgs(argv: string[]): {
  input: string;
  cols: number;
  rows: number;
  names: string[];
  size: number;
  padding: number;
  outDir: string;
} {
  const positional = argv.filter(a => !a.startsWith('--'));
  const flags = Object.fromEntries(
    argv
      .filter(a => a.startsWith('--'))
      .map(a => a.slice(2).split('=') as [string, string])
  );

  if (positional.length < 3) {
    console.error('Usage: pnpm asset:split <input.png> <COLSxROWS> <name1,name2,...> [--size=128] [--padding=14] [--outDir=public/assets]');
    process.exit(1);
  }

  const [input, grid, nameList] = positional;
  const match = grid.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    console.error(`Error: grid format must be COLSxROWS (e.g. 2x2), got "${grid}"`);
    process.exit(1);
  }

  return {
    input,
    cols: parseInt(match[1], 10),
    rows: parseInt(match[2], 10),
    names: nameList.split(',').map(n => n.trim()).filter(Boolean),
    size:    parseInt(flags['size']    ?? '128', 10),
    padding: parseInt(flags['padding'] ?? '14',  10),
    outDir:  flags['outDir'] ?? 'public/assets',
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { input, cols, rows, names, size, padding, outDir } = args;

  if (!fs.existsSync(input)) {
    console.error(`Error: input file not found: "${input}"`);
    process.exit(1);
  }

  const totalTiles = cols * rows;
  if (names.length !== totalTiles) {
    console.error(`Error: expected ${totalTiles} names for a ${cols}×${rows} grid, got ${names.length}: [${names.join(', ')}]`);
    process.exit(1);
  }

  const meta = await sharp(input).metadata();
  const imgW = meta.width!;
  const imgH = meta.height!;
  const tileW = Math.floor(imgW / cols);
  const tileH = Math.floor(imgH / rows);

  fs.mkdirSync(outDir, { recursive: true });

  const inner = size - 2 * padding;
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

  for (let i = 0; i < totalTiles; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const outPath = path.join(outDir, `${names[i]}.png`);

    await sharp(input)
      .extract({ left: col * tileW, top: row * tileH, width: tileW, height: tileH })
      .trim({ background: transparent, threshold: 10 })
      .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
      .extend({ top: padding, bottom: padding, left: padding, right: padding, background: transparent })
      .png()
      .toFile(outPath);

    console.log(`✓ ${outPath}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
