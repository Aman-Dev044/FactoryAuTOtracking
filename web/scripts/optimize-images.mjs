/**
 * One-off asset compression.
 *
 * Static export ships images at the size they are authored, so they are
 * squeezed here instead of by an image server. Source files live in the CRA
 * app's public folder; the compressed results land in this project's public
 * folder and are what the pages actually reference.
 *
 *   npm run optimize-images
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('../frontend/public');
const OUT = path.resolve('public');

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

/** width: null keeps the intrinsic size. */
const JOBS = [
  { in: 'logo.png', out: 'logo.png', width: 360, formats: ['png', 'webp'] },
  { in: 'logo512.png', out: 'logo-mark.png', width: 512, formats: ['png'] },
  { in: 'logo192.png', out: 'apple-touch-icon.png', width: 180, formats: ['png'] },
];

await mkdir(OUT, { recursive: true });

for (const job of JOBS) {
  const srcPath = path.join(SRC, job.in);
  let input;
  try {
    input = await readFile(srcPath);
  } catch {
    console.warn(`skipped ${job.in} — not found at ${srcPath}`);
    continue;
  }

  const before = input.length;

  for (const format of job.formats) {
    const ext = format === 'webp' ? '.webp' : path.extname(job.out);
    const name = job.out.replace(/\.[^.]+$/, '') + ext;
    const pipeline = sharp(input).resize({
      width: job.width,
      withoutEnlargement: true,
      fit: 'inside',
    });

    const buf =
      format === 'webp'
        ? await pipeline.webp({ quality: 86, effort: 6 }).toBuffer()
        : await pipeline.png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();

    await writeFile(path.join(OUT, name), buf);
    console.log(`${job.in} (${kb(before)})  ->  ${name} (${kb(buf.length)})`);
  }
}

// The favicon is already small enough; copy it across untouched.
try {
  const ico = await readFile(path.join(SRC, 'favicon.ico'));
  await writeFile(path.join(OUT, 'favicon.ico'), ico);
  const s = await stat(path.join(OUT, 'favicon.ico'));
  console.log(`favicon.ico copied (${kb(s.size)})`);
} catch {
  console.warn('skipped favicon.ico — not found');
}
