import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const source = process.argv[2];
if (!source) throw new Error('Pass the path to the supplied screenshots directory.');
await mkdir('public/images', { recursive: true });
const files = {
  'de-castle': 'DE/2026-09-26_12.49.26.png',
  'de-courtyard': 'DE/2026-09-26_12.49.46.png',
  'de-undercroft': 'DE/2026-09-26_12.49.37.png',
  'de-sign': 'DE/2026-09-26_12.49.00.png',
  'nacht-exterior': 'Nacht/2026-09-26_12.47.55.png',
  'nacht-interior': 'Nacht/2026-09-26_12.48.24.png',
  'nacht-lobby': 'Nacht/2026-09-26_12.46.52.png',
};
for (const [name, input] of Object.entries(files)) {
  for (const width of [800, 1600, 2400]) {
    await sharp(path.join(source, input)).resize({ width, withoutEnlargement: true }).webp({ quality: 84 }).toFile(`public/images/${name}-${width}.webp`);
  }
}
console.log('Prepared responsive WebP copies of all seven supplied screenshots.');
