/* Mahdi | Graphic Designer: interactions
   GSAP + ScrollTrigger + Lenis. Everything visual is drawn in code. */
(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const still = params.has('still');            // capture mode for the cook harness
  const mobile = () => innerWidth <= 760;
  if (still) html.classList.add('still');

  // small seeded random, so drawings and physics look the same every visit
  const rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    // first in the frame (prioritized): Lenis scrolls while styles are still clean, so the
    // browser's scroll step doesn't have to recalculate what GSAP just wrote
    gsap.ticker.add((t) => lenis.raf(t * 1000), false, true);
    gsap.ticker.lagSmoothing(0);
  }
  // the scroll position as a plain number: in Chrome, reading window.scrollY forces a style
  // and layout update whenever anything changed, several times a frame in the scroll code
  const scrollPos = () => (lenis ? lenis.scroll : window.scrollY);
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4) });
    else (typeof target === 'number' ? window.scrollTo({ top: target, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
  };

  /* ---------- language ---------- */
  let lang = 'en', messed = false, guidesOn = false;
  // English first; French only when the visitor picked it before
  if (!still) {
    try { lang = localStorage.getItem('lang') || 'en'; } catch (e) { /* storage blocked */ }
  }
  if (!window.I18N[lang]) lang = 'en';
  const T = (k) => window.I18N[lang][k] ?? k;
  function applyLang(l, first) {
    lang = l; html.lang = l;
    $$('[data-i18n]').forEach((el) => { const v = window.I18N[l][el.dataset.i18n]; if (v != null) el.textContent = v; });
    $('[data-mess] span').textContent = T(messed ? 'unmess' : 'mess');
    $('[data-show] span').textContent = T(guidesOn ? 'hide' : 'show');
    $('.hero__h').setAttribute('aria-label', `${T('h1')} ${T('h2')} ${T('h3a').trim()} ${T('h3b')}`.replace(/\s+/g, ' '));
    measureGeo();   // the new copy may wrap differently (phones)
    buildKern();
    try { localStorage.setItem('lang', l); } catch (e) { /* storage blocked */ }
    if (!first) { setupWords(false); placeScribble(); ScrollTrigger.refresh(); resetBadges(); }
  }
  $('[data-lang]').addEventListener('click', () => applyLang(lang === 'en' ? 'fr' : 'en'));

  /* ---------- clock ---------- */
  const clk = $('[data-clock]');
  const tick = () => {
    try { clk.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Algiers' }).format(new Date()); }
    catch (e) { /* old browser */ }
  };
  tick(); setInterval(tick, 15000);

  /* ---------- header, progress, hero state ---------- */
  const bar = $('[data-progress]'), blurband = $('.blurband');
  let lastY = window.scrollY;
  // page geometry is measured once per layout (boot, resize, ScrollTrigger refresh), so the
  // per-frame scroll code below never has to force a layout to read it
  const geo = { sh: 0, footTop: 0, footH: 1, kernTop: 0 };
  function measureGeo() {
    const y = window.scrollY, f = $('[data-foot]'), k = $('[data-kern]');
    geo.sh = document.documentElement.scrollHeight;
    const fr = f.getBoundingClientRect();
    geo.footTop = fr.top + y; geo.footLeft = fr.left; geo.footH = f.offsetHeight || 1;
    geo.kernTop = k.getBoundingClientRect().top + y;
  }
  ScrollTrigger.addEventListener('refresh', measureGeo);
  function onScroll() {
    const y = scrollPos(), dy = y - lastY;
    if (!html.classList.contains('menu-open')) {
      if (y < 80) html.classList.remove('hdr-hidden');
      else if (dy > 3) html.classList.add('hdr-hidden');
      else if (dy < -3) html.classList.remove('hdr-hidden');
    }
    html.classList.toggle('past-hero', y > 120);
    const vh = innerHeight, sh = geo.sh || document.documentElement.scrollHeight, max = sh - vh;
    const p = max > 0 ? y / max : 0;
    // scroll meter: thumb as tall as the share of the page on screen (at least 12%)
    const ratio = Math.max(0.12, Math.min(1, vh / sh));
    bar.style.height = `${ratio * 100}%`;
    bar.style.transform = `translateY(${((p * (1 - ratio) * 100) / ratio).toFixed(2)}%)`;
    // bottom blur: off at the very top, fades in over the first 12% of a screen, out near the end
    const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    blurband.style.opacity = Math.min(smooth(y / (vh * 0.12)), smooth((max - y) / (vh * 0.2))).toFixed(3);
    lastY = y;
    checkFooter();
    setKernProgress(false);
  }
  // Lenis reports every frame of a smooth scroll (and native scrolls too); listening to both
  // ran all of this twice a frame
  if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll, { passive: true });

  /* ---------- hero image slots (free-licensed stand-in photos, see CREDITS.md) ---------- */
  // data-slot="4,0,2" in index.html picks pictures from this list by index
  const HERO_PICS = [
    ['images/hero-swatches.jpg', 'Colour swatches for a brand palette'],
    ['images/hero-card.jpg', 'A black business card held in a hand'],
    ['images/hero-bag.jpg', 'A kraft paper bag on a white table'],
    ['images/hero-poster.jpg', 'A poster mounted on a street fence'],
    ['images/hero-cards.jpg', 'Two business cards on a marble counter'],
    ['images/hero-box.jpg', 'A white and pink gift box']
  ];
  HERO_PICS.forEach(([src]) => { new Image().src = src; }); // warm the cache so a swap never shows a blank frame
  const makeArt = (n) => {
    const [src, alt] = HERO_PICS[n % HERO_PICS.length];
    const img = document.createElement('img');
    img.className = 'art'; img.src = src; img.alt = alt; img.decoding = 'async'; img.draggable = false;
    return img;
  };
  // the three slots take turns: one changes every 1.1 s, wiping up from the bottom;
  // hovering any slot (or the hero leaving the screen) pauses the cycle
  const slots = $$('[data-slot]').map((slot) => {
    const seq = slot.dataset.slot.split(',').map(Number);
    slot.appendChild(makeArt(seq[0]));
    return { slot, seq, k: 0 };
  });
  if (!(still || reduce)) {
    let turn = 0, hovering = 0, heroOn = true;
    slots.forEach(({ slot }) => {
      slot.addEventListener('pointerenter', () => hovering++);
      slot.addEventListener('pointerleave', () => (hovering = Math.max(0, hovering - 1)));
    });
    new IntersectionObserver(([e]) => (heroOn = e.isIntersecting)).observe($('.hero'));
    setInterval(() => {
      if (hovering || !heroOn || document.hidden) return;
      const s = slots[turn++ % slots.length];
      s.k = (s.k + 1) % s.seq.length;
      // the wipe is two opposite moves (mask up, picture down), so it runs on the GPU:
      // an animated clip-path would repaint the picture every frame
      const el = makeArt(s.seq[s.k]), wipe = document.createElement('div');
      wipe.className = 'slot__wipe'; wipe.appendChild(el); s.slot.appendChild(wipe);
      const o = { duration: 0.8, ease: 'expo.out', force3D: true, clearProps: 'transform' };
      gsap.fromTo(wipe, { yPercent: 100 }, { yPercent: 0, ...o });
      gsap.fromTo(el, { yPercent: -100 }, { yPercent: 0, ...o, onComplete: () => { while (s.slot.children.length > 1) s.slot.firstElementChild.remove(); } });
    }, 1100);
  }

  /* ---------- scribble under the last hero word ---------- */
  const scrib = $('[data-scribble]');
  const scribPath = scrib.querySelector('path');
  function placeScribble() {
    const u = $('.u'), hero = $('.hero');
    const r = u.getBoundingClientRect(), h = hero.getBoundingClientRect();
    scrib.style.left = `${Math.max(r.left - h.left - r.width * 0.02, parseFloat(getComputedStyle(html).fontSize) * 2.4)}px`;
    scrib.style.width = `${r.width * 1.0}px`;
    scrib.style.top = `${r.bottom - h.top - r.height * 0.05}px`;
    scrib.style.transform = 'rotate(-1deg)';
  }
  function drawScribble(instant) {
    const L = scribPath.getTotalLength();
    scribPath.style.strokeDasharray = L;
    if (instant) { scribPath.style.strokeDashoffset = 0; return; }
    gsap.fromTo(scribPath, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' });
  }

  /* ---------- loader: a stamp bounces across and lifts the orange columns ----------
     Same mechanics as the reference intro: a thrown stamp (≥4 bounces, squash and stretch,
     a shadow), each column lifts as the stamp passes its centre, the hero is revealed column
     by column, any click/key/wheel skips it. Plays once per visit (add ?intro to replay). */
  let introSeen = false;
  try { introSeen = sessionStorage.getItem('mahdi-intro') === '1'; } catch (e) { /* storage blocked */ }
  const playLoader = !(still || reduce) && (!introSeen || params.has('intro'));
  const uncover = { cols: null, lifted: null, waiting: [] };
  function colAt(x) {
    const s = uncover.cols, i = s.findIndex(([a, b]) => x >= a && x < b);
    return i < 0 ? (x < s[0][0] ? 0 : s.length - 1) : i;
  }
  function whenUncovered(x, fn) {
    if (!uncover.cols) return fn();
    if (uncover.lifted[colAt(x)]) return fn();
    uncover.waiting.push({ x, fn });
  }
  function uncoverCol(i) {
    uncover.lifted[i] = true;
    for (let k = uncover.waiting.length - 1; k >= 0; k--) if (colAt(uncover.waiting[k].x) === i) uncover.waiting.splice(k, 1)[0].fn();
  }
  function planThrow(W, H, r, colW) {
    const lerp = (a, b, u) => a + (b - a) * u;
    const sim = (R) => {
      const g = 5 * H, floor = H - r, dt = 1 / 240;
      let x = lerp(-1.6 * r, colW, R()), y = -r - lerp(0.02, 0.22, R()) * H, vx = lerp(0.4, 0.75, R()) * W, vy = lerp(0, 0.35, R()) * H, w = lerp(-6, 6, R());
      const bounce = lerp(0.5, 0.66, R()), xs = [], ys = [], rots = [], impacts = [];
      let rot = R() * 6.283, t = 0, rolling = false, bounces = 0, firstHit = null;
      while (t < 6) {
        if (!rolling) vy += g * dt;
        x += vx * dt; y += vy * dt; rot += w * dt;
        if (!rolling && y >= floor && vy > 0) {
          y = floor; const sp = vy; if (firstHit === null) firstHit = x;
          if (sp < 0.08 * Math.sqrt(g * H)) { rolling = true; vy = 0; } else { vy = -sp * bounce; bounces++; }
          vx = ((vx + 0.4 * w * r) / 1.4) * 0.985; w = vx / r;
          impacts.push({ t, speed: sp / Math.sqrt(2 * g * H) });
        }
        if (rolling) { y = floor; vx = Math.max(0.15 * W, vx - 0.05 * W * dt); w = vx / r; }
        xs.push(x); ys.push(y); rots.push(rot); t += dt;
        if (x - r > W) break;
      }
      return { xs, ys, rots, impacts, exit: t, bounces, firstHit, dt };
    };
    // try throws until one lasts ~2.2 s, bounces at least 4 times and lands in the left half
    const R = rng((Math.random() * 2147483648) | 0);
    let best = null, score = Infinity;
    for (let i = 0; i < 400; i++) {
      const p = sim(R);
      if (p.exit >= 2 && p.exit <= 2.4 && p.bounces >= 4 && p.firstHit !== null && p.firstHit > 0.1 * W && p.firstHit < 0.55 * W) return p;
      const s = Math.abs(p.exit - 2.2) + (p.bounces < 4 ? 1 : 0);
      if (s < score) { score = s; best = p; }
    }
    return best;
  }
  function runLoader() {
    const cols = $$('.loader__cols i'), ball = $('.loader__ball'), face = $('.loader__face'), shadow = $('.loader__shadow');
    const W = innerWidth, H = innerHeight;
    uncover.cols = cols.map((c) => { const b = c.getBoundingClientRect(); return [b.left, b.right]; });
    uncover.lifted = cols.map(() => false);
    const D = W / (W <= 767 ? 6 : W <= 991 ? 9 : 12.5), r = D / 2;
    ball.style.width = ball.style.height = `${D}px`;
    shadow.style.width = `${D * 1.1}px`; shadow.style.height = `${D * 0.2}px`;
    const path = planThrow(W, H, r, uncover.cols[0][1] - uncover.cols[0][0]);
    const due = uncover.cols.map(([a, b]) => { const k = path.xs.findIndex((x) => x >= (a + b) / 2); return k < 0 ? path.exit : Math.max(0.08, k * path.dt); });
    const liftAt = cols.map(() => -1);
    const sq = { v: 0, vel: 0, k: ((2 * Math.PI) / 0.34) ** 2, c: (4 * Math.PI * (1 - 0.32)) / 0.34 };   // squash spring
    const liftEase = (u) => 1 - (1 + 8 * u) * Math.exp(-8 * u);                                          // critically damped
    let t = 0, last = performance.now(), imp = 0, skipAt = -1;
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const skip = () => { if (skipAt >= 0) return; skipAt = t; let n = 0; cols.forEach((_, i) => { if (liftAt[i] < 0) due[i] = t + n++ * 0.022; }); };
    evs.forEach((e) => addEventListener(e, skip, { passive: true }));
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const k = Math.min(path.xs.length - 1, Math.floor(t / path.dt)), x = path.xs[k], y = path.ys[k];
      while (imp < path.impacts.length && path.impacts[imp].t <= t) { sq.v = -Math.min(0.17, 0.22 * path.impacts[imp++].speed); sq.vel = 0; }
      for (let s = 0; s < 4; s++) { const h = dt / 4; sq.vel += (-sq.k * sq.v - sq.c * sq.vel) * h; sq.v += sq.vel * h; }
      ball.style.transform = `translate3d(${x - r}px, ${y - r}px, 0) scale(${1 - sq.v * 0.85}, ${1 + sq.v})`;
      face.style.transform = `rotate(${path.rots[k]}rad)`;
      const near = 1 - Math.min(1, Math.max(0, (H - r - y) / (H * 0.85)));
      shadow.style.transform = `translate3d(${x - D * 0.55}px, ${H - D * 0.12}px, 0) scale(${0.35 + 0.65 * near}, ${0.6 + 0.4 * near})`;
      let so = y > -r ? near * near : 0;
      if (skipAt >= 0) { const f = Math.min(1, (t - skipAt) / 0.18); ball.style.opacity = String(1 - f); so *= 1 - f; }
      shadow.style.opacity = String(so);
      let busy = skipAt < 0 && t < path.exit;
      cols.forEach((c, i) => {
        if (liftAt[i] < 0 && t >= due[i]) { liftAt[i] = t; uncoverCol(i); }
        if (liftAt[i] < 0) { busy = true; return; }
        // the ease only reaches .997 at u = 1, so finish on time (u), not on the eased value
        const u = Math.min(1, (t - liftAt[i]) / 0.62), p = u >= 1 ? 1 : liftEase(u);
        c.style.transform = `translate3d(0, ${(-101 * p).toFixed(2)}%, 0)`;
        if (u < 1) busy = true;
      });
      if (busy) return requestAnimationFrame(frame);
      evs.forEach((e) => removeEventListener(e, skip));
      html.classList.add('no-loader');
      try { sessionStorage.setItem('mahdi-intro', '1'); } catch (e) { /* storage blocked */ }
      uncover.waiting.splice(0).forEach(({ fn }) => fn());
      uncover.cols = null;
    };
    requestAnimationFrame(frame);
  }
  if (playLoader) {
    gsap.set('.hl__in', { yPercent: 108 });
    gsap.set('.slot', { clipPath: 'inset(100% 0 0 0)' });
    gsap.set('.hero__p, .hero__scroll', { y: 24, opacity: 0 });
    runLoader();
  } else html.classList.add('no-loader');
  function intro() {
    if (!playLoader) { drawScribble(true); return; }
    const L = scribPath.getTotalLength();
    scribPath.style.strokeDasharray = L; scribPath.style.strokeDashoffset = L;
    const leftOf = (el) => el.getBoundingClientRect().left + 1;
    $$('.hl__in').forEach((el) => whenUncovered(leftOf(el), () => gsap.to(el, { yPercent: 0, duration: 1.1, ease: 'expo.out' })));
    $$('.slot').forEach((el) => whenUncovered(leftOf(el), () => gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 0.9, ease: 'expo.out' })));
    whenUncovered(leftOf($('.hero__p')), () => gsap.to('.hero__p, .hero__scroll', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.06 }));
    whenUncovered($('.u').getBoundingClientRect().right - 1, () => drawScribble(false));
  }

  /* ---------- pen drawing in the intro section ---------- */
  // One continuous hand-drawn stroke: a signature, a poster on a wall, a box on a shelf, a card in a hand.
  const wave = (x1, y1, x2, y2, amp, waves) => Array.from({ length: waves * 6 + 1 }, (_, i) => {
    const u = i / (waves * 6); return [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u + Math.sin(u * waves * 6.283) * amp];
  });
  const arc = (cx, cy, r, a0, turns) => Array.from({ length: Math.round(28 * turns) + 1 }, (_, i) => {
    const a = a0 + (i / Math.round(28 * turns)) * turns * 6.283; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.96];
  });
  const P = [
    // signature, "Ma": the M, an entry stroke over the top of the a, its round bowl (drawn
    // counter-clockwise, like a hand does), the stem, then out along the floor to the wall
    [44, 318], [56, 238], [76, 300], [94, 238], [101, 316], [110, 286], [130, 280],
    ...Array.from({ length: 15 }, (_, i) => { const a = -0.5 - (i / 14) * 5.85; return [121 + Math.cos(a) * 14, 300 + Math.sin(a) * 18]; }),
    [135, 279], [137, 318], [148, 322],
    // a poster on a wall: frame, a sun, two lines of type, out along the right edge
    [198, 321], [200, 36], [452, 30], [450, 300], [204, 302], [266, 186],
    ...arc(326, 128, 66, 2.35, 1.04), [236, 238],
    ...wave(236, 238, 418, 238, 3.4, 5), [240, 268], ...wave(240, 268, 372, 268, 3, 4), [450, 300], [454, 321],
    // a box on a shelf
    [668, 320], [680, 318], [680, 196], [712, 170], [808, 170], [808, 288], [776, 318], [776, 196], [680, 196], [681, 318], [776, 320],
    // a card held up in a hand (portrait, double outline)
    [1062, 321], [1143, 297], [1115, 95], [1238, 78], [1266, 280], [1143, 297],
    [1147, 292], [1120, 100], [1234, 84], [1260, 276], [1146, 293], [1172, 312], [1208, 306],
    // the pen lifts off with a small curl
    ...arc(1222, 296, 13, 2.2, 0.85)
  ];
  const pen = $('[data-pen]'), pen2 = $('[data-pen2]'), tip = $('[data-tip]'), fill = $('[data-fill]');
  // two passes of the same stroke with different wobble: reads as pencil, not a vector line
  const buildPen = (target, seed, amp, overshoot = 0) => {
    const R = rng(seed), ph = [R() * 6.28, R() * 6.28];
    let d = '', t = 0;
    // overshoot: at sharp corners the pencil runs a few px past the corner before turning
    let Q = P;
    if (overshoot) {
      Q = [P[0]];
      for (let i = 1; i < P.length - 1; i++) {
        const [ax, ay] = P[i - 1], [bx, by] = P[i], [cx, cy] = P[i + 1];
        const l1 = Math.hypot(bx - ax, by - ay) || 1, l2 = Math.hypot(cx - bx, cy - by) || 1;
        const cos = ((bx - ax) * (cx - bx) + (by - ay) * (cy - by)) / (l1 * l2);
        if (cos < 0.4 && l1 > 30 && l2 > 30) {
          const o = overshoot * (0.6 + R() * 0.8);
          Q.push([bx + ((bx - ax) / l1) * o, by + ((by - ay) / l1) * o], [bx - ((cx - bx) / l2) * o * 0.5, by - ((cy - by) / l2) * o * 0.5]);
        } else Q.push(P[i]);
      }
      Q.push(P[P.length - 1]);
    }
    for (let i = 0; i < Q.length - 1; i++) {
      const [x1, y1] = Q[i], [x2, y2] = Q[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const n = Math.max(1, Math.ceil(len / 11));
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      for (let j = i ? 1 : 0; j <= n; j++) {
        const u = j / n; t += len / n;
        const edge = Math.min(u, 1 - u) < 0.08 ? 0.35 : 1;
        const w = (Math.sin(t * 0.045 + ph[0]) * 1.2 + Math.sin(t * 0.17 + ph[1]) * 0.45 + (R() - 0.5) * 0.45) * edge * amp;
        d += `${d ? 'L' : 'M'}${(x1 + (x2 - x1) * u + nx * w).toFixed(1)} ${(y1 + (y2 - y1) * u + ny * w).toFixed(1)} `;
      }
    }
    target.setAttribute('d', d);
  };
  buildPen(pen, 7, 1);
  buildPen(pen2, 31, 1.9, 5);
  const penL = pen.getTotalLength(), pen2L = pen2.getTotalLength();
  pen.style.strokeDasharray = penL;
  pen2.style.strokeDasharray = pen2L;
  // points along the stroke, sampled once: the pen tip reads this table instead of walking the
  // whole path (getPointAtLength) on every scroll frame
  const PTS = 1200, ptsX = new Float32Array(PTS + 1), ptsY = new Float32Array(PTS + 1);
  for (let k = 0; k <= PTS; k++) { const q = pen.getPointAtLength((penL * k) / PTS); ptsX[k] = q.x; ptsY[k] = q.y; }
  // each caption appears when the pen reaches its object
  const caps = $$('.stage__lbl').map((el, i) => {
    const x0 = [452, 808, 1262][i];   // caption shows once its object is finished
    let at = 1;
    for (let k = 0; k <= PTS; k++) { if (ptsX[k] >= x0) { at = k / PTS; break; } }
    return { el, at };
  });
  const setPen = (p) => {
    caps.forEach((c) => c.el.classList.toggle('is-on', p >= c.at));
    pen.style.strokeDashoffset = penL * (1 - p);
    pen2.style.strokeDashoffset = pen2L * (1 - Math.max(0, p - 0.004));
    const f = Math.max(0, Math.min(1, p)) * PTS, k = Math.min(PTS - 1, Math.floor(f)), u = f - k;
    tip.setAttribute('cx', (ptsX[k] + (ptsX[k + 1] - ptsX[k]) * u).toFixed(1)); tip.setAttribute('cy', (ptsY[k] + (ptsY[k + 1] - ptsY[k]) * u).toFixed(1));
    tip.style.opacity = p > 0.003 && p < 0.985 ? 1 : 0;
    fill.style.opacity = p > 0.985 ? 1 : 0;
  };
  setPen(reduce ? 1 : 0);
  if (!reduce) ScrollTrigger.create({ trigger: '[data-stage]', start: 'top bottom', end: 'top 11%', onUpdate: (s) => setPen(s.progress) });

  /* ---------- blur reveals (paragraphs come into focus) ---------- */
  if (!reduce) $$('[data-reveal]').forEach((el) => {
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 112%', end: 'top 70%', scrub: true } })
      .fromTo(el, { opacity: 0.25 }, { opacity: 1, duration: 0.3, ease: 'none' }, 0)
      .fromTo(el, { y: 14, filter: 'blur(2.5px)' }, { y: 0, filter: 'blur(0px)', duration: 1, ease: 'none' }, 0);
  });

  /* ---------- headings rise in word by word (like the reference) ---------- */
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function splitWords(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(' ').map((w) => `<span class="rw" aria-hidden="true"><span>${esc(w)}</span></span>`).join(' ');
  }
  const wordEls = () => $$('[data-words]');
  const wordIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    wordIO.unobserve(e.target); e.target.dataset.shown = '1';
    gsap.to($$('.rw > span', e.target), { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.018, delay: 0.1 });
  }), { rootMargin: '0px 0px -12% 0px' }) : null;
  function setupWords(first) {
    wordEls().forEach((el) => {
      splitWords(el);
      const inner = $$('.rw > span', el);
      // only words still below the fold wait to rise; anything already seen stays put
      if (still || reduce || !wordIO || el.dataset.shown || (first && el.getBoundingClientRect().top < innerHeight * 0.88)) { el.dataset.shown = '1'; return; }
      gsap.set(inner, { yPercent: 105 }); wordIO.observe(el);
    });
  }

  /* ---------- project cards: picture wipes up and settles, title lines rise ---------- */
  if (!(still || reduce) && 'IntersectionObserver' in window) {
    const cardIO = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      cardIO.unobserve(e.target);
      const cover = $('.card__cover', e.target), art = $('.card__img > .art', e.target), txt = $$('.card__t, .card__d', e.target);
      // a paper-coloured cover shrinks upwards (a GPU transform), so the picture is painted once
      gsap.to(cover, { scaleY: 0, duration: 1.3, ease: 'expo.out', force3D: true, onComplete: () => cover.remove() });
      gsap.to(art, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' });
      gsap.to(txt, { clipPath: 'inset(-30% -5% -30% -5%)', y: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.06, clearProps: 'clipPath,transform' });
    }), { threshold: 0.2 });
    $$('.card').forEach((card) => {
      if (card.getBoundingClientRect().top < innerHeight) return;
      const cover = document.createElement('i'); cover.className = 'card__cover'; cover.setAttribute('aria-hidden', 'true');
      $('.card__img', card).appendChild(cover);
      gsap.set($('.card__img > .art', card), { scale: 1.08 });
      gsap.set($$('.card__t, .card__d', card), { clipPath: 'inset(0 0 100% 0)', y: '0.5em' });
      cardIO.observe(card);
    });
  }

  /* ---------- "Let's talk": a scribble draws itself under it on hover ---------- */
  const talk = $('.foot__talk'), talkLine = $('.talk-line path');
  if (talk && talkLine) {
    const draw = (on) => gsap.to(talkLine, { strokeDashoffset: on ? 0 : 1, duration: on ? 0.8 : 0.32, ease: on ? 'power3.out' : 'power2.in', overwrite: true });
    talk.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && draw(true));
    talk.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && document.activeElement !== talk && draw(false));
    talk.addEventListener('focus', () => talk.matches(':focus-visible') && draw(true));
    talk.addEventListener('blur', () => !talk.matches(':hover') && draw(false));
  }

  /* ---------- the footer email copies itself ---------- */
  $$('[data-copy-email]').forEach((a) => {
    const msg = a.parentElement.querySelector('[data-copy-msg]');
    let t = 0;
    const say = (s) => { if (!msg) return; msg.textContent = s; msg.classList.add('is-on'); clearTimeout(t); t = setTimeout(() => msg.classList.remove('is-on'), 1600); };
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await navigator.clipboard.writeText(a.dataset.copyEmail); say(T('copied')); }
      catch (err) { const r = document.createRange(); r.selectNodeContents(a); getSelection().removeAllRanges(); getSelection().addRange(r); say(T('copy_fail')); }
    });
  });

  /* ---------- foliage: thousands of small top-lit leaves per crown ----------
     Painted once onto a canvas and reused as an image (cached per layout), so the page
     carries one picture instead of thousands of SVG nodes. */
  $$('.card [data-foliage]').forEach(buildFoliage);
  function foliageURL(cfgText) {
    const cache = (foliageURL.cache = foliageURL.cache || new Map());
    if (cache.has(cfgText)) return cache.get(cfgText);
    const job = new Promise((resolve) => {
      const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
      const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
      const cfg = JSON.parse(cfgText), R = rng(cfg.seed), S = Math.min(2, window.devicePixelRatio || 1);
      const W = 1392, H = 791;
      const c1 = document.createElement('canvas'); c1.width = W * S; c1.height = H * S;
      const x = c1.getContext('2d'); x.scale(S, S);
      const dark = [24, 44, 16], mid = [58, 96, 34], lite = [128, 168, 70], sun = [172, 204, 104];
      if (cfg.grass) {
        const [gx, gy, gw, gh] = cfg.grass;
        x.lineCap = 'round';
        for (let i = 0; i < gw / 2.2; i++) {
          // sunlit patches next to deep shade
          const bx = gx + R() * gw, h = gh * (0.4 + R() * 0.8);
          const sunny = Math.sin(bx * 0.012) + Math.sin(bx * 0.031 + 1.7) > 0.6;
          const c = sunny ? mix([110, 140, 52], [160, 195, 80], R()) : mix([36, 46, 22], [80, 96, 46], R());
          const qx = (R() - 0.5) * 8, ex = (R() - 0.5) * 14;
          x.strokeStyle = rgb(c); x.lineWidth = 1 + R() * 1.6;
          x.beginPath(); x.moveTo(bx, gy + gh); x.quadraticCurveTo(bx + qx, gy + gh - h / 2, bx + ex, gy + gh - h); x.stroke();
        }
      }
      cfg.crowns.forEach(([cx, cy, rx, ry]) => {
        x.save(); x.filter = `blur(${6 * S}px)`; x.fillStyle = rgb(dark);
        x.beginPath(); x.ellipse(cx, cy + ry * 0.08, rx * 0.9, ry * 0.9, 0, 0, 6.2832); x.fill(); x.restore();
        const n = Math.round((rx * ry) / 34);
        for (let i = 0; i < n; i++) {
          let px, py, d;
          do { px = R() * 2 - 1; py = R() * 2 - 1; d = px * px + py * py; } while (d > 1);
          const edge = Math.sqrt(d);
          const light = Math.max(0, Math.min(1, 0.55 - py * 0.55 + px * 0.18 + (R() - 0.5) * 0.5 - edge * 0.12));
          const c = light > 0.82 && R() > 0.5 ? mix(lite, sun, R()) : light > 0.45 ? mix(mid, lite, (light - 0.45) / 0.4) : mix(dark, mid, light / 0.45);
          const r = 2.2 + R() * 6 * (1 - edge * 0.35);
          // leaves are small ellipses at random angles, not perfect dots
          const ry2 = r * (0.55 + R() * 0.4), rot = R() * Math.PI;
          x.fillStyle = rgb(c); x.beginPath(); x.ellipse(cx + px * rx, cy + py * ry, r, ry2, rot, 0, 6.2832); x.fill();
        }
      });
      // a touch of depth of field over the whole layer
      const c2 = document.createElement('canvas'); c2.width = c1.width; c2.height = c1.height;
      const x2 = c2.getContext('2d'); x2.filter = `blur(${0.7 * S}px)`; x2.drawImage(c1, 0, 0);
      c2.toBlob((b) => resolve(b ? URL.createObjectURL(b) : c2.toDataURL()), 'image/png');
    });
    cache.set(cfgText, job);
    return job;
  }
  function buildFoliage(svg) {
    const img = document.createElement('img');
    img.className = 'foliage'; img.alt = ''; img.decoding = 'async'; img.setAttribute('aria-hidden', 'true');
    img.style.objectPosition = (svg.getAttribute('preserveAspectRatio') || '').includes('YMax') ? '50% 100%' : '50% 50%';
    foliageURL(svg.dataset.foliage).then((u) => { img.src = u; });
    svg.replaceWith(img);
  }

  /* ---------- cursor label on project pictures ----------
     Follows the pointer on a critically damped spring (~0.35 s), scales in from nothing,
     and flips to the other side of the pointer near the right or bottom edge. */
  const cur = $('[data-cursor]');
  let mx = innerWidth / 2, my = innerHeight / 2, hasMouse = false, curOn = false;
  const sp = { x: 0, y: 0, vx: 0, vy: 0 };
  // hit-test only when the pointer moved or the page scrolled under it, never every frame
  let needHit = true, overCase = false, curW = 0, curH = 0, lastHit = 0, hitT = 0;
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mx = e.clientX; my = e.clientY; hasMouse = true; needHit = true; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { hasMouse = false; needHit = true; });
  // while scrolling under a still pointer: at most ~11 checks a second, plus one when it stops
  const scrollHit = () => {
    if (!hasMouse) return;
    if (performance.now() - lastHit > 90) needHit = true;
    clearTimeout(hitT); hitT = setTimeout(() => (needHit = true), 100);
  };
  if (lenis) lenis.on('scroll', scrollHit); else addEventListener('scroll', scrollHit, { passive: true });
  gsap.ticker.add((time, dms) => {
    if (needHit) { needHit = false; lastHit = performance.now(); const el = hasMouse ? document.elementFromPoint(mx, my) : null; overCase = !!(el && el.closest('[data-case]')); }
    const on = overCase && !mobile() && !html.classList.contains('sys-on');
    if (!on && !curOn) return;                     // hidden and settled: nothing to do
    const dt = Math.min(0.05, (dms || 16) / 1000);
    if (on && !curOn) { curW = cur.offsetWidth; curH = cur.offsetHeight; }
    const w = curW, h = curH;
    const tx = mx + 16 + w > innerWidth - 8 ? mx - 16 - w : mx + 16, ty = my + 16 + h > innerHeight - 8 ? my - 16 - h : my + 16;
    if (on && !curOn) { sp.x = tx; sp.y = ty; sp.vx = sp.vy = 0; }
    const k = 320, c = 2 * Math.sqrt(k);
    sp.vx += (k * (tx - sp.x) - c * sp.vx) * dt; sp.vy += (k * (ty - sp.y) - c * sp.vy) * dt;
    sp.x += sp.vx * dt; sp.y += sp.vy * dt;
    cur.style.translate = `${sp.x.toFixed(1)}px ${sp.y.toFixed(1)}px`;
    if (on !== curOn) { curOn = on; cur.classList.toggle('is-on', on); }
  });

  /* ---------- the details: a kerning toy ----------
     As the section scrolls in, the letters slide from wide apart into place while live kerning
     values count down between them. Then each letter moves sideways only (drag, or the arrow
     keys), within limits set by its neighbours, like real kerning. Units are 1/1000 em. */
  const kern = $('[data-kern]'), guides = $('[data-guides]'), det = $('.details'), kMsg = $('[data-kern-msg]');
  const KW = { en: ['spacing', 3], fr: ['espace', 2] };
  let kL = [], kTags = [], kP = [], kWd = [], kD = [], kA = [], kF = 340, kW = 1, kReady = false, kGrab = -1;
  let kInk = [], kMin = [], kRem = 10;   // ink edges per letter, tightest kerning per pair (units, ≤ 0)
  let kBase = 0, kTagTop = 0, kX = [], kTagBox = [];   // baseline, tag row, letter positions and tag boxes (kern coords)
  let gLab = [], gStatic = [];                          // guide labels and the fixed text they must avoid
  const kCtx = document.createElement('canvas').getContext('2d');
  const kState = { w: 1 }, kAnim = { t: 0 };
  const u2px = (u) => (u / 1000) * kF, px2u = (px) => (px / kF) * 1000;
  const kRoom = () => det.clientWidth - 2 * kern.offsetLeft;   // width the word may use
  function buildKern() {
    const [word, o] = KW[lang] || KW.en;
    kern.innerHTML = [...word].map((ch, i) => `<span class="kern__l${i === o ? ' o' : ''}" role="slider" tabindex="-1" aria-label="${ch}" aria-valuemin="-110" aria-valuemax="420" aria-valuenow="0">${ch}</span>`).join('')
      + [...word].slice(1).map(() => '<i class="kern__tag mono" aria-hidden="true"></i>').join('');
    kern.setAttribute('role', 'group');
    kern.setAttribute('aria-label', `${word}. ${T('kern_aria')}`);
    kL = $$('.kern__l', kern); kTags = $$('.kern__tag', kern); kA = kL.map(() => 0);
    kL.forEach(bindLetter);
    measureKern(); setKernProgress(true); kernMsg();
    requestAnimationFrame(buildGuides);
  }
  // the true gap between two glyphs set `dx` apart: each glyph is drawn once off screen and
  // scanned row by row for where its ink starts and ends (round letters can tuck closer than
  // their boxes suggest, like real kerning); the gap is the narrowest row both glyphs share
  const kShape = new Map();
  function glyphProfile(ch, cs) {
    const key = `${cs.fontWeight} ${kF}px ${cs.fontFamily}|${ch}`;
    if (kShape.has(key)) return kShape.get(key);
    const c = document.createElement('canvas'), W = Math.ceil(kF * 1.6), H = Math.ceil(kF * 1.4), ox = Math.round(kF * 0.3);
    c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.font = `${cs.fontWeight} ${kF}px ${cs.fontFamily}`; g.fillText(ch, ox, Math.round(kF * 1.05));
    const d = g.getImageData(0, 0, W, H).data, lft = new Float32Array(H).fill(NaN), rgt = new Float32Array(H).fill(NaN);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 60) { if (Number.isNaN(lft[y])) lft[y] = x - ox; rgt[y] = x - ox + 1; }
    const p = { lft, rgt }; kShape.set(key, p); return p;
  }
  function shapeGap(a, b, dx, cs) {
    const A = glyphProfile(a, cs), B = glyphProfile(b, cs); let g = Infinity;
    for (let y = 0; y < A.rgt.length; y++) if (!Number.isNaN(A.rgt[y]) && !Number.isNaN(B.lft[y])) g = Math.min(g, dx + B.lft[y] - A.rgt[y]);
    return g === Infinity ? dx : g;
  }
  function measureKern() {
    kL.forEach((el) => (el.style.transform = ''));
    const cs = getComputedStyle(kern);
    kF = parseFloat(cs.fontSize); kRem = parseFloat(getComputedStyle(html).fontSize);
    kP = kL.map((el) => el.offsetLeft); kWd = kL.map((el) => el.offsetWidth);
    // where each glyph's ink starts and ends, so no pair can ever be kerned into a collision:
    // the tightest kerning for a pair leaves a hairline (2.5% of the size) between the glyphs
    kCtx.font = `${cs.fontWeight} ${kF}px ${cs.fontFamily}`; kCtx.letterSpacing = '0px';
    kInk = kL.map((el) => { const t = kCtx.measureText(el.textContent); return { l: -t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight, a: t.actualBoundingBoxAscent, d: t.actualBoundingBoxDescent }; });
    kMin = kL.map((_, i) => (i === 0 ? 0 : Math.max(-110, Math.min(0, -px2u(shapeGap(kL[i - 1].textContent, kL[i].textContent, kP[i] - kP[i - 1], cs) - 0.012 * kF)))));
    kL.forEach((el, i) => el.setAttribute('aria-valuemin', Math.round(kMin[i])));
    // the value tags get their own row just above the tallest glyph (ascender or i dot)
    const fm = kCtx.measureText(kL.map((el) => el.textContent).join('') + 'kd'), lh = parseFloat(cs.lineHeight) || kF;
    kBase = (lh - (fm.fontBoundingBoxAscent + fm.fontBoundingBoxDescent)) / 2 + fm.fontBoundingBoxAscent;
    kTagTop = kBase - fm.actualBoundingBoxAscent - Math.max(0.05 * kF, 0.6 * kRem) - 1.2 * kRem;
    kTags.forEach((tg) => (tg.style.top = `${kTagTop.toFixed(1)}px`));
    const n = kL.length, room = kRoom(), col = room / (mobile() ? 4 : 12);
    // spread: the word reaches across the section, each letter on a grid column where it fits,
    // and no pair ever closer than its final spacing (wide letters don't overlap on the way in)
    const extra = Math.max(0, room - (kP[n - 1] + kWd[n - 1]));
    kD = [];
    for (let i = 0; i < n; i++) {
      const even = kP[i] + (extra * i) / Math.max(1, n - 1);
      if (i === 0) { kD.push(0); continue; }
      const minPos = kD[i - 1] + (kP[i] - kP[i - 1]);
      let s = Math.round(even / col) * col; if (s < minPos) s = Math.ceil(minPos / col - 1e-6) * col;
      kD.push(s);
    }
    if (kD[n - 1] + kWd[n - 1] > room + 1) kD = kL.map((_, i) => kP[i] + (extra * i) / Math.max(1, n - 1));   // no room to snap
  }
  function renderKern() {
    const w = kW, x = kL.map((_, i) => kP[i] + (kD[i] - kP[i]) * (1 - w) + u2px(kA[i]) * w);
    kL.forEach((el, i) => (el.style.transform = `translateX(${(x[i] - kP[i]).toFixed(1)}px)`));
    // each tag sits over the gap between two glyphs; tags that would touch (a narrow letter
    // between two kerned pairs) are pushed apart so their numbers never overlap
    let prevR = -Infinity;
    kX = x; kTagBox = [];
    kTags.forEach((tg, i) => {
      let txt, op;
      if (w < 0.999) {   // arriving: how much each pair still has to close up
        const r = Math.round(px2u(x[i + 1] - x[i] - (kP[i + 1] - kP[i])));
        txt = r > 0 ? `−${r}` : '0'; op = Math.min(1, (1 - w) * 4);
      } else {           // playing: the kerning you added to each pair
        const r = Math.round(kA[i + 1] - kA[i]);
        txt = r === 0 ? '0' : r > 0 ? `+${r}` : `−${-r}`;
        op = Math.abs(r) >= 1 || kGrab === i || kGrab === i + 1 ? 1 : 0;
      }
      if (tg.textContent !== txt) tg.textContent = txt;
      tg.style.opacity = op.toFixed(3);
      let cx = (x[i] + (kInk[i] ? kInk[i].r : kWd[i]) + x[i + 1] + (kInk[i + 1] ? kInk[i + 1].l : 0)) / 2;
      if (op > 0.01) {
        const half = (txt.length * 0.64 * 1.2 * kRem) / 2, gap = 0.8 * kRem;   // mono digits: ~0.64 em wide
        if (cx - half < prevR + gap) cx = prevR + gap + half;
        prevR = cx + half;
        kTagBox.push([cx - half, kTagTop, cx + half, kTagTop + 1.2 * kRem]);
      }
      tg.style.left = `${cx.toFixed(1)}px`;
    });
    if (guidesOn) placeGuideLabels();
  }
  // each guide label takes the first spot, left or right of the word and above or below its line,
  // that touches no glyph, kerning tag, other label or nearby text; with no free spot it hides
  function placeGuideLabels() {
    if (!gLab.length) return;
    const ox = kern.offsetLeft, oy = kern.offsetTop, pad = 0.4 * kRem;
    const busy = gStatic.slice();
    kL.forEach((_, i) => { if (kInk[i] && kX.length) busy.push([ox + kX[i] + kInk[i].l, oy + kBase - kInk[i].a, ox + kX[i] + kInk[i].r, oy + kBase + kInk[i].d]); });
    kTagBox.forEach(([a, b, c, d]) => busy.push([ox + a, oy + b, ox + c, oy + d]));
    const hit = (r) => busy.some((q) => r[0] < q[2] + pad && r[2] > q[0] - pad && r[1] < q[3] + pad && r[3] > q[1] - pad);
    for (const g of gLab) {
      let done = false;
      for (const spot of g.pref) {
        const right = spot[0] === 'R', up = spot[1] === 'U';
        const x0 = right ? g.x1 - g.w : g.x0, y0 = up ? g.y - 0.5 * kRem - g.h : g.y + 0.5 * kRem;
        const r = [x0, y0, x0 + g.w, y0 + g.h];
        if (hit(r)) continue;
        g.el.style.cssText = `${right ? 'right:0;left:auto' : 'left:0;right:auto'};${up ? 'bottom:.5rem;top:auto' : 'top:.5rem;bottom:auto'};opacity:1`;
        busy.push(r); done = true; break;
      }
      if (!done) g.el.style.opacity = '0';
    }
  }
  function kernMsg() {
    const diffs = kL.slice(1).map((_, i) => Math.abs(kA[i + 1] - kA[i]));
    const total = Math.round(diffs.reduce((s, d) => s + d, 0)), worst = Math.max(0, ...diffs);
    const moved = kA.some((v) => Math.abs(v) > 0.5), spot = moved && worst <= 12;
    messed = moved;
    kMsg.innerHTML = !moved ? T('hint') : spot ? T('kern_spot') : T('kern_off').replace('{n}', total);
    kMsg.classList.toggle('is-spot', spot);
    $('[data-mess] span').textContent = T(moved ? 'unmess' : 'mess');
    kL.forEach((el, i) => el.setAttribute('aria-valuenow', Math.round(kA[i] - (i ? kA[i - 1] : 0))));
  }
  function kLimits(i) {
    const last = kA.length - 1, prev = i > 0 ? kA[i - 1] : null, next = i < last ? kA[i + 1] : null;
    // a pair may close up only until its glyphs would touch (kMin), and open up to +420
    const lo = Math.max(prev === null ? -Infinity : prev + kMin[i], next === null ? -Infinity : next - 420, i === 0 ? px2u(-kP[0]) : -Infinity);
    const hi = Math.min(prev === null ? Infinity : prev + 420, next === null ? Infinity : next - kMin[i + 1], i === last ? px2u(kRoom() - kP[i] - kWd[i]) : Infinity);
    return [lo, hi];
  }
  function bindLetter(el, i) {
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (!kReady) return;
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      gsap.killTweensOf(kAnim);
      drag = { x0: e.clientX, u0: kA[i], id: e.pointerId }; kGrab = i;
      el.classList.add('is-grabbed'); renderKern();
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const [lo, hi] = kLimits(i);
      kA[i] = Math.max(lo, Math.min(hi, drag.u0 + px2u(e.clientX - drag.x0)));
      renderKern(); kernMsg();
    });
    const up = (e) => { if (!drag || drag.id !== e.pointerId) return; drag = null; kGrab = -1; el.classList.remove('is-grabbed'); renderKern(); kernMsg(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('focus', () => { kGrab = i; renderKern(); });
    el.addEventListener('blur', () => { kGrab = -1; renderKern(); });
    el.addEventListener('keydown', (e) => {
      if (!kReady || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault(); gsap.killTweensOf(kAnim);
      const [lo, hi] = kLimits(i), d = (e.shiftKey ? 50 : 10) * (e.key === 'ArrowRight' ? 1 : -1);
      kA[i] = Math.max(lo, Math.min(hi, kA[i] + d)); renderKern(); kernMsg();
    });
  }
  function kernTo(target) {
    const from = kA.slice(); kAnim.t = 0;
    gsap.to(kAnim, { t: 1, duration: reduce ? 0 : 0.9, ease: 'expo.out', overwrite: true,
      onUpdate: () => { kA = from.map((v, i) => v + (target[i] - v) * kAnim.t); renderKern(); }, onComplete: kernMsg });
  }
  function kernMess() {
    const n = kL.length, room = Math.max(0, px2u(kRoom() - kP[n - 1] - kWd[n - 1]));
    for (let t = 0; t < 50; t++) {
      let d = kL.slice(1).map(() => (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 110));
      const shift = Math.random() * Math.min(room, 120), sum = d.reduce((s, v) => s + v, 0);
      d = d.map((v, j) => Math.max(kMin[j + 1] * 0.9, Math.min(400, v - (sum - shift) / d.length)));   // never into a collision
      const acc = d.reduce((a, v) => (a.push(a[a.length - 1] + v), a), [0]);
      if (acc[n - 1] <= room + 0.5 && d.filter((v) => Math.abs(v) >= 30).length >= Math.ceil(d.length * 0.6)) return acc.map(Math.round);
    }
    return kL.map((_, i) => Math.ceil(i / 2) * 50);   // fallback: every other pair opened by 50, none closed
  }
  $('[data-mess]').addEventListener('click', () => kernTo(messed ? kL.map(() => 0) : kernMess()));
  // the word closes up as the section scrolls into view (smoothstep, like the reference)
  function kernProgress() {
    const top = geo.kernTop - scrollPos(), n = Math.max(0, Math.min(1, (innerHeight * 0.9 - top) / (innerHeight * 0.5)));
    return n * n * (3 - 2 * n);
  }
  function applyKernW(w) {
    kW = w; const ready = kW >= 0.999;
    if (ready !== kReady) { kReady = ready; det.classList.toggle('kern-ready', ready); kL.forEach((el) => (el.tabIndex = ready ? 0 : -1)); }
    renderKern();
  }
  function setKernProgress(instant) {
    if (!kL.length) return;
    const t = reduce ? 1 : kernProgress();
    if (instant || still || reduce) { gsap.killTweensOf(kState); kState.w = t; applyKernW(t); return; }
    if (Math.abs(t - kState.w) < 0.0005) return;
    gsap.to(kState, { w: t, duration: 0.7, ease: 'power3.out', overwrite: true, onUpdate: () => applyKernW(kState.w) });
  }
  function buildGuides() {
    if (!guidesOn) return;
    const cs = getComputedStyle(kern), F = parseFloat(cs.fontSize);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${F}px ${cs.fontFamily}`;
    const mx = ctx.measureText('x'), fa = mx.fontBoundingBoxAscent, fd = mx.fontBoundingBoxDescent;
    const dr = det.getBoundingClientRect(), kr = kern.getBoundingClientRect();
    const base = kr.top - dr.top + (F - (fa + fd)) / 2 + fa;
    // each label sits on the side of its line where there is no ink (above the ascender, the
    // x-height and the descender; under the baseline), so letters never run through a label
    const lines = [
      ['Ascender', base - ctx.measureText('k').actualBoundingBoxAscent, ['LU', 'LD', 'RU', 'RD']],
      ['X-height', base - mx.actualBoundingBoxAscent, ['LU', 'RU', 'LD', 'RD']],
      ['Baseline', base, ['LD', 'RD', 'LU', 'RU']],
      ['Descender', base + ctx.measureText('g').actualBoundingBoxDescent, ['LU', 'RU', 'LD', 'RD']]
    ];
    guides.innerHTML = lines.map(([n, y]) => `<div class="g" style="top:${y}px"><b class="mono">${n}</b></div>`).join('');
    const gs = $$('.g', guides);
    gLab = lines.map(([, y, pref], i) => { const b = gs[i].firstElementChild; return { el: b, y, pref, w: b.offsetWidth, h: b.offsetHeight, x0: gs[i].offsetLeft, x1: gs[i].offsetLeft + gs[i].offsetWidth }; });
    gStatic = $$('.details__a, .details__b, .details__hint, .details__mess, .details__show, .details .label').map((el) => { const r = el.getBoundingClientRect(); return [r.left - dr.left, r.top - dr.top, r.right - dr.left, r.bottom - dr.top]; });
    placeGuideLabels();
  }

  /* ---------- footer: a small physics world of stamps ----------
     Bouncy stamps fall onto the words. The cursor is an invisible heavy disc that shoves them,
     you can grab one to drag and throw it (a quick click flicks it up), and on phones the tilt
     of the device sets gravity. Constants follow the reference: g 1100 px/s², bounce .65. */
  const foot = $('[data-foot]'), footIn = $('[data-foot-in]'), wrap = $('[data-badges]');
  let bodies = [], boxes = [], floorY = 0, ceilY = 0, barY = 0, simOn = false, started = false, raf = 0;
  const PH = { g: 1100, rest: 0.65 };
  const grav = { x: 0, y: 1 };
  const ptr = { x: -9999, y: -9999, in: false };
  const pusher = { x: -9999, y: -9999, vx: 0, vy: 0, r: 40, on: false };
  let held = null;
  // footer position on screen, from cached geometry + the parallax value GSAP holds (no layout reads)
  const fTopNow = () => geo.footTop - scrollPos();
  const fiTopNow = () => fTopNow() + ((+gsap.getProperty(footIn, 'yPercent') || 0) * geo.footH) / 100;
  const toFoot = (e) => ({ x: e.clientX - (geo.footLeft || 0), y: e.clientY - fiTopNow() });
  document.addEventListener('pointermove', (e) => {
    if (!started) return;
    const p = toFoot(e), fTop = fTopNow();
    ptr.x = p.x; ptr.y = p.y;
    ptr.in = e.pointerType === 'mouse' && e.clientY >= Math.max(fTop, 0) && e.clientY <= fTop + geo.footH;
    if (held && held.id === e.pointerId) { held.moved += Math.hypot(p.x - held.lx, p.y - held.ly); held.lx = p.x; held.ly = p.y; }
    if ((ptr.in || held) && !simOn) run();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { ptr.in = false; });
  function grab(el) {
    el.addEventListener('pointerdown', (e) => {
      const b = el.__body; if (!b || !b.on) return;
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
      const p = toFoot(e);
      held = { b, ox: p.x - b.x, oy: p.y - b.y, id: e.pointerId, moved: 0, t0: performance.now(), lx: p.x, ly: p.y };
      el.classList.add('is-held'); if (!simOn) run();
    });
    const drop = (e) => {
      if (!held || held.id !== e.pointerId) return;
      const b = held.b;
      if (held.moved < 6 && performance.now() - held.t0 < 350) {
        // a click flicks it up to 35–55% of the footer's visible height, so it stays well inside
        const h = Math.max(0, floorY - ceilY) * (0.35 + Math.random() * 0.2);
        b.vy = -Math.sqrt(2 * PH.g * h); b.vx += (Math.random() - 0.5) * 500; b.spin = (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 6);
      }
      el.classList.remove('is-held'); held = null;
    };
    el.addEventListener('pointerup', drop); el.addEventListener('pointercancel', drop);
  }
  // on phones and tablets the tilt of the device sets the direction of gravity
  if (matchMedia('(pointer: coarse)').matches && 'DeviceOrientationEvent' in window) {
    const onTilt = (e) => {
      if (e.beta == null || e.gamma == null) return;
      const bt = (e.beta * Math.PI) / 180, gm = (e.gamma * Math.PI) / 180;
      let gx = Math.sin(gm) * Math.cos(bt), gy = Math.sin(bt);
      const L = Math.hypot(gx, gy); if (L < 0.25) gy += 0.25 - L;
      grav.x += (gx * 1.1 - grav.x) * 0.15; grav.y += (gy * 1.1 - grav.y) * 0.15;
      if (started && !simOn) run();
    };
    const listen = () => addEventListener('deviceorientation', onTilt);
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      foot.addEventListener('click', () => DeviceOrientationEvent.requestPermission().then((s) => s === 'granted' && listen()).catch(() => {}), { once: true });
    } else listen();
  }
  if (!reduce) gsap.fromTo(footIn, { yPercent: -25 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: foot, start: 'top bottom', end: 'bottom bottom', scrub: true } });
  function measureFoot() {
    const fr = footIn.getBoundingClientRect();
    boxes = $$('.foot__big span').map((sp) => {
      const r = sp.getBoundingClientRect(), cs = getComputedStyle(sp.parentElement), F = parseFloat(cs.fontSize);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${cs.fontWeight} ${F}px ${cs.fontFamily}`;
      const m = ctx.measureText('H'), fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      const lh = parseFloat(cs.lineHeight) || F;
      const base = r.top - fr.top + (lh - (fa + fd)) / 2 + fa;
      return { x1: r.left - fr.left - 4, x2: r.right - fr.left + 8, y1: base - m.actualBoundingBoxAscent, y2: base };
    });
    barY = $('.foot__bar').getBoundingClientRect().top - fr.top;
    updateFloor();
  }
  // the stamps rest on the bottom edge of what is on screen, so they peek in while the footer arrives
  // and drop onto the words as it is revealed. The top of the visible footer is a ceiling: once a
  // stamp has fallen in, it can't leave the footer upwards (like the reference's top wall).
  function updateFloor() {
    const fiTop = fiTopNow(), fTop = fTopNow();
    const r = bodies.length ? bodies[0].r : 0;
    floorY = Math.min(barY, innerHeight - fiTop + r * 1.2);   // they rest just past the edge, only their tops peek in
    ceilY = Math.min(Math.max(fTop, 0) - fiTop, floorY - 2 * r);
  }
  function spawn() {
    started = true;
    measureFoot();
    wrap.innerHTML = '';
    const R = rng(21), W = foot.clientWidth;
    const probe = document.createElement('div'); probe.className = 'badge'; wrap.appendChild(probe);
    const r = probe.offsetWidth / 2; probe.remove();
    const N = mobile() ? 8 : 15, kinds = ['w', 'o', 'k', 'o', 'k', 'w', 'k', 'o', 'k', 'w', 'k', 'o', 'k', 'o', 'w'];
    bodies = [];
    for (let i = 0; i < N; i++) {
      const el = document.createElement('div');
      el.className = `badge badge--${kinds[i % kinds.length]}`;
      el.innerHTML = '<svg viewBox="0 0 100 100"><use href="#reg"/></svg>';
      wrap.appendChild(el);
      // first two drop on the left, the rest cascade towards the right edge
      const fx = i < 2 ? 0.02 + i * 0.06 + R() * 0.03 : 0.28 + 0.72 * (((i - 2) * 0.618) % 1) + (R() - 0.5) * 0.06;
      el.style.visibility = 'hidden';
      const body = { el, r, x: r + (W - 2 * r) * fx, y: 0, vx: (R() - 0.5) * 160, vy: 0, a: R() * 6.28, spin: 0, on: false, jit: R() * 60 };
      el.__body = body; grab(el);
      bodies.push(body);
    }
    bodies.sort((a, b) => a.x - b.x);   // released left to right as the footer comes up
    bodies.forEach((b, i) => { b.el.className = `badge badge--${kinds[i % kinds.length]}`; });  // a white one leads
    release();
  }
  // stamps are released in proportion to how much of the footer is on screen
  function release() {
    const fTop = fTopNow(), revealed = 1 - fTop / geo.footH;
    const want = Math.min(bodies.length, Math.ceil(bodies.length * Math.min(1, Math.max(0, revealed - 0.05) * 1.3)));
    const top = Math.max(fTop, 0) - fiTopNow();  // top of the visible part, in footer coords
    let n = 0, added = false;
    for (const b of bodies) {
      if (b.on) { n++; continue; }
      if (n >= want) break;
      b.on = true; n++; added = true;
      b.y = top - b.r - b.jit - (n % 4) * b.r * 0.9; b.vy = 0; b.in = false;   // falls in from above the edge
      b.el.style.visibility = '';
    }
    if (added || !simOn) run();
  }
  function run() {
    simOn = true; cancelAnimationFrame(raf); let last = performance.now(), acc = 0, calm = 0;
    const loop = (now) => {
      acc += Math.min(0.05, (now - last) / 1000); last = now;
      updateFloor();
      while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
      let maxV = 0;
      for (const b of bodies) { if (!b.on) continue; maxV = Math.max(maxV, Math.abs(b.vx) + Math.abs(b.vy)); b.el.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px) rotate(${b.a}rad)`; }
      calm = maxV < 14 && !held && !ptr.in ? calm + 1 : 0;   // keeps running while the cursor is over the footer
      if (calm < 90) raf = requestAnimationFrame(loop); else simOn = false;
    };
    raf = requestAnimationFrame(loop);
  }
  // bounce only on real impacts; slow contacts just settle (keeps resting piles still)
  const bounce = (v) => (Math.abs(v) > 90 ? 1 + PH.rest : 1);
  function step(dt) {
    const W = foot.clientWidth;
    const live = bodies.filter((b) => b.on);
    // the invisible cursor disc chases the pointer with a capped speed
    if (ptr.in && !held) {
      if (!pusher.on) { pusher.x = ptr.x; pusher.y = ptr.y; pusher.on = true; }
      let vx = (ptr.x - pusher.x) * 30, vy = (ptr.y - pusher.y) * 30;
      const sp = Math.hypot(vx, vy); if (sp > 3600) { vx *= 3600 / sp; vy *= 3600 / sp; }
      pusher.vx = vx; pusher.vy = vy; pusher.x += vx * dt; pusher.y += vy * dt;
    } else pusher.on = false;
    for (const b of live) {
      if (held && held.b === b) {
        // grabbed: a spring pulls the stamp to the pointer (like a mouse constraint)
        const tx = held.lx - held.ox, ty = held.ly - held.oy;
        b.vx += ((tx - b.x) * 30 - b.vx) * 0.5; b.vy += ((ty - b.y) * 30 - b.vy) * 0.5;
      } else { b.vx += PH.g * grav.x * dt; b.vy += PH.g * grav.y * dt; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.999; b.vy *= 0.999;
    }
    for (let it = 0; it < 4; it++) {
      for (const b of live) {
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.5; }
        if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.5; }
        if (!b.in) { if (b.y - b.r >= ceilY - 1) b.in = true; }
        else if (b.y < ceilY + b.r) { b.y = ceilY + b.r; b.vy = Math.abs(b.vy) * 0.5; }
        if (b.y > floorY - b.r) { b.y = floorY - b.r; if (b.vy > 0) b.vy = b.vy > 90 ? -b.vy * PH.rest : 0; b.vx *= 0.97; }
        for (const k of boxes) {
          const qx = Math.max(k.x1, Math.min(b.x, k.x2)), qy = Math.max(k.y1, Math.min(b.y, k.y2));
          let dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
          if (d2 < b.r * b.r) {
            let d = Math.sqrt(d2), nx, ny;
            if (d < 0.001) { nx = 0; ny = -1; d = 0; } else { nx = dx / d; ny = dy / d; }
            const pen = b.r - d; b.x += nx * pen; b.y += ny * pen;
            const vn = b.vx * nx + b.vy * ny;
            if (vn < 0) { const k2 = bounce(vn); b.vx -= k2 * vn * nx; b.vy -= k2 * vn * ny; b.vx *= 0.97; }
          }
        }
        if (pusher.on && !(held && held.b === b)) {
          const dx = b.x - pusher.x, dy = b.y - pusher.y, d = Math.hypot(dx, dy), m = b.r + pusher.r;
          if (d < m && d > 0.001) {
            const nx = dx / d, ny = dy / d; b.x += nx * (m - d); b.y += ny * (m - d);
            const rel = (b.vx - pusher.vx) * nx + (b.vy - pusher.vy) * ny;
            if (rel < 0) { b.vx -= 1.4 * rel * nx; b.vy -= 1.4 * rel * ny; b.spin += (pusher.vx * ny - pusher.vy * nx) * 0.004; }
          }
        }
      }
      for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
        if (d < m && d > 0.001) {
          const nx = dx / d, ny = dy / d, pen = (m - d) / 2;
          a.x -= nx * pen; a.y -= ny * pen; b.x += nx * pen; b.y += ny * pen;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) { const imp = (-bounce(rel) * rel) / 2; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; }
        }
      }
    }
    for (const b of live) { b.a += (b.vx * dt) / b.r + b.spin * dt; b.spin *= 0.985; }
  }
  function checkFooter() {
    if (!geo.sh) return;                                    // not measured yet (scroll restored before boot)
    const revealed = 1 - fTopNow() / geo.footH;           // 0 when the footer starts to show, 1 when it fills the screen
    html.classList.toggle('at-foot', revealed > 0.85);
    if (!started && revealed > 0.02) spawn();
    else if (started && revealed > 0) release();            // more footer on screen: drop more stamps, let the pile settle lower
    if (started && revealed < -0.6) { started = false; cancelAnimationFrame(raf); wrap.innerHTML = ''; bodies = []; }
  }
  function resetBadges() { if (started) spawn(); }

  /* ---------- menu, grid toggle, anchors ---------- */
  const menuBtn = $('[data-menu-btn]'), menu = $('[data-menu]');
  const setMenu = (open) => {
    html.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open); menu.setAttribute('aria-hidden', !open);
    if (open) { html.classList.remove('hdr-hidden'); lenis && lenis.stop(); gsap.fromTo('.menu__nav a', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.25 }); }
    else lenis && lenis.start();
  };
  menuBtn.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  /* ---------- system view: grid, column numbers, type guides and an inspector ----------
     Toggled by the eye button, "Show the guides" or the S key (Escape closes). Hovering an
     element outlines it and reports what it is, its size, its type and where it sits on the grid. */
  const sysBtn = $('[data-sys]'), showBtn = $('[data-show]');
  const insp = document.createElement('div');
  insp.className = 'sys-insp'; insp.setAttribute('aria-hidden', 'true');
  insp.innerHTML = '<div class="sys-insp__box"></div><div class="sys-insp__tag mono"></div>';
  document.body.appendChild(insp);
  const iBox = insp.firstElementChild, iTag = insp.lastElementChild;
  let iEl = null;
  const sysOn = () => html.classList.contains('sys-on');
  function setSystem(on) {
    html.classList.toggle('sys-on', on);
    sysBtn.setAttribute('aria-pressed', on); showBtn.setAttribute('aria-pressed', on);
    guidesOn = on; det.classList.toggle('guides-on', on);
    $('[data-show] span').textContent = T(on ? 'hide' : 'show');
    buildGuides();
    if (!on) { clearTimeout(hideT); hideT = 0; insp.classList.remove('is-on'); iEl = null; } else if (hasMouse) inspect(mx, my);
  }
  sysBtn.addEventListener('click', () => setSystem(!sysOn()));
  showBtn.addEventListener('click', () => setSystem(!sysOn()));
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 's' || e.key === 'S') setSystem(!sysOn());
    else if (e.key === 'Escape' && sysOn()) setSystem(false);
  });
  const TARGETS = '.kern__l, [data-slot], .badge, .card__img, .stage, .hl, .hello__h, .hello__intro, .hello__sub, .card__t, .card__d, .details__a, .details__b, .details__hint, .foot__big p, .foot__talk, .foot__links a, .all, .hero__p, .label, .stage__lbl, .hdr__logo, .hdr__loc, .hdr__status, .hdr__menu, .hdr__lang, .details__show, .details__mess, .menu__nav a, button, a, p, h1, h2, h3';
  const WEIGHT = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
  const kindOf = (el) => el.matches('.kern__l') ? 'Letter' : el.matches('[data-slot]') ? 'Photo slot' : el.matches('.card__img') ? 'Project picture'
    : el.matches('.badge') ? 'Stamp' : el.matches('.stage') ? 'Drawing' : el.matches('.hl, h1, h2, h3, .card__t, .details__a, .details__b, .foot__big p, .menu__nav a') ? 'Heading'
    : el.matches('button') ? 'Button' : el.matches('a') ? 'Link' : el.matches('.label, .stage__lbl, .mono') ? 'Label' : 'Text';
  function gridInfo(r) {
    const rem = parseFloat(getComputedStyle(html).fontSize), pad = (mobile() ? 1.6 : 2.4) * rem, cols = mobile() ? 4 : 12;
    const col = (document.documentElement.clientWidth - 2 * pad) / cols;
    const lines = Array.from({ length: cols + 1 }, (_, i) => pad + i * col);
    const near = (x) => lines.reduce((b, L, i) => (Math.abs(x - L) < Math.abs(b.d) ? { d: x - L, i } : b), { d: Infinity, i: 0 });
    const a = near(r.left), b = near(r.right), off = (d) => (Math.abs(d) < 1.5 ? '' : ` (${d > 0 ? '+' : '−'}${Math.round(Math.abs(d))} px)`);
    return b.i > a.i ? `Grid: cols ${a.i + 1}–${b.i}${off(a.d)}` : `Grid: on line ${a.i + 1}${off(a.d)}`;
  }
  /* The outline hugs the ink of the text, not the element's box: for each line of text it runs
     from the top of the tallest glyph to the bottom of the deepest one (display type here has a
     line-height under 1, so the box alone would cut through the letters). It is placed on every
     frame while the view is on, so it stays glued to text that scrolls, rises or is dragged. */
  const inkCtx = document.createElement('canvas').getContext('2d'), inkMemo = new WeakMap();
  const BOXED = /Photo slot|Project picture|Stamp|Drawing|Button/;
  function inkBox(el) {
    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity, n;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while ((n = walk.nextNode())) {
      const p = n.parentElement;
      if (!n.nodeValue.trim() || !p || p.closest('.sr-only, [hidden]')) continue;
      const cs = getComputedStyle(p);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const text = cs.textTransform === 'uppercase' ? n.nodeValue.toUpperCase() : n.nodeValue;
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      let m = inkMemo.get(n);
      if (!m || m.text !== text || m.font !== font) {
        inkCtx.font = font; inkCtx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
        inkCtx.wordSpacing = cs.wordSpacing === 'normal' ? '0px' : cs.wordSpacing;
        const t = inkCtx.measureText(text.trim());
        // ancestors (up to the outlined element) that clip their content, e.g. reveal masks
        const clips = [];
        for (let a = p; a; a = a === el ? null : a.parentElement) { const o = getComputedStyle(a); if (o.overflowX !== 'visible' || o.overflowY !== 'visible') clips.push(a); }
        m = { text, font, clips, fa: t.fontBoundingBoxAscent, fh: t.fontBoundingBoxAscent + t.fontBoundingBoxDescent, a: t.actualBoundingBoxAscent, d: t.actualBoundingBoxDescent, l: t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight };
        inkMemo.set(n, m);
      }
      const rg = document.createRange(); rg.selectNodeContents(n);
      const rects = [...rg.getClientRects()].filter((q) => q.width > 0.5);
      const cl = m.clips.map((c) => c.getBoundingClientRect());
      rects.forEach((q) => {
        const s = q.height / (m.fh || q.height), base = q.top + m.fa * s;   // s: any scale from transforms
        let t = base - m.a * s, b = base + m.d * s, l, r;
        if (rects.length === 1 && n.nodeValue.trim() === n.nodeValue) { l = q.left - m.l * s; r = q.left + m.r * s; } else { l = q.left; r = q.right; }
        for (const c of cl) { t = Math.max(t, c.top); b = Math.min(b, c.bottom); l = Math.max(l, c.left); r = Math.min(r, c.right); }
        if (b - t < 0.5 || r - l < 0.5) return;   // fully clipped: not on screen
        T = Math.min(T, t); B = Math.max(B, b); L = Math.min(L, l); R = Math.max(R, r);
      });
    }
    return L < R ? { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T } : null;
  }
  const boxOf = (el, kind) => (!BOXED.test(kind) && inkBox(el)) || el.getBoundingClientRect();
  let iKind = '', iTagW = 0, iTagH = 0;
  // the text of the tag is written once per element; its position follows every frame
  function describe() {
    const kind = (iKind = kindOf(iEl)), r = boxOf(iEl, kind), lay = iEl.getBoundingClientRect();
    const cs = getComputedStyle(iEl.matches('.hl') ? iEl.firstElementChild : iEl);   // a hero line's type lives on its inner span
    const lines = [`${kind} · ${Math.round(r.width)} × ${Math.round(r.height)} px`];
    if (!/Photo slot|Project picture|Stamp|Drawing/.test(kind)) {
      const fs = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0, lh = parseFloat(cs.lineHeight);
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '');
      lines.push(`${fam} ${WEIGHT[Math.round(+cs.fontWeight / 100) * 100] || cs.fontWeight} · ${Math.round(fs)} px${lh ? ` / ${Math.round(lh)}` : ''}${ls ? ` · ${ls < 0 ? '−' : '+'}${Math.abs((ls / fs) * 100).toFixed(1)}%` : ''}`);
    }
    lines.push(kind === 'Letter' ? 'Spaced by eye, not by the grid' : gridInfo(lay));   // grid: where the element is placed
    iTag.innerHTML = lines.map((l) => `<span>${esc(l)}</span>`).join('');
    iTagW = iTag.offsetWidth; iTagH = iTag.offsetHeight;
  }
  function placeInsp() {
    if (!iEl || !sysOn()) return;
    if (!iEl.isConnected) { insp.classList.remove('is-on'); iEl = null; return; }
    const r = boxOf(iEl, iKind);
    iBox.style.cssText = `left:${r.left.toFixed(1)}px;top:${r.top.toFixed(1)}px;width:${r.width.toFixed(1)}px;height:${r.height.toFixed(1)}px`;
    let ty = r.bottom + 6; if (ty + iTagH > innerHeight - 8) ty = r.top - iTagH - 6;
    iTag.style.left = `${Math.min(Math.max(8, r.left), innerWidth - iTagW - 8).toFixed(1)}px`;
    iTag.style.top = `${Math.min(Math.max(8, ty), innerHeight - iTagH - 8).toFixed(1)}px`;
    insp.classList.add('is-on');
  }
  gsap.ticker.add(placeInsp);   // returns at once unless the system view is on and something is outlined
  // crossing the small gaps between header items doesn't blink the outline off and on
  let hideT = 0;
  function inspect(x, y) {
    if (!sysOn()) return;
    // while a letter or a stamp is held, the outline stays on it even if the pointer runs past it
    const held1 = (kGrab >= 0 && kL[kGrab]) || (held && held.b && held.b.el);
    const hit = held1 ? null : document.elementFromPoint(x, y), el = held1 || (hit && hit.closest(TARGETS));
    if (!el || el.closest('.sys, .sys-insp')) {
      if (iEl && !hideT) hideT = setTimeout(() => { hideT = 0; insp.classList.remove('is-on'); iEl = null; }, 120);
      return;
    }
    clearTimeout(hideT); hideT = 0;
    if (el === iEl) return;
    iEl = el; describe(); placeInsp();
  }
  document.addEventListener('pointermove', (e) => e.pointerType === 'mouse' && inspect(e.clientX, e.clientY), { passive: true });
  if (lenis) lenis.on('scroll', () => sysOn() && hasMouse && inspect(mx, my));
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); return; }
    const t = id === '#top' ? 0 : $(id);
    if (t === null) return;
    e.preventDefault(); setMenu(false); scrollTo(t);
  }));

  /* ---------- boot ---------- */
  const boot = () => {
    applyLang(lang, true);
    setupWords(true);
    placeScribble();
    intro();
    ScrollTrigger.refresh();
    onScroll();
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
  addEventListener('resize', () => { placeScribble(); measureKern(); setKernProgress(true); buildGuides(); if (started) { measureFoot(); } });
})();
