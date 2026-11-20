// POSPIA main site behaviour (shared by every page). No libraries except Lenis (smooth scroll).
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;

  // ---- where did this visitor come from? (sent with every form so the sheet shows which ad / QR / search worked) ----
  // Tag links like  ...?from=qr  or  ...?utm_source=naver&utm_campaign=promo . Without a tag we read the page they came from.
  // The last known source is kept for 30 days in this browser, so it survives moving between pages.
  const SOURCE = (() => {
    const KEY = 'pospia-src', DAY = 864e5;
    const fromUrl = () => {
      const q = new URLSearchParams(location.search);
      const v = (q.get('from') || q.get('utm_source') || '').trim();
      if (v) return (v + (q.get('utm_campaign') ? ' / ' + q.get('utm_campaign') : '')).slice(0, 80);
      let h = '';
      try { h = new URL(document.referrer).hostname; } catch (_) { return ''; }
      if (!h || h === location.hostname) return '';
      const known = [[/search\.naver\.com$/, '네이버 검색'], [/blog\.naver\.com$/, '네이버 블로그'], [/(^|\.)naver\.com$/, '네이버'],
        [/google\./, '구글 검색'], [/daum\.net$/, '다음'], [/instagram\.com$/, '인스타그램'], [/facebook\.com$/, '페이스북'],
        [/kakao/, '카카오'], [/youtube\.com$/, '유튜브'], [/pos-pia\.workers\.dev$/, '포스피아 사이트']];
      const hit = known.find(([re]) => re.test(h));
      return hit ? hit[1] : h;
    };
    let v = fromUrl();
    try {
      if (v) localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() }));
      else { const old = JSON.parse(localStorage.getItem(KEY) || 'null'); if (old && Date.now() - old.t < 30 * DAY) v = old.v; }
    } catch (_) {}
    return v || '직접 방문';
  })();

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
    if (hdr) {
    hdr.classList.toggle('solid', solid && !hdr.classList.contains('open'));
    document.body.classList.toggle('has-solid', solid);
    const away = y > 480 && d > 4 && !hdr.classList.contains('open');
    if (away) hdr.classList.add('away'); else if (d < -4 || y < 480) hdr.classList.remove('away');
    document.body.classList.toggle('hdr-away', hdr.classList.contains('away'));
    }
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
  // keep each number's box at its final width so the words after it don't jiggle while it counts up
  $$('[data-count]').forEach(el => {
    el.textContent = (+el.dataset.count).toLocaleString('ko-KR');
    el.style.display = 'inline-block'; el.style.fontVariantNumeric = 'tabular-nums'; el.style.textAlign = 'right';
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    cio.observe(el);
  });

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

  // ---- home: free estimate form -> Google Form (answers go to the linked Google Sheet) ----
  const est = $('#est-form');
  if (est) {
    const err = $('.ferr', est), btn = $('.submit', est), done = $('.fdone', est);
    // device cards are checkboxes: at least one must be ticked
    const needOne = $$('[data-need-one]', est);
    const checkOne = () => needOne.forEach(g => {
      const c = $$('input[type=checkbox]', g), ok = c.some(i => i.checked);
      c.forEach(i => i.setCustomValidity(''));
      if (!ok && c[0]) c[0].setCustomValidity('희망 기기를 하나 이상 선택해주세요.');
    });
    checkOne();
    const markSets = () => $$('.fset', est).forEach(fs => {
      const r = $$('input[type=radio], input[type=checkbox]', fs);
      fs.classList.toggle('bad', r.length > 0 && !r.some(i => i.checked));
    });
    const finish = () => { est.classList.add('sent'); done.hidden = false; est.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
    est.addEventListener('change', () => { checkOne(); if (est.classList.contains('tried')) { markSets(); err.hidden = est.checkValidity(); } });
    est.addEventListener('submit', async e => {
      e.preventDefault();
      est.classList.add('tried'); markSets();
      if (!est.checkValidity()) {
        err.hidden = false;
        const first = $('input:invalid, textarea:invalid', est);
        if (first) { first.closest('.fset, .fld, .agree').scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus({ preventScroll: true }); }
        return;
      }
      err.hidden = true;
      if (est.elements.website.value) { finish(); return; } // a bot filled the hidden field: pretend success, send nothing
      const data = new URLSearchParams();
      new FormData(est).forEach((v, k) => { if (k.startsWith('entry.')) data.append(k, String(v).trim()); });
      if (est.dataset.srcEntry) data.append('entry.' + est.dataset.srcEntry, SOURCE); // Google Form question "유입 경로"
      btn.disabled = true;
      try {
        await fetch(est.action, { method: 'POST', mode: 'no-cors', body: data });
        finish();
      } catch (_) {
        err.textContent = '전송에 실패했습니다. 잠시 후 다시 시도하시거나 1577-7107로 연락주세요.';
        err.hidden = false; btn.disabled = false;
      }
    });
  }

  // ---- home: estimate popup (PC) / bottom bar (phone), hidden for the rest of the day when asked ----
  const pop = $('#est-pop'), bar = $('#est-bar'), form = $('#est-form');
  if (pop && form) {
    const KEY = 'pospia-est-hide', today = new Date().toISOString().slice(0, 10);
    const hiddenToday = () => { try { return localStorage.getItem(KEY) === today; } catch (_) { return false; } };
    const home = form.parentNode, slot = document.createElement('div');
    slot.className = 'est-slot';
    let lastFocus = null, isOpen = false;
    const open = () => {
      if (isOpen) return; isOpen = true; lastFocus = document.activeElement;
      home.insertBefore(slot, form); $('#pop-body').appendChild(form); form.classList.add('in');
      pop.hidden = false; root.classList.add('pop-open'); lenis && lenis.stop();
      requestAnimationFrame(() => pop.classList.add('on'));
      if (bar) bar.classList.remove('on');
      setTimeout(() => $('.pop-x', pop).focus(), 50);
    };
    const close = () => {
      if (!isOpen) return; isOpen = false; pop.classList.remove('on');
      setTimeout(() => {
        pop.hidden = true; home.insertBefore(form, slot); slot.remove();
        root.classList.remove('pop-open'); lenis && lenis.start();
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      }, 350);
    };
    const hideToday = () => { try { localStorage.setItem(KEY, today); } catch (_) {} if (bar) { bar.classList.remove('on'); setTimeout(() => { bar.hidden = true; }, 500); } close(); };
    $$('[data-pop-close]', pop).forEach(b => b.addEventListener('click', close));
    $$('[data-pop-today]').forEach(b => b.addEventListener('click', hideToday));
    $$('[data-pop-open]').forEach(b => b.addEventListener('click', open));
    document.addEventListener('keydown', e => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { // keep focus inside the popup
        const f = $$('button, input, textarea, summary, a[href]', pop).filter(el => el.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    const est = $('#estimate');
    const nearForm = () => { const r = est.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
    if (!hiddenToday()) setTimeout(() => {
      if (form.classList.contains('sent') || nearForm()) return; // already looking at (or done with) the form
      if (matchMedia('(max-width: 680px)').matches) { if (bar) { bar.hidden = false; requestAnimationFrame(() => bar.classList.add('on')); } }
      else open();
    }, 1000);
  }

  // ---- promo landing: pick a set, carry it into the form; consultation form ----
  const combo = $('.combo-box');
  if (combo) {
    const picks = $$('[data-pick]', combo), sel = $('#combo-sel'), msg = $('#combo-msg');
    const syncForm = () => {
      const on = picks.filter(i => i.checked).map(i => i.value);
      $$('[data-sync]').forEach(c => { c.checked = on.includes(c.dataset.sync); c.dispatchEvent(new Event('change', { bubbles: true })); });
    };
    const show = () => {
      const on = picks.filter(i => i.checked).map(i => i.value);
      combo.classList.toggle('all', on.length === picks.length);
      sel.textContent = on.length ? on.join(' + ') : '위에서 상품을 골라 보세요';
      msg.innerHTML = on.length === picks.length ? '네 가지 모두 함께! <b>지원금 최대 90만원</b> 대상이에요'
        : on.length ? (on.length === 1 ? '단품으로도 신청할 수 있어요. ' : '이 조합으로 신청할 수 있어요. ') + '함께하는 상품이 많을수록 혜택이 커져요'
        : '네 가지를 모두 함께하면 <b>지원금 최대 90만원</b>';
    };
    picks.forEach(i => i.addEventListener('change', show));
    $('#combo-go').addEventListener('click', syncForm);
  }
  const pmf = $('#pm-form-el');
  if (pmf) {
    const err = $('.ferr', pmf), done = $('.fdone', pmf);
    const need = $$('[data-need-one]', pmf);
    const checkOne = () => need.forEach(g => { const c = $$('input[type=checkbox]', g); c.forEach(i => i.setCustomValidity('')); if (!c.some(i => i.checked) && c[0]) c[0].setCustomValidity('상품을 하나 이상 선택해주세요.'); });
    const mark = () => $$('.fset', pmf).forEach(fs => { const g = $('[data-need-one]', fs); if (g) fs.classList.toggle('bad', !$$('input', g).some(i => i.checked)); });
    checkOne();
    pmf.addEventListener('change', () => { checkOne(); if (pmf.classList.contains('tried')) { mark(); err.hidden = pmf.checkValidity(); } });
    pmf.addEventListener('submit', e => {
      e.preventDefault(); pmf.classList.add('tried'); checkOne(); mark();
      if (!pmf.checkValidity()) { err.hidden = false; const f = $('input:invalid', pmf); if (f) { f.closest('.fset, .fld, .agree').scrollIntoView({ block: 'center', behavior: 'smooth' }); f.focus({ preventScroll: true }); } return; }
      err.hidden = true;
      // answers go to the user's Google Sheet through its Apps Script web app (scripts/promo-apps-script.gs)
      const finish = () => { pmf.classList.add('sent'); done.hidden = false; pmf.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
      if (pmf.elements.website.value) { finish(); return; } // a bot filled the hidden field
      const data = new URLSearchParams(new FormData(pmf)); data.delete('agree'); data.append('page', location.pathname || 'promo'); data.append('source', SOURCE);
      const btn = $('.submit', pmf); btn.disabled = true;
      fetch(pmf.action, { method: 'POST', mode: 'no-cors', body: data })
        .then(finish)
        .catch(() => { err.textContent = '전송에 실패했습니다. 잠시 후 다시 시도하시거나 1577-7107로 연락주세요.'; err.hidden = false; btn.disabled = false; });
    });
    const sticky = $('.pm-sticky'), fsec = $('#pm-form');
    if (sticky && fsec) new IntersectionObserver(es => es.forEach(x => sticky.classList.toggle('hide', x.isIntersecting)), { threshold: .05 }).observe(fsec);
  }

  // ---- open-package landing: "이 구성으로 상담하기" ticks the matching items in the form ----
  const PKG = { '기본': ['포스', '카드단말기', '인터넷'], '추천': ['포스', '카드단말기', '키오스크', '인터넷', '전화', 'CCTV'],
    '올인원': ['포스', '카드단말기', '키오스크', '테이블오더', '인터넷', '전화', 'TV', 'CCTV', '택스리펀드'] };
  $$('[data-pkg]').forEach(a => a.addEventListener('click', () => {
    const want = PKG[a.dataset.pkg] || [];
    $$('#pm-form-el input[name=items]').forEach(c => { c.checked = want.includes(c.value); c.dispatchEvent(new Event('change', { bubbles: true })); });
  }));

  // ---- current year in the footer ----
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
