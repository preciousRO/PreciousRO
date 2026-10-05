// Life sim rules: needs, the Bar Part II calendar, money, actions at each place, events, exams, the Call to Bar.
import { TRAITS, COURSES, DAYS } from './ui.js';

const HOUR_SECONDS = 24; // one game hour of real time
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

const PHASES = [[1, 'Orientation'], [2, 'Lectures begin'], [4, 'Portfolio 1 due'], [6, 'First Dinner'], [8, 'Moot Court'], [10, 'Second Dinner'], [12, 'Mock MCQ'], [13, 'Court Attachment'], [15, 'Law Firm Attachment'], [17, 'Third Dinner'], [18, 'Portfolio Assessment'], [20, 'Bar Finals']];
const SHOP = [['Indomie + egg', 700, { hunger: 28 }], ['Jollof rice & chicken', 1800, { hunger: 45, fun: 5 }], ['Suya (₦2k stick)', 2000, { hunger: 30, fun: 12 }], ['Shawarma', 2500, { hunger: 38, fun: 10 }], ['Zobo', 500, { fun: 6, stress: 4 }], ['Rechargeable fan', 12000, { item: 'Rechargeable fan' }], ['Hot plate', 9000, { item: 'Hot plate' }], ['Civil Lit textbook', 15000, { item: 'Textbook' }], ['Spare white shirt', 6000, { item: 'Spare white shirt' }], ['Data (10GB)', 4000, { item: 'Data' }]];
const EVENTS = [
  { t: 'NEPA has taken light. The hostel is a sauna.', c: [['Sleep like that', { energy: -10, stress: -8 }], ['Buy fuel for the block generator (₦2,000)', { money: -2000, social: 6 }], ['Use your rechargeable fan', { need: 'Rechargeable fan', stress: 5 }]] },
  { t: 'Bayo is collecting ₦3,000 for the class handouts. Again.', c: [['Pay', { money: -3000, knowledge: 4 }], ['Say you will pay later', { social: -4, stress: -3 }]] },
  { t: "The lecturer picks you to answer. 'Yes, the person at the back...'", c: [['Answer confidently', { knowledge: 3, stress: -4, fun: 5, roll: 'know' }], ['Mumble something about the Rules of Professional Conduct', { stress: -6, social: -2 }]] },
  { t: 'Water is not running in the hostel this morning.', c: [['Fetch from the tank downstairs', { energy: -8, hygiene: 25 }], ['Manage small water', { hygiene: 8 }], ['Skip bath and rush out', { hygiene: -5, social: -6 }]] },
  { t: 'Amaka says there is a party at the sports field tonight.', c: [['Go', { fun: 25, social: 15, energy: -15, hygiene: -10 }], ['Stay and read', { knowledge: 5, fun: -6 }]] },
  { t: "Security stopped you at the gate: 'Where is your ID card?'", c: [['Show it', { stress: 2 }], ['Beg', { stress: -8, social: -3 }]] },
  { t: 'Heavy Bwari rain. The road to the lecture hall is a river.', c: [['Run through it', { hygiene: -15, fun: 5 }], ['Wait it out', { energy: -5, stress: -3 }]] },
  { t: 'Your white shirt got a stain right before class.', c: [['Change into the spare', { need: 'Spare white shirt', stress: 4 }], ['Button the jacket and pray', { stress: -6, social: -3 }]] },
  { t: 'Mosquitoes feasted all night. You feel feverish.', c: [['Go to the clinic (₦1,500)', { money: -1500, energy: 8, stress: 5 }], ['Drink agbo and push on', { energy: -12, stress: -6 }]] },
  { t: 'Musa offers you a printing side hustle for the weekend.', c: [['Take it', { money: 4500, energy: -15, fun: -5, trait: 'hustler' }], ['No, you need to read', { knowledge: 4 }]] },
  { t: 'Ngozi wants to start a 10pm group discussion on Property Law.', c: [['Join', { knowledge: 6, social: 8, energy: -8 }], ['Sleep', { energy: 10, social: -4 }]] },
  { t: "Someone's phone rang in the lecture hall. Everyone is looking at you.", c: [['It was not me', { stress: -5 }], ['Apologise and switch it off', { stress: -8, social: 2 }]] },
];
const QUIZ = [
  ['Which body hears disciplinary cases against legal practitioners in Nigeria?', ['Legal Practitioners Disciplinary Committee', 'Body of Benchers', 'Nigerian Bar Association', 'Council of Legal Education'], 0],
  ['What is the principal legislation regulating the legal profession in Nigeria?', ['Legal Practitioners Act', 'Evidence Act', 'Companies and Allied Matters Act', 'Land Use Act'], 0],
  ['Who issues the certificate of call to the Nigerian Bar?', ['Body of Benchers', 'Supreme Court', 'Nigerian Law School', 'Chief Justice of Nigeria'], 0],
  ['Under the Land Use Act, land in a state is vested in whom?', ['The Governor', 'The President', 'The Local Government Chairman', 'The Attorney General'], 0],
  ['Which document commences a civil action by writ in the High Court?', ['Writ of summons', 'Charge sheet', 'Originating motion', 'Petition'], 0],
  ['Which body registers companies in Nigeria?', ['Corporate Affairs Commission', 'Securities and Exchange Commission', 'Central Bank of Nigeria', 'Nigerian Investment Promotion Commission'], 0],
  ['In criminal trials, the standard of proof on the prosecution is', ['Beyond reasonable doubt', 'Balance of probabilities', 'Prima facie', 'Reasonable suspicion'], 0],
  ['The Rules of Professional Conduct for Legal Practitioners currently in force were made in', ['2023', '2007', '2015', '1999'], 0],
  ['What is the minimum number of directors for a private company under CAMA 2020?', ['One', 'Two', 'Three', 'Seven'], 0],
  ['Which court has original jurisdiction in disputes between the Federation and a State?', ['Supreme Court', 'Court of Appeal', 'Federal High Court', 'National Industrial Court'], 0],
  ['A legal practitioner holding client money must keep it in a', ['Client account', 'Personal savings account', 'Chambers petty cash', 'Fixed deposit'], 0],
  ['Which court tries election petitions for the office of Governor at first instance?', ['Governorship Election Tribunal', 'Federal High Court', 'State High Court', 'Court of Appeal'], 0],
];
export const NPC_DATA = [
  { id: 'tunde', name: 'Tunde', bio: 'Reads past 2am. Knows every case on civil litigation.', tag: 'study', lines: ["'Have you read the Sheriffs and Civil Process Act? No? Hmm.'", "'I will send you my notes. Do not share them.'"] },
  { id: 'amaka', name: 'Amaka', bio: 'Knows everybody on campus and every gist before it happens.', tag: 'social', lines: ["'Babe, you heard what happened at the dinner?'", "'Come, let us go and take pictures by the gate.'"] },
  { id: 'musa', name: 'Musa', bio: 'Sells data, prints handouts and can get you anything in Bwari.', tag: 'hustle', lines: ["'Data don finish? I get 10GB for ₦3,500, no stress.'", "'If you need handout, I dey print am clean.'"] },
  { id: 'ngozi', name: 'Ngozi', bio: 'Your roommate. Organises the prayer group and group discussions.', tag: 'calm', lines: ["'Did you eat? Take, I cooked small.'", "'Prayer meeting is 9pm, please come.'"] },
  { id: 'bayo', name: 'Bayo', bio: 'Class rep. Always collecting money for something.', tag: 'info', lines: ["'Please, everybody should pay ₦2,000 for the dinner souvenir.'", "'The Dean said anybody without ID card should go home.'"] },
];
const FORMAL = new Set(['lecture', 'library', 'dining', 'court']);

export class Game {
  constructor(ui, world) { this.ui = ui; this.world = world; this.S = null; this.player = null; this.loc = null; this.eventTimer = 2 + Math.random() * 2; this.onEnd = null; this.ended = false; this.busy = false; }

  newState(av, trait) {
    return { av, trait, week: 1, day: 0, hour: 7.0, money: 85000, pos: [0, 0, 82], needs: { hunger: 80, energy: 90, hygiene: 85, social: 60, fun: 60, stress: 75 }, know: [8, 8, 8, 8, 8], items: [], friends: { tunde: 10, amaka: 10, musa: 10, ngozi: 25, bayo: 10 }, rec: { dinners: 0, lecturesMissed: 0, lectures: 0, portfolio: [], moot: null, mock: null, court: 0, firm: 0, finals: null }, log: [], flags: {} };
  }
  start(S, player) {
    this.S = S; this.player = player; this.ended = false;
    if (!S.log.length) { this.log('Welcome to Bwari. Orientation week: collect your ID card, your hostel key and your black and white wardrobe. Lectures are 9am sharp, Monday to Friday.', true); this.log('You were allocated a room with Ngozi. The bunk squeaks. ₦85,000 allowance in your account.'); }
    this.render();
  }
  log(m, hi) { this.S.log.unshift({ m, hi }); this.S.log = this.S.log.slice(0, 40); this.render(); }
  phaseName() { let p = PHASES[0][1]; for (const [w, n] of PHASES) if (this.S.week >= w) p = n; return p; }
  render() { if (!this.S) return; this.ui.renderHUD(this.S, { phase: this.phaseName(), loc: this.loc?.name }); }
  save() { try { this.S.pos = [this.player.group.position.x, 0, this.player.group.position.z]; localStorage.setItem('bwari3d', JSON.stringify(this.S)); this.ui.toast('Saved'); } catch (e) { this.ui.toast('Could not save in this browser'); } }
  static load() { try { return JSON.parse(localStorage.getItem('bwari3d')); } catch (e) { return null; } }

  mod(ch) { const S = this.S; for (const [k, v] of Object.entries(ch)) { if (k in S.needs) S.needs[k] = clamp(S.needs[k] + v); else if (k === 'money') S.money += v; else if (k === 'knowledge') S.know = S.know.map((x) => clamp(x + v)); } }
  knowAvg() { return this.S.know.reduce((a, b) => a + b, 0) / 5; }
  study(i, amt) { const t = this.S.trait; const m = t === 'bookworm' ? 1.35 : t === 'social' ? 0.8 : 1; const bonus = this.S.items.includes('Textbook') ? 1.15 : 1; this.S.know[i] = clamp(this.S.know[i] + amt * m * bonus); }
  isDinnerWeek() { return [6, 10, 17].includes(this.S.week) && !this.S.flags['dinner' + this.S.week]; }
  isExtern() { return this.S.week >= 13 && this.S.week <= 16; }
  weekday() { return this.S.day < 5; }

  // ---- time ----
  decay(hours, asleep = false) {
    const n = this.S.needs, t = this.S.trait; const k = asleep ? 0.35 : 1;
    n.hunger -= (t === 'hustler' ? 5.5 : 4.2) * hours * k; n.energy -= asleep ? 0 : (this.S.hour > 23 || this.S.hour < 5 ? 5 : 3) * hours; n.hygiene -= 2.6 * hours * k; n.social -= (t === 'bookworm' ? 2.8 : 1.8) * hours * k; n.fun -= (t === 'prayer' ? 2.6 : 2) * hours * k; n.stress -= 1.1 * hours * k;
    if (this.S.items.includes('Rechargeable fan')) n.energy += 0.4 * hours;
    for (const key of Object.keys(n)) n[key] = clamp(n[key]);
  }
  // jump the clock by some hours (actions), applying decay and day/week rollovers
  advance(hours, asleep = false) {
    const S = this.S; this.decay(hours, asleep);
    let h = S.hour + hours;
    while (h >= 24) { h -= 24; this.endOfDay(); S.day++; if (S.day > 6) { S.day = 0; S.week++; this.weekStart(); } }
    S.hour = h; this.afterTime(); this.render();
  }
  tick(dt) {
    const S = this.S; if (!S || this.ended) return; if (this.ui.sheetOpen()) return;
    const hours = dt / HOUR_SECONDS; this.decay(hours);
    S.hour += hours;
    if (S.hour >= 24) { S.hour -= 24; this.endOfDay(); S.day++; if (S.day > 6) { S.day = 0; S.week++; this.weekStart(); } }
    // missed the lecture?
    if (this.weekday() && S.hour >= 12 && !S.flags['lec' + S.week + '_' + S.day]) { S.flags['lec' + S.week + '_' + S.day] = 'missed'; S.rec.lecturesMissed++; this.log('You missed the 9am lecture. Attendance was taken.'); this.ui.toast('You missed the 9am lecture'); }
    this.eventTimer -= hours; if (this.eventTimer <= 0) { this.eventTimer = 1.6 + Math.random() * 2.4; if (Math.random() < 0.55) this.fireEvent(); }
    if (S.needs.energy <= 2) { this.log('You collapsed from exhaustion. Ngozi dragged you to bed.'); this.sleepTill(7, 40); this.mod({ stress: -10 }); }
    this.afterTime();
    this._hud = (this._hud || 0) + dt; if (this._hud > 0.5) { this._hud = 0; this.render(); }
  }
  afterTime() {
    const S = this.S, n = S.needs;
    if (n.hunger < 15 && Math.random() < 0.02) this.ui.toast('You are starving. Eat something.');
    if (n.stress < 15 && Math.random() < 0.02) { S.know = S.know.map((k) => clamp(k - 0.5)); this.ui.toast('Stress is eating your knowledge. Rest.'); }
    if (n.hygiene < 15 && Math.random() < 0.01) { Object.keys(S.friends).forEach((f) => (S.friends[f] = clamp(S.friends[f] - 2))); this.ui.toast('People are keeping their distance. Go and bath.'); }
    if (S.week > 20) this.endGame();
  }
  endOfDay() { const S = this.S; if (this.weekday() && !S.flags['lec' + S.week + '_' + S.day]) { S.flags['lec' + S.week + '_' + S.day] = 'missed'; S.rec.lecturesMissed++; } }
  weekStart() {
    const S = this.S; if (S.week % 4 === 0) { S.money += 40000; this.log('Allowance landed. ₦40,000 from home. Spend wisely.', true); }
    const ph = PHASES.find(([w]) => w === S.week); if (ph) this.log('Week ' + S.week + ': ' + ph[1] + '.', true);
    if (S.week === 4 || S.week === 18) this.log('Portfolio is due this week. Submit it at the Lecture Hall.', true);
    if ([6, 10, 17].includes(S.week)) this.log('Dinner week. Go to the Dining Hall from 6pm in your dark suit. Attendance counts.', true);
    if (S.week === 13) this.log('Externship: report at the Court every morning this week and next, then Chambers for two weeks.', true);
    if (S.week === 12) this.log('Mock MCQ at the Lecture Hall this week.', true);
    if (S.week === 20) this.log('Bar Finals this week. Go to the Lecture Hall when you are ready.', true);
    this.ui.toast('Week ' + S.week + ' · ' + this.phaseName());
  }
  sleepTill(hour, energy) {
    const S = this.S; let hours = hour - S.hour; if (hours <= 0) hours += 24;
    this.advance(hours, true); S.needs.energy = clamp(S.needs.energy + energy); S.needs.stress = clamp(S.needs.stress + 8);
  }

  // ---- places ----
  setLocation(loc) {
    if (loc?.id === this.loc?.id) return; this.loc = loc;
    this.player?.setFormal(!!loc && FORMAL.has(loc.id));
    this.ui.prompt(loc ? loc.ic + ' ' + loc.name : null);
    this.render();
  }
  interact() {
    const L = this.loc; if (!L || this.ended) return; const S = this.S; const id = L.id; const A = [];
    const go = (ch, msg, hours = 1) => () => { this.mod(ch); if (msg) this.log(msg); this.advance(hours); };
    if (id === 'gate') { A.push({ l: 'Look at the sign', s: 'Nigerian Law School, Bwari Campus', f: () => this.log('You stood under the gate. Everything you will become starts here.') }); A.push({ l: 'Take a keke to Bwari town', s: 'Thirty minutes, ₦300', c: '-₦300', off: S.money < 300, f: go({ money: -300, fun: 12, social: 4 }, 'Bwari town: noise, dust, roasted corn, peace of mind.', 2) }); }
    if (id === 'hostel') {
      A.push({ l: 'Sleep till morning', s: 'Full rest till 7am', f: () => { const t = S.trait; const over = t === 'sleeper' && Math.random() < 0.35; this.sleepTill(over ? 9.7 : 7, t === 'sleeper' ? 70 : 55); this.log(over ? 'You overslept. It is almost 10am.' : 'You slept. The bunk squeaked all night.'); } });
      A.push({ l: 'Nap', s: 'Two hours', f: go({ energy: 22 }, 'Quick nap.', 2) });
      A.push({ l: 'Bath', s: 'If water is running', f: go({ hygiene: 45 }, 'Cold bucket bath. You are awake now.', 0.5) });
      A.push({ l: 'Cook Indomie', s: 'Needs hot plate', off: !S.items.includes('Hot plate'), f: go({ hunger: 30, fun: 4 }, 'Indomie, two eggs, plenty pepper.', 0.5) });
      A.push({ l: 'Read on your bunk', s: 'Pick a course · 2 hours', f: () => this.courseSheet(6, 'Read in the hostel', 'You read till your eyes hurt.', 2) });
      A.push({ l: 'Scroll your phone', s: 'Needs data', off: !S.items.includes('Data'), f: go({ fun: 18, social: 6, energy: -3 }, 'Two hours of videos and law school memes.', 2) });
    }
    if (id === 'lecture') {
      const key = 'lec' + S.week + '_' + S.day;
      if (S.week >= 20) A.push({ l: 'Sit Bar Finals', s: 'This is it. One attempt.', c: 'FINAL', f: () => this.barFinals() });
      if (this.weekday() && S.hour >= 8 && S.hour < 12 && !S.flags[key]) A.push({ l: 'Attend the 9am lecture', s: 'Three hours. Dress code checked.', f: () => this.attendLecture(key) });
      else if (this.weekday() && S.flags[key] === 'done') A.push({ l: 'Lecture attended today', s: 'Come back tomorrow morning', off: true, f: () => {} });
      else A.push({ l: 'No lecture now', s: 'Lectures hold Mon to Fri, 9am to 12pm', off: true, f: () => {} });
      if ((S.week === 4 || S.week === 18) && !S.flags['pf' + S.week]) A.push({ l: 'Submit portfolio', s: 'Your drafted documents for assessment', c: 'DUE', f: () => this.portfolio() });
      if (S.week === 8 && !S.flags.moot) A.push({ l: 'Moot court session', s: 'Argue before the bench', c: 'EVENT', f: () => this.moot() });
      if (S.week === 12 && !S.flags.mock) A.push({ l: 'Mock MCQ', s: 'Practice exam, 6 questions', c: 'EVENT', f: () => this.quiz(6, 'Mock MCQ', (sc) => { S.rec.mock = sc; S.flags.mock = 1; this.log('Mock result: ' + sc + '%. ' + (sc >= 50 ? 'On track.' : 'Wake up.'), true); this.advance(1); }) });
      A.push({ l: 'Group discussion', s: 'With coursemates · 2 hours', f: () => { this.study(rnd(5), 7); this.mod({ social: 12, energy: -6 }); this.log('Group discussion. Tunde argued with everybody.'); this.advance(2); } });
    }
    if (id === 'library') {
      A.push({ l: 'Read seriously', s: 'Pick a course · 3 hours', f: () => this.courseSheet(14, 'Library session', 'Library. AC on full blast, no noise.', 3) });
      A.push({ l: 'Past questions', s: 'All courses, small gains · 2 hours', f: () => { S.know = S.know.map((k) => clamp(k + 3)); this.mod({ energy: -8, fun: -4 }); this.log('Past questions. The patterns are starting to make sense.'); this.advance(2); } });
      A.push({ l: 'Nap on the desk', s: 'Everybody does it', f: go({ energy: 15, stress: 4 }, 'You slept on Criminal Litigation. The librarian did not notice.', 1) });
    }
    if (id === 'caf') { A.push({ l: 'Rice and stew', c: '-₦1,200', off: S.money < 1200, f: go({ hunger: 40, money: -1200 }, 'Rice, stew, one meat. Fair.', 0.7) }); A.push({ l: 'Beans and plantain', c: '-₦1,000', off: S.money < 1000, f: go({ hunger: 38, money: -1000, fun: 4 }, 'Beans and dodo. Comfort.', 0.7) }); A.push({ l: 'Eat with coursemates', c: '-₦1,500', off: S.money < 1500, f: go({ hunger: 40, money: -1500, social: 14, fun: 6 }, "Lunch gist. Bayo's rumours are wild.", 1) }); }
    if (id === 'buka') { A.push({ l: 'Open the Bwari Junction shop', s: 'Food, drinks and gadgets', f: () => this.shop() }); A.push({ l: 'Walk the market', s: 'Fresh air, cheap fun', f: go({ fun: 12, social: 6, energy: -6 }, 'You walked round Bwari market and bought nothing.', 1) }); A.push({ l: 'Print handouts for people', s: 'Side hustle · 3 hours', f: () => { const m = S.trait === 'hustler' ? 6000 : 4000; this.mod({ money: m, energy: -14, fun: -4 }); this.log('Printing hustle. ₦' + m.toLocaleString() + ' in your pocket.'); this.advance(3); } }); }
    if (id === 'dining') { if (this.isDinnerWeek() && S.hour >= 18 && S.hour < 22) A.push({ l: 'Attend formal dinner', s: 'Dark suit, grace before meals, speeches', c: 'EVENT', f: () => this.dinner() }); else A.push({ l: this.isDinnerWeek() ? 'Dinner starts at 6pm' : 'Dining Hall is closed', s: 'Opens on dinner weeks (6, 10, 17), 6pm to 10pm', off: true, f: () => {} }); }
    if (id === 'chapel' || id === 'mosque') { const m = S.trait === 'prayer' ? 1.6 : 1; A.push({ l: 'Pray / reflect', f: go({ stress: Math.round(22 * m), fun: 4 }, 'Peace. Bwari is quiet at this hour.', 1) }); A.push({ l: id === 'chapel' ? 'Fellowship' : "Jama'a", f: go({ stress: Math.round(14 * m), social: 14 }, 'Ngozi introduced you to half the fellowship.', 1.5) }); }
    if (id === 'sports') { A.push({ l: 'Play football', f: go({ fun: 22, energy: -18, hygiene: -15, social: 8 }, 'Sweaty. Happy.', 1.5) }); A.push({ l: 'Evening walk and gist', f: go({ fun: 10, social: 10, stress: 6 }, 'You walked the field with coursemates.', 1) }); A.push({ l: 'Weekend party', s: 'Friday to Sunday, from 8pm', off: S.day < 4 || S.hour < 20, f: go({ fun: 30, social: 18, energy: -20, hygiene: -10 }, 'Party at the field. Somebody did Oyinbo DJ.', 3) }); }
    if (id === 'clinic') { A.push({ l: 'Malaria treatment', c: '-₦3,500', off: S.money < 3500, f: go({ money: -3500, energy: 25, stress: 10 }, 'Three days of drugs. You feel human again.', 1) }); A.push({ l: 'Vitamin C and rest', c: '-₦800', off: S.money < 800, f: go({ money: -800, energy: 10 }, 'Nurse said drink water.', 0.5) }); }
    if (id === 'court') { if (this.isExtern() && this.weekday() && S.hour >= 8 && S.hour < 14 && !S.flags['ext' + S.week + '_' + S.day]) { const court = S.week < 15; A.push({ l: court ? 'Court attachment session' : 'Chambers attachment session', s: court ? "Sit in court, take notes, carry the judge's files" : 'Draft letters and watch the principal', c: 'EVENT', f: () => { S.flags['ext' + S.week + '_' + S.day] = 1; if (court) S.rec.court++; else S.rec.firm++; this.study(court ? 0 : 2, 8); this.study(court ? 1 : 3, 8); this.mod({ energy: -14, hygiene: -6, stress: -4, social: 5 }); this.log(court ? 'Court day ' + S.rec.court + '. The judge adjourned twice.' : 'Chambers day ' + S.rec.firm + '. Your principal corrected your draft in red ink.'); this.advance(4); } }); } else A.push({ l: 'Closed to aspirants', s: 'Externship runs weeks 13 to 16, weekday mornings', off: true, f: () => {} }); }
    this.ui.actList(L.ic + ' ' + L.name, L.sub, A);
  }
  courseSheet(amt, title, msg, hours) { this.ui.actList(title, 'Which course?', COURSES.map((c, i) => ({ l: c, c: Math.round(this.S.know[i]) + '%', f: () => { this.study(i, amt); this.mod({ energy: -5 * hours, fun: -3 }); this.log(msg + ' (' + c + ')'); this.advance(hours); } }))); }
  attendLecture(key) {
    const S = this.S; S.flags[key] = 'done';
    if (S.needs.hygiene < 20) { this.mod({ social: -8 }); this.log('You went to class unwashed. Someone moved seat.'); }
    S.rec.lectures++; const i = (S.day + S.week) % 5; this.study(i, 9); this.mod({ energy: -10, fun: -4, stress: -3, social: 4 });
    this.log('Lecture: ' + COURSES[i] + '. ' + pick(["The lecturer said 'this is a bar finals question'.", 'Someone fell asleep in row 3.', 'Ethics lecturer told a story about a struck off lawyer.', 'Three hours. Your hand is tired from writing.']));
    const end = Math.max(12, S.hour + 3); this.advance(end - S.hour);
  }
  shop() { const S = this.S; this.ui.actList('🔥 Bwari Junction', 'Everything is negotiable except the price', SHOP.map(([n, p, ch]) => ({ l: n, c: '-₦' + p.toLocaleString(), off: S.money < p || (ch.item && S.items.includes(ch.item)), f: () => { S.money -= p; if (ch.item) { S.items.push(ch.item); this.log('Bought ' + ch.item + '.'); } else { this.mod(ch); this.log('Had ' + n + ' at the junction.'); } this.render(); this.shop(); } }))); }

  // ---- people ----
  talk(npc) {
    const S = this.S; const n = NPC_DATA.find((x) => x.id === npc.id); const f = S.friends[n.id]; const g = S.trait === 'social' ? 1.5 : 1;
    const ch = [
      { l: 'Gist', s: 'Catch up for an hour', f: () => { S.friends[n.id] = clamp(f + 8 * g); this.mod({ social: 16, fun: 8 }); const line = pick(n.lines); npc.avatar.say(line.replace(/^'|'$/g, ''), 7); this.log(n.name + ': ' + line); this.advance(1); } },
      { l: 'Study together', s: 'Two hours', f: () => { S.friends[n.id] = clamp(f + 5 * g); this.study(rnd(5), n.tag === 'study' ? 10 : 5); this.mod({ social: 8, energy: -6 }); npc.avatar.say('Open your Civil Litigation. Page 40.', 5); this.log('You read with ' + n.name + '.'); this.advance(2); } },
      { l: 'Ask for a favour', s: f >= 50 ? 'They like you enough' : 'Friendship too low (needs 50)', off: f < 50, f: () => { const r = { tunde: () => { S.know = S.know.map((k) => clamp(k + 4)); return 'Tunde shared his summary notes.'; }, amaka: () => { this.mod({ social: 20, fun: 10 }); return 'Amaka put you on the dinner planning committee.'; }, musa: () => { S.money += 6000; return 'Musa gave you a cut from his print job. ₦6,000.'; }, ngozi: () => { this.mod({ hunger: 40, stress: 15 }); return 'Ngozi cooked jollof for both of you.'; }, bayo: () => { S.rec.lecturesMissed = Math.max(0, S.rec.lecturesMissed - 1); return 'Bayo quietly fixed the attendance register.'; } }[n.id](); S.friends[n.id] = clamp(f - 10); npc.avatar.say('Okay, just this once.', 5); this.log(r, true); this.advance(0.5); } },
    ];
    this.ui.actList('💬 ' + n.name, n.bio + ' · Friendship ' + Math.round(f) + '%', ch);
  }

  // ---- events and milestones ----
  fireEvent() {
    const e = pick(EVENTS);
    this.ui.choices('Bwari wahala', e.t, e.c.map((c) => c[0]), (i) => {
      const ch = { ...e.c[i][1] }; this.ui.closeSheet();
      if (ch.need && !this.S.items.includes(ch.need)) { this.log('You do not have a ' + ch.need + '. It went badly.'); this.mod({ stress: -10 }); this.render(); return; }
      if (ch.roll === 'know') { if (this.knowAvg() < 35) { this.log('You answered wrong. The hall laughed. The lecturer did not.'); this.mod({ stress: -10, social: -5 }); this.render(); return; } else this.log("You answered well. 'Good, that is a bar finals point.'", true); }
      if (ch.trait === 'hustler' && this.S.trait === 'hustler') ch.money = Math.round(ch.money * 1.5);
      delete ch.need; delete ch.roll; delete ch.trait; this.mod(ch); this.render();
    });
  }
  dinner() { const S = this.S; const d = S.rec.dinners + 1; S.flags['dinner' + S.week] = 1; S.rec.dinners = d; this.mod({ hunger: 50, social: 20, fun: 15, energy: -10, stress: 5 }); this.log('Dinner ' + d + ' of 3. Grace was said, the Bencher spoke for forty minutes, the chicken was small. Attendance recorded.', true); this.advance(3); }
  portfolio() { const S = this.S; const sc = clamp(Math.round(this.knowAvg() * 0.9 + rnd(20) + (S.rec.court + S.rec.firm) * 2)); S.flags['pf' + S.week] = 1; S.rec.portfolio.push(sc); this.log('Portfolio submitted. Score ' + sc + '%. ' + (sc >= 60 ? 'The assessor liked your drafting.' : 'Too many errors in your drafts.'), true); this.mod({ stress: 10 }); this.advance(1); }
  moot() { const S = this.S; S.flags.moot = 1; const r = this.knowAvg() + S.needs.stress * 0.3 + rnd(25); const g = r > 75 ? 'Excellent' : r > 55 ? 'Good' : 'Fair'; S.rec.moot = g; this.log("Moot court: '" + g + "'. " + (g === 'Excellent' ? "The bench said 'counsel, well argued'." : g === 'Good' ? 'You forgot one authority but recovered.' : "You said 'My Lord' to a lady judge. Twice."), true); this.mod({ stress: -8, social: 10 }); this.advance(2); }
  quiz(n, title, done) {
    const qs = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, n); let i = 0, right = 0;
    const step = () => { if (i >= n) { this.ui.closeSheet(); done(Math.round((right / n) * 100)); return; } const q = qs[i]; const opts = q[1].map((o, k) => [o, k]).sort(() => Math.random() - 0.5); this.ui.choices(title + ' · ' + (i + 1) + ' of ' + n, q[0], opts.map((o) => o[0]), (k) => { if (opts[k][1] === q[2]) right++; i++; step(); }); };
    step();
  }
  barFinals() { this.quiz(8, 'Bar Finals', (sc) => { this.S.rec.finals = sc; this.S.flags.finals = 1; this.endGame(); }); }
  endGame() {
    if (this.ended) return; this.ended = true; const S = this.S; const r = S.rec; const pf = r.portfolio.length ? r.portfolio.reduce((a, b) => a + b, 0) / r.portfolio.length : 30;
    let total = this.knowAvg() * 0.45 + (r.finals ?? 20) * 0.3 + pf * 0.15 + (r.moot === 'Excellent' ? 10 : r.moot === 'Good' ? 6 : r.moot ? 3 : 0); total -= r.lecturesMissed * 1.5; total = clamp(Math.round(total));
    let grade, note;
    if (r.dinners < 3) { grade = 'Not called'; note = 'You attended only ' + r.dinners + ' of 3 dinners. The Body of Benchers does not play with dinners. Try again next session.'; }
    else if (r.finals === null) { grade = 'Absent'; note = 'You never sat the Bar Finals. Bwari will see you again.'; }
    else if (total >= 70) { grade = 'First Class'; note = 'Your name was read with the first class list. Your mother screamed in the hall.'; }
    else if (total >= 60) { grade = 'Second Class Upper'; note = 'Solid. The wig fits. Chambers are already calling.'; }
    else if (total >= 50) { grade = 'Second Class Lower'; note = 'You made it. Nobody asks your grade after the call anyway.'; }
    else if (total >= 40) { grade = 'Pass'; note = 'A pass is a pass. You were called. That is the point.'; }
    else { grade = 'Resit'; note = 'Not this time. Bwari will see you again for the resit.'; }
    const called = !['Not called', 'Resit', 'Absent'].includes(grade);
    try { localStorage.removeItem('bwari3d'); } catch (e) {}
    this.onEnd?.({ grade, note, total, called, r, pf });
  }
}
export { clamp, pick, rnd, TRAITS, DAYS };
