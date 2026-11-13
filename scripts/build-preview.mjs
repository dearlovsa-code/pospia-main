// Builds 미리보기-전체.html: all five pages with fonts, pictures, styles and scripts embedded in ONE file,
// so it opens correctly on its own (download and open, PC or phone). Menu links switch pages inside it.
// Needs Node 18+. No packages.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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



// ---- 미리보기-전체.html: all five pages in ONE file (easier to download on a phone) ----
// Pictures, fonts and scripts are stored once; the chosen page is shown in a full-screen frame,
// and menu links between pages switch the frame instead of opening another file.
{
  const assets = []; const idx = new Map();
  const tok = v => { if (!idx.has(v)) { idx.set(v, assets.length); assets.push(v); } return `@@${idx.get(v)}@@`; };
  const cssTok = css.replace(/url\((data:[^)]+)\)/g, (_, d) => `url(${tok(d)})`);
  const pages = {};
  for (const page of Object.keys(PAGES)) {
    let s = await readFile(path.join(ROOT, page + '.html'), 'utf8');
    s = s.replace(/(assets\/[^"?]+)\?v=[0-9a-f]+/g, '$1');
    s = s.replace(/<link rel="preload"[^>]*>\n/g, '');
    s = s.replace('<link rel="stylesheet" href="assets/css/site.css">', () => `<style>${tok(cssTok)}</style>`);
    s = await replaceAsync(s, /(src|href|content)="(assets\/[^"]+\.(?:jpg|png|webp))"/g, async (_, a, p) => `${a}="${tok(await dataUri(p))}"`);
    s = s.replace('<script src="assets/js/lenis.min.js"></script>', () => `<script>${tok(lenis)}</script>`);
    s = s.replace('<script src="assets/js/site.js"></script>', () => `<script>${tok(site)}</script>`);
    s = s.replaceAll(' loading="lazy"', '');
    if (/(src|href)="assets\//.test(s)) throw new Error(page + ': all-in-one preview still points at assets/');
    pages[page] = s;
  }
  const json = JSON.stringify({ assets, pages }).replace(/<\//g, '<\\/');
  const shell = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>포스피아 메인 사이트 미리보기</title>
<style>html,body{margin:0;height:100%;background:#1c1b19}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}</style>
</head><body>
<iframe id="v" title="포스피아 미리보기"></iframe>
<script id="data" type="application/json">${json}</script>
<script>
(() => {
  const D = JSON.parse(document.getElementById('data').textContent), v = document.getElementById('v');
  const fill = t => t.replace(/@@(\\d+)@@/g, (_, i) => D.assets[+i]);
  const html = name => fill(fill(D.pages[name])); // twice: the stylesheet itself holds the font tokens
  const go = (name, hash) => {
    v.onload = () => {
      const d = v.contentDocument; if (!d) return;
      try { v.contentWindow.scrollTo(0, 0); } catch (e) {}
      if (hash) setTimeout(() => { const t = d.getElementById(hash); if (t) t.scrollIntoView(); }, 300);
      d.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
        const m = a.getAttribute('href').match(/^(index|company|product|process|notice)\\.html(?:#(.*))?$/);
        if (m) { e.preventDefault(); go(m[1], m[2] || ''); }
        else if (/^https?:|^mailto:|^tel:/.test(a.getAttribute('href'))) { e.preventDefault(); window.open(a.href, a.target === '_blank' ? '_blank' : '_top'); }
      });
    };
    v.srcdoc = html(name);
    document.title = (D.pages[name].match(/<title>([^<]*)/) || [, ''])[1] + ' (미리보기)';
  };
  go('index', '');
})();
</script>
</body></html>
`;
  await writeFile(path.join(ROOT, '미리보기-전체.html'), shell);
  console.log('preview rebuilt: 미리보기-전체.html', (shell.length / 1048576).toFixed(1) + 'MB');
}
