import { writeFile, rename, readFile } from 'node:fs/promises';
import { parseLatestShort, shortsUrl } from './youtube-shorts.mjs';
const destination = new URL('../src/data/latest-short.json', import.meta.url);
try {
  const response = await fetch(shortsUrl, { signal: AbortSignal.timeout(15000), headers: { 'Accept-Language': 'en-US,en;q=0.9' } });
  if (!response.ok) throw new Error(`YouTube returned HTTP ${response.status}`);
  const latest = { ...parseLatestShort(await response.text()), checkedAt: new Date().toISOString() };
  const temporary = new URL('../src/data/latest-short.json.tmp', import.meta.url);
  await writeFile(temporary, JSON.stringify(latest, null, 2) + '\n');
  await rename(temporary, destination);
  console.log(`Latest ${latest.channel} Short: ${latest.id} — ${latest.title}`);
} catch (error) {
  if (process.env.CI || process.argv.includes('--strict')) throw error;
  const cached = JSON.parse(await readFile(destination, 'utf8'));
  console.warn(`YouTube refresh failed: ${error.message}. Using last verified Short ${cached.id}, checked ${cached.checkedAt}.`);
}
