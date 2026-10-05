import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const OUT = '/tmp/claude-0/-home-user/8ce74c45-19d8-5146-9bdd-2efda729f259/scratchpad/shots';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
await ctx.route('**/*', (r) => (r.request().url().startsWith('http://localhost:4173') ? r.continue() : r.abort()));
const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('[pageerror]', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)); });
await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#s-intro.on', { timeout: 120000 });
// big meshes
const big = await p.evaluate(() => { const T = window.bwari; const out = []; const box = new (T.scene.constructor.prototype.constructor === Object ? Object : Object)(); return (function () { const THREE_Box3 = T.scene.children[0].constructor; return []; })(); });
const bigList = await p.evaluate(() => { const b = window.bwari; const res = []; b.scene.updateMatrixWorld(true); b.scene.traverse((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); const s = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z]; if (Math.max(...s) > 60) res.push([o.name || o.parent?.name || o.type, o.isInstancedMesh ? 'inst' + o.count : '', s.map((v) => v.toFixed(1)).join('x'), o.material?.color?.getHexString?.()]); } }); return res; });
console.log('BIG MESHES', JSON.stringify(bigList));
await p.click('#btn-new'); await p.waitForTimeout(3000);
const styles = [['f', 'f1_hair'], ['f', 'proc:braids'], ['f', 'proc:afro'], ['f', 'proc:bun'], ['f', 'proc:low'], ['f', 'proc:hijab'], ['f', 'proc:locs'], ['m', 'm2_hair'], ['m', 'proc:low'], ['m', 'proc:fade'], ['m', 'proc:afro'], ['m', 'proc:locs'], ['m', 'proc:cap'], ['m', 'none']];
let g = null;
for (const [gender, hair] of styles) {
  if (gender !== g) { g = gender; await p.locator('#creator .chip').getByText(gender === 'f' ? 'Female' : 'Male', { exact: true }).click(); await p.waitForTimeout(3500); }
  await p.evaluate(async (hair) => { const b = window.bwari; await b.player.setConfig({ hair, glasses: hair === 'proc:low', beard: hair === 'proc:fade', hat: false }); const pos = b.player.group.position; b.player.group.rotation.y = 0; b.controls.setFocus(pos.clone().add({ x: 0, y: 1.55, z: 0 }), { dist: 1.3, yaw: 0, pitch: 0.05 }); b.controls.snap(); b.controls.snap(); }, hair);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/hair-${gender}-${hair.replace(':', '_')}.png`, clip: { x: 150, y: 150, width: 600, height: 600 } });
  const metrics = await p.evaluate(() => { const b = window.bwari; const H = b.player._headMetrics(); return H && Object.fromEntries(Object.entries(H).filter(([k, v]) => typeof v === 'number').map(([k, v]) => [k, +v.toFixed(3)])); });
  console.log(gender, hair, JSON.stringify(metrics));
}
// side view and full body for the male hat and formal
await p.evaluate(async () => { const b = window.bwari; await b.player.setConfig({ hair: 'm2_hair', hat: true, beard: true }); b.player.setFormal(true); const pos = b.player.group.position; b.controls.setFocus(pos.clone().add({ x: 0, y: 1.0, z: 0 }), { dist: 3.2, yaw: 0.5, pitch: 0.05 }); b.controls.snap(); b.controls.snap(); });
await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/hair-m-hat-formal.png` });
await browser.close(); server.kill(); process.exit(0);
