import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [source, destination, widthArg, qualityArg] = process.argv.slice(2);
if (!source || !destination) {
  console.error('Usage: node scripts/optimize-image.mjs <source> <output.webp> [max-width] [quality]');
  process.exit(1);
}

const width = widthArg ? Number(widthArg) : undefined;
const quality = qualityArg ? Number(qualityArg) : 80;
if ((width !== undefined && (!Number.isInteger(width) || width < 1)) || !Number.isInteger(quality) || quality < 1 || quality > 100) {
  throw new Error('Width must be a positive integer and quality must be 1–100.');
}

const image = sharp(source).rotate();
if (width) image.resize({ width, withoutEnlargement: true });
await fs.mkdir(path.dirname(destination), { recursive: true });
await image.webp({ quality, effort: 6 }).toFile(destination);
const original = await fs.stat(source);
const optimized = await fs.stat(destination);
console.log(`${original.size} -> ${optimized.size} bytes (${destination})`);
