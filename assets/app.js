(() => {
  const $ = s => document.querySelector(s);
  const env = $('#env'), seal = $('#seal'), site = $('#site'), body = document.body;
  const music = $('#music'), audio = $('#audio');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = reduce ? 0.3 : 1;
  const wait = ms => new Promise(r => setTimeout(r, ms * T));

  /* ---------- laurel crest ---------- */
  function crest(svg, mono){
    const NS = 'http://www.w3.org/2000/svg', c = 100, R = 72;
    const add = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
    const a0 = 100, a1 = 250, steps = 12, rad = d => d * Math.PI / 180;
    for (const m of [1, -1]){
      const X = x => m > 0 ? x : 2 * c - x;
      let d = '';
      for (let i = 0; i <= 40; i++){ const t = rad(a0 + (a1 - a0) * i / 40); d += (i ? 'L' : 'M') + X(c + R * Math.cos(t)).toFixed(1) + ' ' + (c + R * Math.sin(t)).toFixed(1); }
      add('path', { d, fill: 'none', stroke: 'url(#foil)', 'stroke-width': 1.3 });
      for (let i = 1; i <= steps; i++){
        const k = i / (steps + 1), th = rad(a0 + (a1 - a0) * k), sz = 1 - k * 0.4;
        const px = c + R * Math.cos(th), py = c + R * Math.sin(th);
        const tx = -Math.sin(th), ty = Math.cos(th), nx = Math.cos(th), ny = Math.sin(th);
        const base = Math.atan2(ty, tx) * 180 / Math.PI - 90;
        for (const o of [1, -1]){
          const cx = px + nx * o * 5.5 * sz + tx * 3, cy = py + ny * o * 5.5 * sz + ty * 3;
          const rot = base - o * 32;
          add('ellipse', { cx: X(cx).toFixed(1), cy: cy.toFixed(1), rx: (3.2 * sz).toFixed(2), ry: (8.6 * sz).toFixed(2),
            transform: `rotate(${(m > 0 ? rot : -rot).toFixed(1)} ${X(cx).toFixed(1)} ${cy.toFixed(1)})`, fill: 'url(#foil)' });
        }
      }
      const tt = rad(a1); add('circle', { cx: X(c + R * Math.cos(tt)).toFixed(1), cy: (c + R * Math.sin(tt)).toFixed(1), r: 2.4, fill: 'url(#foil)' });
    }
    if (mono){
      const t = add('text', { x: c, y: c + 15, 'text-anchor': 'middle', 'font-family': 'Great Vibes, cursive', 'font-size': 46, fill: 'url(#foil)' });
      t.textContent = 'P&K';
    } else {
      add('path', { d: `M${c} ${c + 14}s-13-8-13-17a7 7 0 0 1 13-4 7 7 0 0 1 13 4c0 9-13 17-13 17z`, fill: 'url(#foil)' });
    }
  }
  crest($('#crest'), true);
  crest($('#crest2'), false);

  /* ---------- music ---------- */
  let ctx = null, gain = null, wired = false, playing = false;
  const MAXV = 0.55;
  function wire(){
    if (wired) return; wired = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      gain = ctx.createGain(); gain.gain.value = 0;
      src.connect(gain).connect(ctx.destination);
    } catch (e) { gain = null; }
  }
  function fade(to, secs){
    if (gain && ctx){
      const n = ctx.currentTime; gain.gain.cancelScheduledValues(n);
      gain.gain.setValueAtTime(gain.gain.value, n); gain.gain.linearRampToValueAtTime(to, n + secs);
    } else {
      const from = audio.volume, t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / (secs * 1000)); try { audio.volume = from + (to - from) * k; } catch (e) {} if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  }
  function play(){
    wire();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (gain) gain.gain.value = 0; else try { audio.volume = 0; } catch (e) {}
    const p = audio.play();
    const ok = () => { playing = true; music.classList.remove('muted'); music.setAttribute('aria-label', 'Pause music'); fade(MAXV, 4); };
    if (p && p.then) p.then(ok).catch(() => {}); else ok();
  }
  function pause(){
    playing = false; fade(0, .6);
    setTimeout(() => { if (!playing) audio.pause(); }, 650);
    music.classList.add('muted'); music.setAttribute('aria-label', 'Play music');
  }
  music.addEventListener('click', () => playing ? pause() : play());
  audio.addEventListener('error', () => music.style.display = 'none');

  /* ---------- gold sparkles ---------- */
  const cv = $('#fx'), g = cv.getContext('2d');
  let W, H, dpr, parts = [], running = false;
  const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; };
  size(); addEventListener('resize', size);
  const golds = ['#f6e7b8', '#e8d08f', '#d4b06a', '#c49a4f', '#fff7df'];
  function burst(x, y, n){
    if (reduce) n = Math.round(n / 4);
    for (let i = 0; i < n; i++){
      const a = Math.random() * Math.PI * 2, s = (Math.random() * 2.4 + .5) * dpr;
      parts.push({ x: x * dpr, y: y * dpr, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.4 * dpr, r: (Math.random() * 1.8 + .7) * dpr,
        life: 0, max: 60 + Math.random() * 60, c: golds[(Math.random() * golds.length) | 0], star: Math.random() < .4, rot: Math.random() * 6 });
    }
    if (!running){ running = true; requestAnimationFrame(tick); }
  }
  function star(x, y, r, rot){ g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
    for (let i = 0; i < 4; i++){ g.lineTo(0, -r * 2.6); g.rotate(Math.PI / 4); g.lineTo(0, -r * .6); g.rotate(Math.PI / 4); }
    g.closePath(); g.fill(); g.restore(); }
  function tick(){
    g.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.life < p.max);
    for (const p of parts){
      p.life++; p.x += p.vx; p.y += p.vy; p.vy += .04 * dpr; p.vx *= .985; p.vy *= .985; p.rot += .04;
      const k = 1 - p.life / p.max;
      g.globalAlpha = Math.max(0, Math.min(1, k * 1.4)) * (.6 + .4 * Math.sin(p.life / 4));
      g.fillStyle = p.c; g.shadowColor = '#f6e7b8'; g.shadowBlur = 8 * dpr;
      if (p.star) star(p.x, p.y, p.r, p.rot); else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    }
    if (parts.length) requestAnimationFrame(tick); else { running = false; g.clearRect(0, 0, W, H); }
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  const observeAll = () => document.querySelectorAll('.rv:not(.in)').forEach(el => io.observe(el));

  /* ---------- open ---------- */
  let opened = false;
  async function open(){
    if (opened) return; opened = true;
    play();
    const r = seal.getBoundingClientRect();
    seal.classList.add('press');
    await wait(160);
    seal.classList.remove('press');
    env.classList.add('cracked');
    burst(r.left + r.width / 2, r.top + r.height / 2, 46);
    await wait(650);
    env.classList.add('open');
    await wait(900);
    env.classList.add('flat');
    burst(innerWidth / 2, innerHeight * .25, 30);
    await wait(250);
    site.removeAttribute('aria-hidden');
    window.scrollTo(0, 0);
    env.classList.add('sliding');
    body.classList.remove('locked');
    observeAll();
    music.classList.add('show');
    await wait(1500);
    env.classList.add('gone');
  }
  seal.addEventListener('click', open);
  env.addEventListener('click', e => { if (e.target !== seal && !seal.contains(e.target)) open(); });

  $('#again').addEventListener('click', () => {
    window.scrollTo(0, 0);
    document.querySelectorAll('.rv.in').forEach(el => el.classList.remove('in'));
    env.className = 'env';
    body.classList.add('locked');
    site.setAttribute('aria-hidden', 'true');
    opened = false;
  });

  /* ---------- countdown ---------- */
  const target = new Date('2026-11-29T17:00:00+01:00').getTime();
  const cells = {}; document.querySelectorAll('#count b').forEach(b => cells[b.dataset.k] = b);
  const pad = n => String(n).padStart(2, '0');
  function count(){
    let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    cells.d.textContent = pad(d); cells.h.textContent = pad(h); cells.m.textContent = pad(m); cells.s.textContent = pad(s);
  }
  count(); setInterval(count, 1000);

  /* ---------- calendar ---------- */
  const place = 'No. 4 Joshua Madaki Close, Apo Zone E, Abuja';
  const title = 'Precious & Kristopher · Introduction Ceremony';
  $('#gcal').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) +
    '&dates=20261129T160000Z/20261129T190000Z&location=' + encodeURIComponent(place) + '&details=' + encodeURIComponent('With love, Precious & Kristopher');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PK//Invitation//EN', 'BEGIN:VEVENT', 'UID:pk-introduction-20261129',
    'DTSTAMP:20261112T000000Z', 'DTSTART:20261129T160000Z', 'DTEND:20261129T190000Z', 'SUMMARY:' + title,
    'LOCATION:' + place.replace(/,/g, '\\,'), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  $('#ical').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  const cal = $('#cal'), calBtn = $('#calBtn');
  calBtn.addEventListener('click', e => { e.stopPropagation(); const o = cal.classList.toggle('open'); calBtn.setAttribute('aria-expanded', o); });
  document.addEventListener('click', e => { if (!cal.contains(e.target)) { cal.classList.remove('open'); calBtn.setAttribute('aria-expanded', 'false'); } });

  /* ---------- map ---------- */
  const map = $('#map');
  map.querySelector('.cover').addEventListener('click', () => map.classList.add('active'));

  /* ---------- share ---------- */
  const url = location.href.split('#')[0];
  $('#share').href = 'https://wa.me/?text=' + encodeURIComponent('You have a special invitation from Precious & Kristopher ♡ Tap to open: ' + url);
})();
