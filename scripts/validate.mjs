import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const dist = path.join(root, 'dist');
const base = (process.env.BASE_PATH || '').replace(/\/$/, '');
const errors = [];
async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(target)); else result.push(target);
  }
  return result;
}
const html = new Map();
for (const file of await walk(dist)) if (file.endsWith('.html')) html.set(file, await readFile(file, 'utf8'));
for (const [file, content] of html) {
  const label = path.relative(dist, file);
  if ((content.match(/<h1(?:\s|>)/g) || []).length !== 1) errors.push(`${label}: expected one H1`);
  if (!/<title>[^<]+<\/title>/.test(content)) errors.push(`${label}: missing title`);
  const currentPath = '/' + path.relative(dist, file).replaceAll('\\', '/').replace(/index\.html$/, '');
  const refs = [...content.matchAll(/(?:href|src|data-model)="([^"]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (/^(https?:|data:|mailto:|tel:)/.test(ref)) continue;
    const parsed = new URL(ref, `https://local.invalid${base}${currentPath}`);
    let pathname = decodeURIComponent(parsed.pathname);
    if (base && pathname !== base && !pathname.startsWith(base + '/')) { errors.push(`${label}: reference escapes base ${ref}`); continue; }
    pathname = pathname.slice(base.length);
    let target = path.join(dist, pathname);
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
      if (parsed.hash && html.has(target)) {
        const id = decodeURIComponent(parsed.hash.slice(1));
        if (!html.get(target).includes(`id="${id}"`)) errors.push(`${label}: missing fragment ${ref}`);
      }
    } catch { errors.push(`${label}: missing reference ${ref}`); }
  }
}
const readme = await readFile(path.join(root, 'README.md'), 'utf8');
if ((readme.match(/^# /gm) || []).length !== 1) errors.push('README: expected one H1');
if ((readme.match(/^```/gm) || []).length % 2) errors.push('README: unbalanced code fences');
for (const match of readme.matchAll(/\]\(([^)]+)\)/g)) {
  if (/^https?:/.test(match[1])) continue;
  try { await stat(path.resolve(root, decodeURIComponent(match[1].split('#')[0]))); }
  catch { errors.push(`README: missing target ${match[1]}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Passed: ${html.size} pages; internal links, anchors, assets, titles, H1s, and README links.`);
