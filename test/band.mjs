import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
await ctx.route('**/*', (r) => (r.request().url().startsWith('http://localhost:4173') ? r.continue() : r.abort()));
const p = await ctx.newPage();
await p.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await p.waitForSelector('#s-intro.on', { timeout: 120000 });
const res = await p.evaluate(() => {
  const b = window.bwari; const out = { boxes: [], inst: [], skinned: [] };
  b.scene.traverse((o) => {
    if (o.isMesh && o.geometry?.parameters && o.geometry.type === 'BoxGeometry') { const q = o.geometry.parameters; if (Math.max(q.width, q.height, q.depth) > 60) out.boxes.push([q.width, q.height, q.depth, o.material?.color?.getHexString()]); }
    if (o.isInstancedMesh) { const m = new o.matrixWorld.constructor(); let worst = 0; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); const e = m.elements; const s = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])); worst = Math.max(worst, s); } out.inst.push([o.parent?.name || o.name, o.count, +worst.toFixed(2), o.material?.color?.getHexString()]); }
    if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; out.skinned.push([o.name, o.userData.partId, [bb.min.y, bb.max.y].map((v) => +v.toFixed(2)).join('..'), o.material?.color?.getHexString(), o.skeleton?.bones?.length]); }
  });
  // hide groups one at a time: find which object removal removes maroon pixels... instead list meshes with maroon material
  const maroon = []; b.scene.traverse((o) => { if (o.isMesh && o.material?.color?.getHexString() === '7a1f2e') { const q = o.geometry.parameters || {}; maroon.push([o.geometry.type, q.width || q.radius || q.radiusTop, q.height, q.depth, o.isInstancedMesh ? 'inst' : '', o.position.toArray().map((v) => +v.toFixed(1)).join(','), o.scale.toArray().join(',')]); } });
  out.maroon = maroon; return out;
});
console.log(JSON.stringify(res, null, 0));
await browser.close(); server.kill(); process.exit(0);
