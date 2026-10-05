// DOM user interface: screens, HUD, action sheets, chat, creator panel, mobile joystick.
import { SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, HAIR_STYLES, FACES, TOPS, BOTTOMS, SHOES } from './avatar.js';

const $ = (id) => document.getElementById(id);
export const TRAITS = {
  bookworm: ['Bookworm', 'Learns faster in lectures and the library, but Social drops quicker.'],
  social: ['Social butterfly', 'Friendships grow fast and Social stays high. Study gains are smaller.'],
  hustler: ['Hustler', 'Earns more from side hustles. Hunger drains faster.'],
  prayer: ['Prayer warrior', 'Stress recovers faster at the chapel or mosque. Fun drains a bit faster.'],
  sleeper: ['Heavy sleeper', 'Energy recovers more in bed, but you sometimes miss morning lectures.'],
};

export class UI {
  constructor() {
    this.onChat = null; this.onEmote = null; this.onMic = null; this.joy = { x: 0, y: 0, active: false }; this.runToggle = false;
    $('chatform').addEventListener('submit', (e) => { e.preventDefault(); const v = $('chatinput').value.trim(); if (v) { this.onChat?.(v); $('chatinput').value = ''; } $('chatinput').blur(); });
    document.querySelectorAll('[data-emote]').forEach((b) => b.addEventListener('click', () => this.onEmote?.(b.dataset.emote)));
    $('btn-mic').addEventListener('click', () => this.onMic?.());
    $('btn-needs').addEventListener('click', () => $('panel').classList.toggle('on'));
    $('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet' && this.sheetDismissable) this.closeSheet(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Enter' && document.activeElement !== $('chatinput') && $('s-game').classList.contains('on') && !$('sheet').classList.contains('on')) { $('chatinput').focus(); e.preventDefault(); } if (e.key === 'Escape') { $('chatinput').blur(); if (this.sheetDismissable) this.closeSheet(); } });
    this._joystick();
    $('btn-run').addEventListener('click', () => { this.runToggle = !this.runToggle; $('btn-run').classList.toggle('on', this.runToggle); });
    if (matchMedia('(pointer:fine)').matches) $('panel').classList.add('on');
  }
  _joystick() {
    const joy = $('joy'), knob = $('knob'); let id = null; const R = 45;
    const set = (dx, dy) => { const d = Math.hypot(dx, dy); const k = d > R ? R / d : 1; dx *= k; dy *= k; knob.style.transform = `translate(${dx}px,${dy}px)`; this.joy.x = dx / R; this.joy.y = dy / R; };
    joy.addEventListener('pointerdown', (e) => { id = e.pointerId; joy.setPointerCapture(id); this.joy.active = true; const r = joy.getBoundingClientRect(); set(e.clientX - r.left - 60, e.clientY - r.top - 60); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; const r = joy.getBoundingClientRect(); set(e.clientX - r.left - 60, e.clientY - r.top - 60); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; this.joy.active = false; this.joy.x = this.joy.y = 0; knob.style.transform = ''; };
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  }
  show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }
  loading(frac, msg) { $('loadbar').style.width = Math.round(frac * 100) + '%'; if (msg) $('loadmsg').textContent = msg; }
  toast(m) { const t = $('toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(t._x); t._x = setTimeout(() => (t.style.display = 'none'), 2600); }
  prompt(text, key = 'E') { const p = $('prompt'); if (!text) { p.hidden = true; $('btn-act').hidden = true; return; } p.hidden = false; p.innerHTML = `<kbd>${key}</kbd>${text}`; $('btn-act').hidden = false; $('btn-act').textContent = text; }
  setOnline(n) { $('t-online').textContent = '● ' + n + (n === 1 ? ' on campus' : ' on campus'); }

  openSheet(html, dismissable = true) { $('sheet-in').innerHTML = html; $('sheet').classList.add('on'); this.sheetDismissable = dismissable; $('chatinput').blur(); }
  closeSheet() { $('sheet').classList.remove('on'); }
  sheetOpen() { return $('sheet').classList.contains('on'); }
  actList(title, sub, acts, dismissable = true) {
    this.openSheet(`<h3>${title}</h3><div class="sub">${sub || ''}</div><div class="acts">${acts.map((a, i) => `<button class="act" data-i="${i}" ${a.off ? 'disabled' : ''}><span><b>${a.l}</b><small>${a.s || ''}</small></span><em class="${a.c && String(a.c).startsWith('-') ? 'cost' : ''}">${a.c || ''}</em></button>`).join('')}</div>${dismissable ? '<button class="ghost" id="sheet-close">Close</button>' : ''}`, dismissable);
    document.querySelectorAll('#sheet-in .act').forEach((b) => (b.onclick = () => { this.closeSheet(); acts[+b.dataset.i].f(); }));
    const c = $('sheet-close'); if (c) c.onclick = () => this.closeSheet();
  }
  choices(title, text, opts, onPick) {
    this.openSheet(`<div class="quiz"><h3>${title}</h3><p class="q">${text}</p><div class="choices">${opts.map((o, i) => `<button class="act" data-i="${i}"><span><b>${o}</b></span></button>`).join('')}</div></div>`, false);
    document.querySelectorAll('#sheet-in .act').forEach((b) => (b.onclick = () => { onPick(+b.dataset.i); }));
  }

  addChat(name, text, cls = '') { const l = $('chatlog'); const d = document.createElement('div'); if (cls) d.className = cls; d.innerHTML = name ? `<b>${esc(name)}:</b> ${esc(text)}` : esc(text); l.appendChild(d); while (l.children.length > 60) l.firstChild.remove(); l.scrollTop = l.scrollHeight; }
  setMic(on) { const b = $('btn-mic'); b.classList.toggle('on', on); b.textContent = on ? '🎤 Voice on' : '🎤 Voice off'; }

  renderHUD(S, extra) {
    $('t-week').textContent = S.week; $('t-day').textContent = DAYS[S.day]; $('t-time').textContent = hhmm(S.hour);
    $('t-phase').textContent = extra.phase; $('t-money').textContent = S.money.toLocaleString();
    $('g-name').textContent = S.av.name; $('g-sub').textContent = TRAITS[S.trait][0] + (extra.loc ? ' · ' + extra.loc : ' · Walking around');
    $('g-needs').innerHTML = NEEDS.map(([k, l]) => { const v = Math.round(S.needs[k]); const c = v < 25 ? 'b' : v < 50 ? 'w' : ''; return `<div class="need"><span>${l}</span><div class="bar"><i class="${c}" style="width:${v}%"></i></div><span>${v}</span></div>`; }).join('');
    $('g-courses').innerHTML = COURSES.map((c, i) => `<div class="course"><span>${c}</span><div class="bar"><i style="width:${Math.round(S.know[i])}%"></i></div></div>`).join('');
    $('g-inv').innerHTML = S.items.length ? S.items.map((i) => `<span>${i}</span>`).join('') : '<span style="color:var(--muted)">Empty</span>';
    const r = S.rec; $('g-rec').textContent = `Dinners ${r.dinners}/3 · Lectures ${r.lectures} attended, ${r.lecturesMissed} missed · Portfolio ${r.portfolio.length}/2 · Moot ${r.moot ?? '–'} · Mock ${r.mock === null ? '–' : r.mock + '%'} · Externship ${r.court + r.firm} days`;
    $('g-log').innerHTML = S.log.slice(0, 8).map((e) => `<div class="${e.hi ? 'hi' : ''}">${e.m}</div>`).join('');
  }

  // avatar creator panel
  buildCreator(cfg, extra, onChange) {
    const root = $('creator'); root.innerHTML = '';
    const opt = (label) => { const d = document.createElement('div'); d.className = 'opt'; d.innerHTML = `<label>${label}</label>`; root.appendChild(d); return d; };
    const chips = (label, list, key, get, set) => { const d = opt(label); const c = document.createElement('div'); c.className = 'chips'; list.forEach(([l, v]) => { const b = document.createElement('button'); b.className = 'chip' + (get() === v ? ' sel' : ''); b.textContent = l; b.onclick = () => { set(v); }; c.appendChild(b); }); d.appendChild(c); };
    const swatches = (label, list, get, set, allowNone) => { const d = opt(label); const c = document.createElement('div'); c.className = 'swatches'; if (allowNone) { const b = document.createElement('button'); b.className = 'sw none' + (get() == null ? ' sel' : ''); b.title = 'Original'; b.onclick = () => set(null); c.appendChild(b); } list.forEach((col) => { const b = document.createElement('button'); b.className = 'sw' + (get() === col ? ' sel' : ''); b.style.background = col; b.title = col; b.onclick = () => set(col); c.appendChild(b); }); d.appendChild(c); };
    const upd = (patch) => { onChange(patch); this.buildCreator({ ...cfg, ...patch }, extra, onChange); };
    const name = opt('Name'); const inp = document.createElement('input'); inp.maxLength = 18; inp.placeholder = 'e.g. Precious'; inp.value = cfg.name === 'Aspirant' ? '' : cfg.name; inp.oninput = () => onChange({ name: inp.value.trim() || 'Aspirant' }, true); name.appendChild(inp);
    chips('Gender', [['Female', 'f'], ['Male', 'm']], 'gender', () => cfg.gender, (v) => upd({ gender: v }));
    chips('Face', FACES[cfg.gender], 'head', () => cfg.head, (v) => upd({ head: v }));
    swatches('Skin tone', SKIN_TONES, () => cfg.skin, (v) => upd({ skin: v }));
    chips('Hair', HAIR_STYLES[cfg.gender], 'hair', () => cfg.hair, (v) => upd({ hair: v }));
    swatches(cfg.hair === 'proc:cap' ? 'Cap colour' : cfg.hair === 'proc:hijab' ? 'Hijab uses your top colour · hair colour' : 'Hair colour', HAIR_COLORS, () => cfg.hairColor, (v) => upd({ hairColor: v }));
    chips('Top', TOPS[cfg.gender], 'top', () => cfg.top, (v) => upd({ top: v }));
    swatches('Top colour', OUTFIT_COLORS, () => cfg.topColor, (v) => upd({ topColor: v }), true);
    chips('Bottom', BOTTOMS[cfg.gender], 'bottom', () => cfg.bottom, (v) => upd({ bottom: v }));
    swatches('Bottom colour', OUTFIT_COLORS, () => cfg.bottomColor, (v) => upd({ bottomColor: v }), true);
    chips('Shoes', SHOES[cfg.gender], 'shoes', () => cfg.shoes, (v) => upd({ shoes: v }));
    swatches('Shoe colour', OUTFIT_COLORS, () => cfg.shoesColor, (v) => upd({ shoesColor: v }), true);
    const ex = [['Glasses', 'glasses']]; if (cfg.gender === 'm') ex.push(['Beard', 'beard'], ['Hat', 'hat']);
    const d = opt('Extras'); const c = document.createElement('div'); c.className = 'chips'; ex.forEach(([l, k]) => { const b = document.createElement('button'); b.className = 'chip' + (cfg[k] ? ' sel' : ''); b.textContent = l; b.onclick = () => upd({ [k]: !cfg[k] }); c.appendChild(b); }); d.appendChild(c);
    chips('Trait', Object.entries(TRAITS).map(([k, v]) => [v[0], k]), 'trait', () => extra.trait, (v) => { extra.trait = v; this.buildCreator(cfg, extra, onChange); });
    const n = document.createElement('div'); n.className = 'traitnote'; n.textContent = TRAITS[extra.trait][1]; root.appendChild(n);
  }

  showEnd(html) { $('end-box').innerHTML = html; this.show('s-end'); }
}
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const COURSES = ['Civil Litigation', 'Criminal Litigation', 'Corporate Law Practice', 'Property Law Practice', 'Professional Ethics & Skills'];
export const NEEDS = [['hunger', 'Hunger'], ['energy', 'Energy'], ['hygiene', 'Hygiene'], ['social', 'Social'], ['fun', 'Fun'], ['stress', 'Calm']];
export function hhmm(h) { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
