// Refreshes the home page "Cases" cards from the POSPIA blog's 설치사례 category.
// Takes the newest posts, downloads their thumbnails into assets/news/,
// rewrites the block between NEWS:START and NEWS:END in src/pages/index.html,
// removes thumbnails no longer used, then rebuilds the pages and preview files.
// Needs Node 20+ (built-in fetch) and sharp (npm install) to make small WebP thumbnails.
import { readFile, writeFile, readdir, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLOG = 'pos-pia';
const CATEGORY = 1;        // 포스피아 설치사례
const COUNT = 8;
const PAGE = path.join(ROOT, 'src', 'pages', 'index.html');   // the home page source; build.mjs makes index.html
const NEWS_DIR = path.join(ROOT, 'assets', 'news');
const HEADERS = { 'Referer': `https://m.blog.naver.com/${BLOG}`, 'User-Agent': 'Mozilla/5.0 (pospia-site-updater)' };

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cleanTitle = t => t.replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\s+/g, ' ').trim();
const kstDate = ms => new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).replace(/-/g, '.');

async function getJSON(url) {
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function main() {
  const data = await getJSON(`https://m.blog.naver.com/api/blogs/${BLOG}/post-list?categoryNo=${CATEGORY}&itemCount=${COUNT}&page=1`);
  const items = (data.result ?? data).items ?? [];
  if (items.length < 1) throw new Error('no posts returned; leaving the page unchanged');
  const posts = items.slice(0, COUNT);

  await mkdir(NEWS_DIR, { recursive: true });
  const keep = new Set();
  const cards = [];
  for (const [k, it] of posts.entries()) {
    const no = String(it.logNo);
    let file = existsSync(path.join(NEWS_DIR, `${no}.webp`)) ? `${no}.webp` : null;
    if (!file && it.thumbnailUrl) {
      const r = await fetch(it.thumbnailUrl.split('?')[0] + '?type=w800', { headers: HEADERS });
      if (r.ok) {
        // every thumbnail is stored as a 640px WebP (blog PNGs are ~850KB each)
        const buf = Buffer.from(await r.arrayBuffer());
        file = `${no}.webp`;
        await writeFile(path.join(NEWS_DIR, file), await sharp(buf).resize(640, 640, { fit: 'cover' }).flatten({ background: '#ffffff' }).webp({ quality: 80, effort: 6 }).toBuffer());
      }
    }
    if (file) keep.add(file);
    const delay = k % 4 ? ` style="--dl:.${k % 4}s"` : '';
    const img = file ? `<img src="assets/news/${file}" alt="" width="640" height="640" loading="lazy">` : '';
    cards.push(`      <li class="ncard" data-up${delay}><a href="https://blog.naver.com/${BLOG}/${no}"><div class="ph">${img}</div><div class="tx"><p class="tit">${esc(cleanTitle(it.titleWithInspectMessage || it.title || ''))}</p><span class="date">${kstDate(it.addDate)}</span></div></a></li>`);
  }

  const html = await readFile(PAGE, 'utf8');
  const re = /(<!-- NEWS:START[^>]*-->\n)[\s\S]*?(\s*<!-- NEWS:END -->)/;
  if (!re.test(html)) throw new Error('NEWS markers not found in index.html');
  const next = html.replace(re, (_, a, b) => a + cards.join('\n') + b);
  const changed = next !== html;
  if (changed) await writeFile(PAGE, next);

  for (const f of await readdir(NEWS_DIR)) if (!keep.has(f)) await unlink(path.join(NEWS_DIR, f));

  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.mjs')], { stdio: 'inherit' });
  console.log(changed ? `updated: ${posts.length} posts` : 'no change in posts');
}

main().catch(e => { console.error(e.message); process.exit(1); });
