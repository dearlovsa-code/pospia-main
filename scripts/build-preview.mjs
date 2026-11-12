// Builds 미리보기/*.html: each page with its fonts, pictures, styles and scripts embedded, so a page
// opens correctly on its own (download and double-click). Links between pages point at the other
// preview files, so keep all five files in one folder. Needs Node 18+. No packages.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '미리보기');
const PAGES = { index: '1-홈', company: '2-회사소개', product: '3-제품소개', process: '4-가입절차', notice: '5-공지사항' };
const TYPES = { woff2: 'font/woff2', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const cache = new Map();
const dataUri = async rel => {
  if (!cache.has(rel)) cache.set(rel, `data:${TYPES[rel.split('.').pop()]};base64,${(await readFile(path.join(ROOT, rel))).toString('base64')}`);
  return cache.get(rel);
};
async function replaceAsync(str, re, fn) {
  const parts = []; let last = 0;
  for (const m of str.matchAll(re)) { parts.push(str.slice(last, m.index), await fn(...m)); last = m.index + m[0].length; }
  return parts.join('') + str.slice(last);
}
let css = await readFile(path.join(ROOT, 'assets/css/site.css'), 'utf8');
css = await replaceAsync(css, /url\(\.\.\/(fonts\/[^)]+)\)/g, async (_, p) => `url(${await dataUri('assets/' + p)})`);
const lenis = (await readFile(path.join(ROOT, 'assets/js/lenis.min.js'), 'utf8')).replace(/\/\/# sourceMappingURL=\S+/, '');
const site = await readFile(path.join(ROOT, 'assets/js/site.js'), 'utf8');

await mkdir(OUT, { recursive: true });
for (const [page, name] of Object.entries(PAGES)) {
  let s = await readFile(path.join(ROOT, page + '.html'), 'utf8');
  s = s.replace(/<link rel="preload"[^>]*>\n/g, '');
  s = s.replace('<link rel="stylesheet" href="assets/css/site.css">', () => `<style>${css}</style>`);
  s = await replaceAsync(s, /(src|href|content)="(assets\/[^"]+\.(?:jpg|png|webp))"/g, async (_, a, p) => `${a}="${await dataUri(p)}"`);
  s = s.replace('<script src="assets/js/lenis.min.js"></script>', () => `<script>${lenis}</script>`);
  s = s.replace('<script src="assets/js/site.js"></script>', () => `<script>${site}</script>`);
  s = s.replaceAll(' loading="lazy"', '');
  for (const [p, n] of Object.entries(PAGES)) s = s.replace(new RegExp(`href="${p}\\.html`, 'g'), `href="${n}.html`);
  if (/(src|href)="assets\//.test(s)) throw new Error(page + ': preview still points at assets/: ' + s.match(/(src|href)="assets\/[^"]+/)[0]);
  await writeFile(path.join(OUT, name + '.html'), s);
}
console.log('preview rebuilt: 미리보기/');
