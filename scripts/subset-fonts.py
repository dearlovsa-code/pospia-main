"""Make small Pretendard font files that contain only the characters the site actually shows.

Run by scripts/build.mjs after the pages are built (needs: pip install fonttools brotli).
- Reads the built pages (index, company, product, process, notice) and collects every visible character.
- Keeps all of ASCII and common punctuation, so English, numbers and symbols always work.
- Writes assets/fonts/Pretendard-<Weight>.<hash>.woff2 (the hash changes when the characters change,
  so browsers that cached an older file fetch the new one), removes old generated files,
  and points the @font-face rules in assets/css/site.css at the new files.
Source fonts (full 2350-syllable set) live in fonts-src/ and are not published.
A character missing from the small font (for example in a new blog title before the next build)
simply shows in the phone/PC's own Korean font.
"""
import glob
import hashlib
import html.parser
import os
import re
import sys

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = ['index.html', 'company.html', 'product.html', 'process.html', 'notice.html']
WEIGHTS = {'Regular': 400, 'Bold': 700}


class Text(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.chars = set()
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'svg'):
            self.skip += 1
        for k, v in attrs:
            if k in ('placeholder', 'alt', 'aria-label', 'title') and v:
                self.chars.update(v)

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg') and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.chars.update(data)


def main():
    parser = Text()
    for page in PAGES:
        with open(os.path.join(ROOT, page), encoding='utf-8') as f:
            parser.feed(f.read())
    chars = {c for c in parser.chars if not c.isspace()}
    chars.update(chr(c) for c in range(0x20, 0x7F))           # ASCII
    chars.update('–—·…“”‘’「」『』※★☆→←↑↓©®™%')               # common punctuation
    text = ''.join(sorted(chars))

    css_path = os.path.join(ROOT, 'assets', 'css', 'site.css')
    with open(css_path, encoding='utf-8') as f:
        css = f.read()

    keep = set()
    for name in WEIGHTS:
        src = os.path.join(ROOT, 'fonts-src', f'Pretendard-{name}.subset.woff2')
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.hinting = False
        opts.desubroutinize = True
        font = subset.load_font(src, opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        tmp = os.path.join(ROOT, 'assets', 'fonts', f'.tmp-{name}.woff2')
        subset.save_font(font, tmp, opts)
        with open(tmp, 'rb') as f:
            digest = hashlib.sha1(f.read()).hexdigest()[:8]
        out_name = f'Pretendard-{name}.{digest}.woff2'
        os.replace(tmp, os.path.join(ROOT, 'assets', 'fonts', out_name))
        keep.add(out_name)
        css = re.sub(r'url\(\.\./fonts/Pretendard-%s\.[^)]*\)' % name, f'url(../fonts/{out_name})', css)
        print(f'font {out_name}: {os.path.getsize(os.path.join(ROOT, "assets", "fonts", out_name)) // 1024}KB '
              f'(source {os.path.getsize(src) // 1024}KB)')

    for old in glob.glob(os.path.join(ROOT, 'assets', 'fonts', 'Pretendard-*.woff2')):
        if os.path.basename(old) not in keep:
            os.remove(old)

    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(css)
    print(f'{len(text)} characters kept')


if __name__ == '__main__':
    sys.exit(main())
