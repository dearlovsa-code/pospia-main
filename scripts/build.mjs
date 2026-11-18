// Builds the published pages: src/pages/*.html + shared header/footer/icons -> *.html in the repository root.
// Each page starts with a comment:  <!-- title: ... | desc: ... | nav: company -->
// After editing anything in src/, run:  node scripts/build.mjs   (it also rebuilds the preview files)
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const part = async n => (await readFile(path.join(ROOT, 'src/partials', n + '.html'), 'utf8')).trim();
const [icons, header, footer, lpHeader, lpFooter] = await Promise.all(['icons', 'header', 'footer', 'header-landing', 'footer-landing'].map(part));
const built = [];

// ---- search engines ----
// The address search engines should show (택스리펀드.kr written the way browsers send it). Every page points here
// with <link rel="canonical">, so the workers.dev copy is not counted as a second site.
const SITE_URL = 'https://xn--hy1b74g1qjdlpr8c.kr';
// Ownership codes from Naver Search Advisor / Google Search Console (the content="…" part of their meta tag).
// Leave empty until the user sends them; the tag is only written when a code is set.
const VERIFY = { naver: '', google: '' };
const urlFor = file => SITE_URL + (file === 'index.html' ? '/' : '/' + path.basename(file, '.html'));
const ORG_JSONLD = {
  '@context': 'https://schema.org', '@type': 'LocalBusiness', name: '포스피아', alternateName: 'POSPIA', legalName: '(주)포스피아',
  url: SITE_URL + '/', logo: SITE_URL + '/assets/logo/pospia-mark-navy.png', image: SITE_URL + '/assets/img/prod-lineup.webp',
  description: '포스 · 키오스크 · 테이블오더 · 카드단말기 · 인터넷 · CCTV · 택스리펀드 설치와 관리. 상담부터 설치 · A/S까지 한 곳에서.',
  telephone: '+82-1577-7107', email: 'pos-pia@naver.com', faxNumber: '+82-31-525-5202',
  address: { '@type': 'PostalAddress', streetAddress: '강남로 7, 아트프라자 901호', addressLocality: '용인시 기흥구', addressRegion: '경기도', postalCode: '16977', addressCountry: 'KR' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:30', closes: '18:30' }],
  sameAs: ['https://blog.naver.com/pos-pia', 'http://pf.kakao.com/_KFGBn', 'https://taxrefund.pos-pia.workers.dev/'],
};

for (const file of (await readdir(path.join(ROOT, 'src/pages'))).filter(f => f.endsWith('.html'))) {
  let src = await readFile(path.join(ROOT, 'src/pages', file), 'utf8');
  const m = src.match(/^<!--([\s\S]*?)-->\n?/);
  if (!m) throw new Error(file + ': missing <!-- title: ... --> line');
  const meta = Object.fromEntries(m[1].split('|').map(s => s.trim().split(/:\s*/)).map(([k, ...v]) => [k, v.join(':').trim()]));
  src = src.slice(m[0].length);
  const landing = meta.layout === 'landing'; // ad landing pages: logo + one consult button, no menu, slim footer
  const hdr = landing ? lpHeader : header.replace(new RegExp(`<li data-nav="${meta.nav}">`), `<li data-nav="${meta.nav}" class="cur">`);
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title}</title>
<meta name="description" content="${meta.desc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.desc}">
<link rel="canonical" href="${urlFor(file)}">
<meta property="og:url" content="${urlFor(file)}">
<meta property="og:site_name" content="포스피아 POSPIA">
<meta property="og:image" content="${SITE_URL}/assets/img/prod-lineup.webp">${VERIFY.naver ? `
<meta name="naver-site-verification" content="${VERIFY.naver}">` : ''}${VERIFY.google ? `
<meta name="google-site-verification" content="${VERIFY.google}">` : ''}${file === 'index.html' ? `
<script type="application/ld+json">${JSON.stringify(ORG_JSONLD)}</script>` : ''}
<meta name="theme-color" content="#1c1b19">
<link rel="icon" href="assets/logo/pospia-mark-navy.png">
<link rel="preload" href="assets/fonts/@@FONT_REGULAR@@" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/Italiana-Regular.latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body class="page-${path.basename(file, '.html')}${landing ? ' lp' : ''}">
${icons}
${hdr}
<main id="main">
${src.trim()}
</main>
${landing ? lpFooter : footer}
</body>
</html>
`;
  built.push([file, html]);
  console.log('built', file);
}

// 1) write the pages, 2) make small fonts with only the characters these pages use (scripts/subset-fonts.py),
// 3) stamp every picture/style/script link with ?v=<content hash>: browsers may keep these files for a year
//    (see _headers) and still fetch the new copy the moment a file changes. Fonts are not stamped (their
//    file names already carry a hash) and must use the same address as site.css, or they download twice.
for (const [file, html] of built) await writeFile(path.join(ROOT, file), html.replace('@@FONT_REGULAR@@', 'Pretendard-Regular.subset.woff2'));
{ // sitemap.xml + robots.txt (both public: they are not in .assetsignore)
  const day = new Date().toISOString().slice(0, 10);
  const order = ['index.html', 'company.html', 'product.html', 'process.html', 'notice.html', 'open.html', 'promo.html'];
  const files = built.map(([f]) => f).sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    files.map(f => `  <url><loc>${urlFor(f)}</loc><lastmod>${day}</lastmod><priority>${f === 'index.html' ? '1.0' : '0.8'}</priority></url>`).join('\n') + '\n</urlset>\n';
  await writeFile(path.join(ROOT, 'sitemap.xml'), xml);
  await writeFile(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  console.log('sitemap.xml, robots.txt written');
}
execFileSync('python3', ['-I', path.join(ROOT, 'scripts', 'subset-fonts.py')], { stdio: 'inherit' });
const css = await readFile(path.join(ROOT, 'assets/css/site.css'), 'utf8');
const regular = css.match(/fonts\/(Pretendard-Regular\.[^)]+\.woff2)/)[1];
for (const [file, html0] of built) {
  const html = html0.replace('@@FONT_REGULAR@@', regular);
  const parts = []; let last = 0;
  for (const m of html.matchAll(/(src|href|content)="(assets\/[^"?]+)"/g)) {
    if (m[2].startsWith('assets/fonts/')) continue;
    const buf = await readFile(path.join(ROOT, m[2]));
    parts.push(html.slice(last, m.index), `${m[1]}="${m[2]}?v=${createHash('sha1').update(buf).digest('hex').slice(0, 8)}"`);
    last = m.index + m[0].length;
  }
  await writeFile(path.join(ROOT, file), parts.join('') + html.slice(last));
}
if (!process.argv.includes('--no-preview')) execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-preview.mjs')], { stdio: 'inherit' });
