// Builds the published pages: src/pages/*.html + shared header/footer/icons -> *.html in the repository root.
// Each page starts with a comment:  <!-- title: ... | desc: ... | nav: company -->
// After editing anything in src/, run:  node scripts/build.mjs   (it also rebuilds the preview files)
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const part = async n => (await readFile(path.join(ROOT, 'src/partials', n + '.html'), 'utf8')).trim();
const [icons, header, footer] = await Promise.all(['icons', 'header', 'footer'].map(part));

for (const file of (await readdir(path.join(ROOT, 'src/pages'))).filter(f => f.endsWith('.html'))) {
  let src = await readFile(path.join(ROOT, 'src/pages', file), 'utf8');
  const m = src.match(/^<!--([\s\S]*?)-->\n?/);
  if (!m) throw new Error(file + ': missing <!-- title: ... --> line');
  const meta = Object.fromEntries(m[1].split('|').map(s => s.trim().split(/:\s*/)).map(([k, ...v]) => [k, v.join(':').trim()]));
  src = src.slice(m[0].length);
  const hdr = header.replace(new RegExp(`<li data-nav="${meta.nav}">`), `<li data-nav="${meta.nav}" class="cur">`);
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
<meta property="og:image" content="assets/img/prod-lineup.webp">
<meta name="theme-color" content="#1c1b19">
<link rel="icon" href="assets/logo/pospia-mark-navy.png">
<link rel="preload" href="assets/fonts/Pretendard-Regular.subset.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/Italiana-Regular.latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
</head>
<body class="page-${path.basename(file, '.html')}">
${icons}
${hdr}
<main id="main">
${src.trim()}
</main>
${footer}
</body>
</html>
`;
  await writeFile(path.join(ROOT, file), html);
  console.log('built', file);
}
if (!process.argv.includes('--no-preview')) execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-preview.mjs')], { stdio: 'inherit' });
