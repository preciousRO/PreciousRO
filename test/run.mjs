// Headless smoke test: loads the built game, walks through the creator and the campus, takes screenshots.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const OUT = process.env.OUT || '/tmp/claude-0/-home-user/8ce74c45-19d8-5146-9bdd-2efda729f259/scratchpad/shots';
fs.mkdirSync(OUT, { recursive: true });
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const logs = [];
async function page(name) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${name}:${m.type()}] ${m.text().slice(0, 300)}`); });
  p.on('pageerror', (e) => logs.push(`[${name}:pageerror] ${e.message}`));
  await ctx.route('**/*', (r) => (r.request().url().startsWith('http://localhost:4173') ? r.continue() : r.abort()));
  await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  return p;
}
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
try {
  const p = await page('A');
  await p.waitForSelector('#s-intro.on', { timeout: 120000 });
  await shot(p, '01-intro');
  await p.click('#btn-new'); await p.waitForTimeout(4000); await shot(p, '02-creator-f');
  // pick a few options
  const chip = async (label) => { const b = p.locator('#creator .chip').getByText(label, { exact: true }).first(); await b.click(); await p.waitForTimeout(1500); };
  await chip('Afro'); await shot(p, '03-creator-afro');
  await chip('Hijab'); await shot(p, '04-creator-hijab');
  await chip('Male'); await p.waitForTimeout(3000); await shot(p, '05-creator-m');
  await chip('Locs'); await chip('Suit jacket'); await chip('Beard'); await chip('Glasses'); await shot(p, '06-creator-m-styled');
  await p.fill('#creator input', 'Precious');
  await p.click('#btn-start'); await p.waitForTimeout(3500); await shot(p, '07-game-start');
  const st = await p.evaluate(() => { const b = window.bwari; return { pos: b.player.group.position.toArray().map((v) => +v.toFixed(2)), loop: b.player.loopName, loc: b.game.loc?.id, npcs: b.npcs.list.map((n) => [n.id, n.avatar.loaded, n.avatar.group.position.toArray().map((v) => +v.toFixed(1))]), online: b.net.online, connected: b.net.connected }; });
  console.log('state after start', JSON.stringify(st));
  await p.keyboard.down('KeyW'); await p.waitForTimeout(2500); await shot(p, '08-walking'); await p.keyboard.up('KeyW');
  await p.waitForTimeout(600);
  const st2 = await p.evaluate(() => { const b = window.bwari; return { pos: b.player.group.position.toArray().map((v) => +v.toFixed(2)), loop: b.player.loopName, loc: b.game.loc?.id, hour: +b.game.S.hour.toFixed(2) }; });
  console.log('after walking', JSON.stringify(st2));
  // teleport to the lecture hall door and interact
  await p.evaluate(() => { const b = window.bwari; b.player.group.position.set(-40, 0, -12); b.controls.snap(); });
  await p.waitForTimeout(1200); await shot(p, '09-lecture-hall');
  await p.keyboard.press('KeyE'); await p.waitForTimeout(800); await shot(p, '10-lecture-sheet');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // night time at the hostel
  await p.evaluate(() => { const b = window.bwari; b.game.S.hour = 20.5; b.player.group.position.set(-48, 0, 18); b.controls.yaw = 0.3; b.controls.snap(); });
  await p.waitForTimeout(1200); await shot(p, '11-night-hostel');
  // chat and dance
  await p.evaluate(() => { const b = window.bwari; b.game.S.hour = 11; });
  await p.fill('#chatinput', 'Who is going for lecture?'); await p.press('#chatinput', 'Enter'); await p.waitForTimeout(800); await shot(p, '12-chat-bubble');
  await p.click('[data-emote="dance"]'); await p.waitForTimeout(1500); await shot(p, '13-dance');
  // wide view of campus
  await p.evaluate(() => { const b = window.bwari; b.controls.dist = 16; b.controls.pitch = 0.9; b.player.group.position.set(0, 0, 30); b.controls.snap(); });
  await p.waitForTimeout(1200); await shot(p, '14-campus-wide');
  await p.evaluate(() => { const b = window.bwari; b.player.group.position.set(-80, 0, 2); b.controls.dist = 9; b.controls.pitch = 0.4; b.controls.yaw = Math.PI * 0.5; b.controls.snap(); });
  await p.waitForTimeout(1200); await shot(p, '15-junction');
  // a second player joins (multiplayer)
  const q = await page('B'); await q.waitForSelector('#s-intro.on', { timeout: 120000 }); await q.click('#btn-new'); await q.waitForTimeout(2500); await q.fill('#creator input', 'Amara'); await q.click('#btn-start'); await q.waitForTimeout(5000);
  const mp = await p.evaluate(() => ({ online: window.bwari.net.online, remotes: [...window.bwari.net.remotes.values()].map((r) => [r.name, !!r.avatar]) }));
  console.log('multiplayer from A', JSON.stringify(mp));
  await p.evaluate(() => { const b = window.bwari; b.player.group.position.set(2, 0, 80); b.controls.dist = 6; b.controls.pitch = 0.3; b.controls.yaw = Math.PI; b.controls.snap(); });
  await q.fill('#chatinput', 'Hello from the other browser'); await q.press('#chatinput', 'Enter'); await p.waitForTimeout(1500); await shot(p, '16-multiplayer');
  const chatA = await p.evaluate(() => document.getElementById('chatlog').innerText);
  console.log('chat log A:', chatA.replace(/\n/g, ' | '));
  await q.close();
} catch (e) { console.error('TEST FAIL', e); }
console.log('--- console ---'); console.log([...new Set(logs)].slice(0, 40).join('\n'));
await browser.close(); server.kill();
