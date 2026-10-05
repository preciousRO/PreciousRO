// Bwari Life: boot, scene, loop.
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { initAvatars, Avatar, defaultConfig } from './avatar.js';
import { World } from './world.js';
import { Controls } from './controls.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { NPCs } from './npc.js';
import { Net } from './net.js';

const $ = (id) => document.getElementById(id);
const ui = new UI();

const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
const labels = new CSS2DRenderer({ element: $('labels') }); labels.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 500);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); labels.setSize(innerWidth, innerHeight); });

const world = new World(scene);
const controls = new Controls(camera, $('gl'), world);
const game = new Game(ui, world);
const npcs = new NPCs(scene, world, controls);
const net = new Net(scene, ui);
let player = null; let mode = 'loading'; let creatorCfg = null; const creatorExtra = { trait: 'bookworm' };

async function boot() {
  ui.loading(0.1, 'Loading the campus…');
  await initAvatars(); ui.loading(0.3, 'Building Bwari…');
  await world.build(); ui.loading(0.55, 'Calling your coursemates…');
  camera.position.set(0, 30, 140); controls.camPos.copy(camera.position); controls.lookAt.set(0, 0, 0);
  npcs.spawn().then(() => ui.loading(1, 'Ready')).catch((e) => console.warn(e));
  ui.loading(0.9, 'Almost there…');
  // warm the player avatar parts
  await Promise.all(['f', 'm'].map((g) => new Avatar(scene, defaultConfig(g)).load().then((a) => a.dispose())));
  ui.loading(1, 'Ready');
  mode = 'intro'; ui.show('s-intro');
  if (Game.load()) $('btn-load').hidden = false;
}

// ---- intro / creator ----
$('btn-new').onclick = async () => {
  mode = 'create'; ui.show('s-create');
  creatorCfg = creatorCfg || defaultConfig('f');
  await spawnPlayer(creatorCfg, [0, 0, 82]);
  player.group.rotation.y = Math.PI * 0.1;
  controls.setFocus(new THREE.Vector3(0, 1.05, 82), { dist: 3.1, yaw: Math.PI * 0.12, pitch: 0.02 }); controls.snap();
  ui.buildCreator(creatorCfg, creatorExtra, onCreatorChange);
};
async function onCreatorChange(patch, light) {
  const old = creatorCfg; creatorCfg = { ...creatorCfg, ...patch };
  if (patch.gender && patch.gender !== old.gender) { creatorCfg = { ...defaultConfig(patch.gender), name: old.name, skin: old.skin, hairColor: old.hairColor, glasses: old.glasses }; await spawnPlayer(creatorCfg, [0, 0, 82]); player.group.rotation.y = Math.PI * 0.1; ui.buildCreator(creatorCfg, creatorExtra, onCreatorChange); return; }
  if (light) { player.config.name = creatorCfg.name; player.applyColors(); return; }
  await player.setConfig(creatorCfg);
}
$('btn-back').onclick = () => { mode = 'intro'; ui.show('s-intro'); controls.setFocus(null); };
$('btn-start').onclick = () => { creatorCfg.name = creatorCfg.name || 'Aspirant'; startGame(game.newState({ ...creatorCfg }, creatorExtra.trait)); };
$('btn-load').onclick = async () => { const S = Game.load(); if (!S) return ui.toast('No saved game'); await spawnPlayer(S.av, S.pos || [0, 0, 82]); startGame(S); };

async function spawnPlayer(cfg, pos) {
  if (player) { player.dispose(); player = null; }
  player = new Avatar(scene, { ...cfg }, { tagClass: 'is-me' });
  player.group.position.set(pos[0], 0, pos[2]); player.group.rotation.y = Math.PI;
  await player.load(); controls.player = player;
  return player;
}

// ---- game ----
async function startGame(S) {
  if (!player || player.config.gender !== S.av.gender) await spawnPlayer(S.av, S.pos || [0, 0, 82]);
  player.config.name = S.av.name; player.applyColors();
  mode = 'game'; ui.show('s-game'); controls.setFocus(null); controls.enabled = true; player.group.rotation.y = Math.PI; controls.yaw = 0; controls.pitch = 0.32; controls.snap();
  game.start(S, player);
  game.onEnd = showEnding;
  net.connect(S.av.name, S.av, () => ({ p: [player.group.position.x, 0, player.group.position.z], r: player.group.rotation.y, a: player.loopName || 'idle', s: player.moveSpeed, f: player.formal }));
  ui.toast('Welcome to Bwari, ' + S.av.name);
}
ui.onChat = (text) => { if (mode !== 'game') return; ui.addChat(player.config.name + ' (you)', text); player.say(text); net.sendChat(text); };
ui.onEmote = (name) => { if (mode !== 'game' || !player) return; if (name === 'dance') { if (player.loopName && /dance/.test(player.loopName)) player.play('idle'); else { const d = ['dance', 'dance2', 'dance3'][Math.floor(Math.random() * 3)]; player.play(d); net.sendAnim(d); } } else { player.play(name, { once: true }); net.sendAnim(name); } };
ui.onMic = () => net.toggleVoice();
controls.onInteract = () => interact();
$('btn-act').onclick = () => interact();
controls.onTap = (ray) => { if (mode !== 'game') return false; const n = npcs.pick(ray); if (n && n.avatar.group.position.distanceTo(player.group.position) < 3.5) { talkTo(n); return true; } if (n) { controls.target = n.avatar.group.position.clone(); return true; } return false; };
function interact() { if (mode !== 'game' || ui.sheetOpen()) return; const n = npcs.nearest(player.group.position, 2.8); if (n) return talkTo(n); if (game.loc) game.interact(); }
function talkTo(n) { npcs.setBusy(n, true, player.group.position); player.group.lookAt(n.avatar.group.position.x, 0, n.avatar.group.position.z); game.talk(n); const close = () => { if (!ui.sheetOpen()) { npcs.setBusy(n, false); clearInterval(iv); } }; const iv = setInterval(close, 300); }
$('btn-menu').onclick = () => { if (mode !== 'game') return; ui.actList('Menu', '', [
  { l: 'Save game', f: () => game.save() },
  { l: 'Change outfit', s: 'Back to the dressing room', f: () => { creatorCfg = { ...player.config }; mode = 'create'; ui.show('s-create'); controls.setFocus(new THREE.Vector3(player.group.position.x, 1.05, player.group.position.z), { dist: 3.1, yaw: player.group.rotation.y + Math.PI * 0.12, pitch: 0.02 }); ui.buildCreator(creatorCfg, { trait: game.S.trait }, onCreatorChange); $('btn-start').onclick = () => { game.S.av = { ...creatorCfg }; net.updateConfig(game.S.av); mode = 'game'; ui.show('s-game'); controls.setFocus(null); game.render(); }; } },
  { l: 'How to play', f: () => ui.openSheet(`<h3>How to play</h3><div class="sub">Walk with WASD or arrows, or tap the ground. Drag to look around, scroll or pinch to zoom. Hold Shift to run. Press E or tap Interact at any building door or next to a coursemate. Press Enter to chat with everyone on campus, use the emote buttons to dance or wave, and turn on Voice to talk to people near you.<br><br>Each game hour is 24 real seconds. Keep all six needs above 25. Attend 9am lectures Mon to Fri, all three dinners (weeks 6, 10, 17 from 6pm), externship (weeks 13 to 16, weekday mornings at the Court), two portfolios (weeks 4 and 18), moot court (week 8), the mock MCQ (week 12), then Bar Finals in week 20 at the Lecture Hall. Knowledge, finals, portfolio and moot decide your class. Miss a dinner and you will not be called.</div><button class="ghost" id="sheet-close">Close</button>`) || setTimeout(() => ($('sheet-close').onclick = () => ui.closeSheet())) },
  { l: 'Quit to menu', f: () => { game.save(); mode = 'intro'; ui.show('s-intro'); $('btn-load').hidden = false; } },
]); };

function showEnding({ grade, note, total, called, r, pf }) {
  mode = 'end'; controls.enabled = false;
  player.setConfig({ wig: called, hat: false }).then(() => { player.setFormal(true); if (called) { player.play('dance2'); net.sendAnim('dance2'); } });
  controls.setFocus(new THREE.Vector3(player.group.position.x, 1.1, player.group.position.z), { dist: 3.4, yaw: player.group.rotation.y + 0.3, pitch: 0.05 });
  ui.showEnd(`<div class="tag">${called ? 'Call to Bar · International Conference Centre, Abuja' : 'Bar Part II · Results'}</div><div class="grade">${grade}</div><p style="max-width:50ch;margin:0 auto;font-size:17px">${note}</p>
  <div class="row" style="justify-content:center;font-size:13px;color:#cfe3d5"><span>Overall ${total}%</span><span>Finals ${r.finals ?? '–'}%</span><span>Portfolio ${Math.round(pf)}%</span><span>Moot ${r.moot ?? '–'}</span><span>Lectures ${r.lectures}</span><span>Dinners ${r.dinners}/3</span></div>
  <div class="row" style="justify-content:center"><button class="primary" id="btn-again">Play again</button></div>`);
  $('btn-again').onclick = () => location.reload();
}

// ---- loop ----
const clock = new THREE.Clock(); let t = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1); t += dt;
  controls.runToggle = controls.runToggle || ui.runToggle; if (!ui.runToggle && !controls.keys.has('ShiftLeft')) controls.runToggle = false;
  controls.joy = ui.joy;
  if (player?.loaded) { controls.update(dt); player.update(dt); }
  const hour = game.S ? game.S.hour : 10;
  if (mode === 'game' && game.S && !game.ended) {
    game.tick(dt);
    const p = player.group.position; let near = null; let bd = Infinity;
    for (const L of world.locations) { const d = Math.hypot(L.door[0] - p.x, L.door[1] - p.z); if (d < L.r && d < bd) { bd = d; near = L; } }
    game.setLocation(near);
    const n = npcs.nearest(p, 2.8); if (n && !ui.sheetOpen()) ui.prompt('Talk to ' + n.name); else if (!near) ui.prompt(null); else if (!ui.sheetOpen()) ui.prompt(near.ic + ' ' + near.name);
  }
  npcs.update(dt, hour);
  net.update(dt);
  world.update(dt, t);
  if (world.sun) world.setTime(hour, player ? player.group.position : new THREE.Vector3());
  renderer.render(scene, camera); labels.render(scene, camera);
}
window.bwari = { game, world, controls, npcs, net, get player() { return player; }, scene, camera, renderer };
boot().catch((e) => { console.error(e); ui.loading(1, 'Something failed to load: ' + e.message); });
loop();
