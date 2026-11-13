// POSPIA main site behaviour (shared by every page). No libraries except Lenis (smooth scroll).
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  // ---- smooth scrolling ----
  // If the smooth scroller cannot run here (no animation frames, an embedded viewer, an error),
  // it switches itself off and the page falls back to the browser's own scrolling. Keep this safety net.
  let lenis = null;
  if (!reduce && window.Lenis) {
    try {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
      let frames = 0;
      const off = () => { if (lenis) { try { lenis.destroy(); } catch (e) {} lenis = null; root.classList.remove('lenis', 'lenis-smooth'); } };
      const raf = t => { if (!lenis) return; frames++; try { lenis.raf(t); } catch (e) { off(); return; } requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      setTimeout(() => { if (frames === 0) off(); }, 700);
      addEventListener('wheel', () => {
        const y0 = scrollY, f0 = frames;
        setTimeout(() => { if (lenis && (frames - f0 < 3 || (scrollY === y0 && root.scrollHeight > innerHeight + 10 && y0 < root.scrollHeight - innerHeight - 5))) off(); }, 450);
      }, { once: true, passive: true });
    } catch (e) { lenis = null; }
  }
  const hdr = $('#hdr');
  const offset = () => (hdr ? hdr.offsetHeight : 0) + ($('.subtabs') ? $('.subtabs').offsetHeight : 0) + 8;
  const go = target => {
    if (target === 0) { lenis ? lenis.scrollTo(0, { duration: 1.4 }) : scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    const y = target.getBoundingClientRect().top + scrollY - offset();
    lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const t = id === '#top' ? 0 : document.getElementById(id.slice(1));
    if (t !== null) { e.preventDefault(); closeMenu(); go(t); }
  }));
  if (location.hash.length > 1) addEventListener('load', () => { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => go(t), 200); });

  // ---- header: transparent over the dark top, solid after scrolling; hides while scrolling down ----
  const totop = $('#totop'), kakao = $('#kakao');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, d = y - lastY; lastY = y;
    const solid = y > 40;
    hdr.classList.toggle('solid', solid && !hdr.classList.contains('open'));
    document.body.classList.toggle('has-solid', solid);
    const away = y > 480 && d > 4 && !hdr.classList.contains('open');
    if (away) hdr.classList.add('away'); else if (d < -4 || y < 480) hdr.classList.remove('away');
    document.body.classList.toggle('hdr-away', hdr.classList.contains('away'));
    const show = y > innerHeight * .8;
    totop && totop.classList.toggle('show', show);
    kakao && kakao.classList.toggle('lift', show);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  totop && totop.addEventListener('click', () => go(0));

  // ---- mobile menu ----
  const mbtn = $('#menu-btn'), mnav = $('#mnav');
  function closeMenu() {
    if (!mnav || !mnav.classList.contains('open')) return;
    mnav.classList.remove('open'); hdr.classList.remove('open'); mbtn.setAttribute('aria-expanded', 'false'); mnav.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; lenis && lenis.start(); onScroll();
  }
  mbtn && mbtn.addEventListener('click', () => {
    if (mnav.classList.contains('open')) { closeMenu(); return; }
    mnav.classList.add('open'); hdr.classList.add('open'); hdr.classList.remove('solid', 'away'); mbtn.setAttribute('aria-expanded', 'true'); mnav.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; lenis && lenis.stop();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  matchMedia('(min-width: 1101px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

  // ---- split headings into words for a staggered rise ----
  $$('.split').forEach(el => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3 && n.textContent.trim()) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { frag.append(p); return; } const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.append(s); });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
    $$('.w', el).forEach((w, i) => { w.style.transitionDelay = (parseFloat(el.dataset.dl || 0) + i * .06) + 's'; });
  });

  // ---- reveal on scroll, but only once the pictures inside are ready ----
  // (on a slow connection the animation used to play before the photo had arrived)
  const ready = img => img.complete && img.naturalWidth ? Promise.resolve() : new Promise(done => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); });
  const waitFor = el => {
    const imgs = [...el.querySelectorAll('img')];
    if (!imgs.length) return Promise.resolve();
    imgs.forEach(i => { i.loading = 'eager'; });
    return Promise.race([Promise.all(imgs.map(ready)), new Promise(done => setTimeout(done, 1200))]); // never wait more than 1.2s
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    waitFor(e.target).then(() => requestAnimationFrame(() => e.target.classList.add('in')));
    setTimeout(() => e.target.classList.add('in'), 1300); // in case animation frames are paused
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('[data-up], [data-clip], .split, [data-line]').forEach(el => io.observe(el));
  // start downloading pictures a little before they scroll into view
  const pre = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.loading = 'eager'; pre.unobserve(e.target); } }), { rootMargin: '800px 0px 800px 0px' });
  $$('img[loading="lazy"]').forEach(i => pre.observe(i));
  // big background photos fade and zoom in only after they have loaded
  $$('.subhero .bg img, .hero .slide img').forEach(img => {
    const mark = () => img.classList.add('ld');
    if (img.complete && img.naturalWidth) mark(); else { img.addEventListener('load', mark, { once: true }); img.addEventListener('error', mark, { once: true }); }
  });

  // ---- count-up numbers ----
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, dur = reduce ? 0 : 1600, t0 = performance.now();
    const fmt = n => n.toLocaleString('ko-KR');
    if (!dur) { el.textContent = fmt(end); return; }
    const step = t => { const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 4))); el.textContent = fmt(v); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    setTimeout(() => { el.textContent = fmt(end); }, dur + 200); // in case animation frames are paused
  }), { threshold: .4 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // ---- home hero slider ----
  const hero = $('#hero');
  if (hero) {
    const slides = $$('.slide', hero), bar = $('.bar i', hero), num = $('.num b', hero), pbtn = $('.pause', hero);
    const DUR = 6000; let i = 0, t0 = performance.now(), paused = reduce, elapsed = 0;
    const show = n => {
      slides[i].classList.remove('on'); i = (n + slides.length) % slides.length; slides[i].classList.add('on');
      num.textContent = String(i + 1).padStart(2, '0'); t0 = performance.now(); elapsed = 0;
    };
    const tick = () => {
      if (!paused) { elapsed = performance.now() - t0; if (elapsed >= DUR) show(i + 1); }
      bar.style.transform = `scaleX(${Math.min(1, elapsed / DUR)})`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setInterval(() => { if (!paused && performance.now() - t0 > DUR + 1500) show(i + 1); }, 1000); // keeps going without animation frames
    $('.prev', hero).addEventListener('click', () => show(i - 1));
    $('.next', hero).addEventListener('click', () => show(i + 1));
    const setPaused = p => { paused = p; pbtn.setAttribute('aria-pressed', String(p)); pbtn.setAttribute('aria-label', p ? '슬라이드 재생' : '슬라이드 멈춤'); if (!p) t0 = performance.now() - elapsed; };
    pbtn.addEventListener('click', () => setPaused(!paused));
    if (reduce) setPaused(true);
  }

  // ---- sideways rails with arrow buttons ----
  $$('[data-rail]').forEach(box => {
    const rail = $('.rail', box), prev = $('.rprev', box), next = $('.rnext', box), prog = $('.rprog i', box);
    const upd = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      if (prev) prev.disabled = rail.scrollLeft < 4;
      if (next) next.disabled = rail.scrollLeft > max - 4;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? (rail.scrollLeft + rail.clientWidth) / rail.scrollWidth : 1})`;
    };
    const by = dir => { const card = rail.firstElementChild; const w = card ? card.getBoundingClientRect().width + 24 : rail.clientWidth * .8; rail.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' }); };
    prev && prev.addEventListener('click', () => by(-1)); next && next.addEventListener('click', () => by(1));
    rail.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  });

  // ---- sub page tabs follow the section in view ----
  const tabs = $$('.subtabs a[href^="#"]');
  if (tabs.length) {
    const secs = tabs.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const spy = () => {
      const line = offset() + innerHeight * .2; let cur = secs[0];
      secs.forEach(s => { if (s.getBoundingClientRect().top <= line) cur = s; });
      tabs.forEach(a => {
        const on = a.getAttribute('href') === '#' + cur.id; a.classList.toggle('cur', on);
        if (on && a.dataset.on !== '1') { a.dataset.on = '1'; const ul = a.closest('ul'); ul.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' }); } else if (!on) a.dataset.on = '';
      });
    };
    addEventListener('scroll', spy, { passive: true }); spy();
  }

  // ---- history timeline: the line fills as you scroll ----
  const tl = $('.timeline');
  if (tl) {
    const fill = () => { const r = tl.getBoundingClientRect(), mid = innerHeight * .6; tl.style.setProperty('--p', Math.max(0, Math.min(1, (mid - r.top) / r.height)).toFixed(3)); };
    addEventListener('scroll', fill, { passive: true }); addEventListener('resize', fill); fill();
    const yio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('lit', e.boundingClientRect.top < innerHeight * .6 || e.isIntersecting)), { rootMargin: '0px 0px -40% 0px' });
    $$('.timeline li').forEach(li => yio.observe(li));
  }

  // ---- notice page: search and open/close ----
  const nsearch = $('#nsearch');
  if (nsearch) {
    const rows = $$('.nlist .nrow'), total = $('#ntotal'), empty = $('#nempty');
    const run = () => {
      const q = nsearch.value.trim().toLowerCase(); let n = 0;
      rows.forEach(r => { const hit = !q || r.textContent.toLowerCase().includes(q); r.hidden = !hit; if (hit) n++; });
      total.textContent = n; empty.hidden = n > 0;
    };
    nsearch.addEventListener('input', run);
    $('#nform').addEventListener('submit', e => { e.preventDefault(); run(); });
  }
  $$('.nrow > button').forEach(b => b.addEventListener('click', () => {
    const row = b.parentElement, body = $('.nbody', row), open = !row.classList.contains('open');
    row.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    if (reduce) { body.hidden = !open; return; }
    if (open) { body.hidden = false; body.animate([{ height: '0px', opacity: 0 }, { height: body.scrollHeight + 'px', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' }); }
    else { const a = body.animate([{ height: body.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 350, easing: 'cubic-bezier(.16,1,.3,1)' }); a.onfinish = () => { body.hidden = true; }; }
  }));

  // ---- current year in the footer ----
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
