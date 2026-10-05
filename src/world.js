// The Bwari campus: procedural buildings, roads, lawns, trees, CC0 KayKit props, day and night.
import * as THREE from 'three';
import { loadProps, canvasTexture } from './assets.js';

export const LOCATIONS = [
  { id: 'gate', name: 'Main Gate', sub: 'Nigerian Law School, Bwari Campus', ic: '🏛️', door: [0, 88], r: 7 },
  { id: 'hostel', name: 'Hostel', sub: 'Your room, your roommate and the bunk', ic: '🛏️', door: [-48, 25], r: 6 },
  { id: 'hostel', name: 'Hostel', sub: 'Your room, your roommate and the bunk', ic: '🛏️', door: [48, 25], r: 6 },
  { id: 'lecture', name: 'Lecture Hall', sub: '9am sharp. Black and white. ID card.', ic: '🎓', door: [-40, -15], r: 7 },
  { id: 'library', name: 'Library', sub: 'Quiet, cold and full', ic: '📚', door: [40, -18], r: 6 },
  { id: 'caf', name: 'Cafeteria', sub: 'Rice, beans, plantain', ic: '🍛', door: [-28, 57], r: 6 },
  { id: 'clinic', name: 'Clinic', sub: 'Malaria is not a joke', ic: '🏥', door: [28, 57], r: 6 },
  { id: 'dining', name: 'Dining Hall', sub: 'Formal dinners, dark suit', ic: '🍽️', door: [-40, -76], r: 7 },
  { id: 'chapel', name: 'Chapel', sub: 'Peace of mind', ic: '⛪', door: [16, -75], r: 6 },
  { id: 'mosque', name: 'Mosque', sub: 'Peace of mind', ic: '🕌', door: [50, -76], r: 6 },
  { id: 'court', name: 'Court / Chambers', sub: 'Externship weeks', ic: '⚖️', door: [76, -8], r: 7 },
  { id: 'buka', name: 'Bwari Junction', sub: 'Suya, shawarma, market, data', ic: '🔥', door: [-84, 8], r: 10 },
  { id: 'sports', name: 'Sports Field', sub: 'Football, walks, gist', ic: '⚽', door: [66, 60], r: 12 },
];

const LAWN = '#5f8f3e', ROAD = '#3a3a3c', PATH = '#c9c0ad';

export class World {
  constructor(scene) {
    this.scene = scene; this.colliders = []; this.group = new THREE.Group(); scene.add(this.group);
    this.windowMat = new THREE.MeshStandardMaterial({ color: '#8fb6d9', roughness: 0.2, metalness: 0.4, emissive: '#ffd27a', emissiveIntensity: 0 });
    this.lampMat = new THREE.MeshStandardMaterial({ color: '#fff2c0', emissive: '#ffd27a', emissiveIntensity: 0 });
    this.nightLights = [];
    this.locations = LOCATIONS;
  }

  async build() {
    this._lights(); this._ground(); this._roads();
    this._buildings();
    await this._props();
    this._trees();
    return this;
  }

  _lights() {
    this.hemi = new THREE.HemisphereLight('#cfe6ff', '#4a6b2f', 0.7); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff4de', 2.2); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); const c = this.sun.shadow.camera; c.near = 1; c.far = 220; c.left = -45; c.right = 45; c.top = 45; c.bottom = -45; this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.scene.fog = new THREE.Fog('#cfe3f5', 120, 320);
    this.scene.background = new THREE.Color('#9ccbf0');
  }

  _ground() {
    const tex = canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = LAWN; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = `hsl(${88 + Math.random() * 18},${35 + Math.random() * 25}%,${28 + Math.random() * 16}%)`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground'; this.group.add(ground); this.ground = ground;
    // perimeter wall
    const wallMat = new THREE.MeshStandardMaterial({ color: '#d8cfb8', roughness: 0.9 });
    const wall = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), wallMat); m.position.set(x, 1.3, z); m.castShadow = m.receiveShadow = true; this.group.add(m); this.colliders.push({ x1: x - w / 2, z1: z - d / 2, x2: x + w / 2, z2: z + d / 2, h: 2.6 }); };
    wall(0, -118, 240, 0.6); wall(-120, 0, 0.6, 236); wall(120, 0, 0.6, 236); wall(-66, 100, 108, 0.6); wall(66, 100, 108, 0.6);
    this.bounds = { x1: -118, z1: -116, x2: 118, z2: 99 };
  }

  _roads() {
    const asphalt = canvasTexture(256, 256, (g, w, h) => { g.fillStyle = ROAD; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
    const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 });
    const lineMat = new THREE.MeshStandardMaterial({ color: '#f2e6a6', roughness: 0.8 });
    const pathMat = new THREE.MeshStandardMaterial({ color: PATH, roughness: 1 });
    const strip = (x, z, w, d, mat, y = 0.02) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; this.group.add(m); return m; };
    const road = (x, z, w, d) => { const m = strip(x, z, w, d, roadMat); m.material = roadMat.clone(); m.material.map = asphalt.clone(); m.material.map.repeat.set(w / 8, d / 8); m.material.map.needsUpdate = true; };
    road(0, 0, 10, 200); road(0, 0, 170, 10); road(0, -56, 170, 10);
    // dashed centre lines
    for (let z = -96; z < 98; z += 6) if (Math.abs(z) > 6 && Math.abs(z + 56) > 6) strip(0, z, 0.3, 3, lineMat, 0.03);
    for (let x = -82; x < 84; x += 6) if (Math.abs(x) > 6) { strip(x, 0, 3, 0.3, lineMat, 0.03); strip(x, -56, 3, 0.3, lineMat, 0.03); }
    // walkways to every door
    const walk = (x1, z1, x2, z2) => { const w = Math.abs(x2 - x1) || 3, d = Math.abs(z2 - z1) || 3; strip((x1 + x2) / 2, (z1 + z2) / 2, Math.max(w, 3), Math.max(d, 3), pathMat, 0.015); };
    walk(-48, 25, -48, 5); walk(48, 25, 48, 5); walk(-40, -15, -40, -5); walk(40, -18, 40, -5); walk(-28, 57, -28, 5); walk(28, 57, 28, 5);
    walk(-40, -76, -40, -61); walk(16, -75, 16, -61); walk(50, -76, 50, -61); walk(76, -8, 5, -8); walk(-84, 8, -84, 5); walk(66, 60, 5, 60); walk(66, 60, 66, 5);
    this.roadZones = [{ x1: -5, z1: -100, x2: 5, z2: 100 }, { x1: -85, z1: -5, x2: 85, z2: 5 }, { x1: -85, z1: -61, x2: 85, z2: -51 }];
  }

  _sign(text, w = 8, h = 1.2, bg = '#1b3a2a', fg = '#ffffff') {
    const tex = canvasTexture(1024, Math.round(1024 * h / w), (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = '#d6a51c'; g.lineWidth = 12; g.strokeRect(14, 14, W - 28, H - 28);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let size = Math.min(H * 0.55, (W * 1.6) / Math.max(6, text.length)); g.font = `bold ${size}px Georgia, serif`; g.fillText(text, W / 2, H / 2);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  }

  // Procedural building. face: 'n' means the door looks toward -z.
  _building({ x, z, w, d, h, floors = 2, color = '#e8dcc0', trim = '#7a1f2e', roof = 'flat', roofColor = '#8b3a2a', face = 's', label, columns = 0, windows = true, wide = false }) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const rotY = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 }[face];
    const bw = face === 'e' || face === 'w' ? d : w, bd = face === 'e' || face === 'w' ? w : d; // local: front is +z
    const wallMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: trim, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), wallMat); body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    // plinth and trim band
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.6, 0.5, bd + 0.6), trimMat); plinth.position.y = 0.25; plinth.receiveShadow = true; g.add(plinth);
    for (let f = 1; f < floors; f++) { const band = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.2, 0.25, bd + 0.2), trimMat); band.position.y = (h / floors) * f; g.add(band); }
    // roof
    if (roof === 'hip') {
      const rh = Math.min(bw, bd) * 0.28;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.72, rh, 4, 1), new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 }));
      cone.rotation.y = Math.PI / 4; cone.scale.set(bw + 1.6, 1, bd + 1.6); cone.position.y = h + rh / 2 - 0.05; cone.castShadow = true; g.add(cone);
      const eave = new THREE.Mesh(new THREE.BoxGeometry(bw + 1.6, 0.25, bd + 1.6), new THREE.MeshStandardMaterial({ color: roofColor })); eave.position.y = h; g.add(eave);
    } else {
      const par = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.8, bd + 0.4), trimMat); par.position.y = h + 0.2; g.add(par);
      const top = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.2, 0.1, bd - 0.2), new THREE.MeshStandardMaterial({ color: '#8a8a86' })); top.position.y = h + 0.6; g.add(top);
    }
    // windows (instanced) on all four faces
    if (windows) {
      const geo = new THREE.BoxGeometry(1.3, 1.6, 0.12); const list = [];
      const fh = h / floors;
      const side = (len, fixed, axis, normalSign, isFront) => {
        const n = Math.max(1, Math.floor((len - 2) / 3.2)); const start = -((n - 1) * 3.2) / 2;
        for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) {
          const p = start + i * 3.2; if (isFront && f === 0 && Math.abs(p) < (wide ? 5 : 2.6)) continue;
          const m = new THREE.Matrix4(); const y = fh * f + fh * 0.55;
          if (axis === 'x') m.makeTranslation(p, y, fixed + normalSign * 0.02); else { m.makeRotationY(Math.PI / 2); m.setPosition(fixed + normalSign * 0.02, y, p); }
          list.push(m);
        }
      };
      side(bw, bd / 2, 'x', 1, true); side(bw, -bd / 2, 'x', -1, false); side(bd, bw / 2, 'z', 1, false); side(bd, -bw / 2, 'z', -1, false);
      const inst = new THREE.InstancedMesh(geo, this.windowMat, list.length); list.forEach((m, i) => inst.setMatrixAt(i, m)); inst.castShadow = false; g.add(inst);
      const frameGeo = new THREE.BoxGeometry(1.5, 1.8, 0.08); const frames = new THREE.InstancedMesh(frameGeo, trimMat, list.length); list.forEach((m, i) => { const mm = m.clone(); const p = new THREE.Vector3().setFromMatrixPosition(mm); mm.setPosition(p.x * 0.995, p.y, p.z * 0.995); frames.setMatrixAt(i, mm); }); g.add(frames);
    }
    // door and steps on the front
    const doorW = wide ? 4.5 : 2.4;
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, 3, 0.3), new THREE.MeshStandardMaterial({ color: '#3b2a1a', roughness: 0.6 })); door.position.set(0, 1.5, bd / 2 + 0.05); g.add(door);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.6, 3.4, 0.2), trimMat); frame.position.set(0, 1.7, bd / 2 - 0.02); g.add(frame);
    for (let s = 0; s < 3; s++) { const st = new THREE.Mesh(new THREE.BoxGeometry(doorW + 2 + s, 0.18, 0.5 + s * 0.5), new THREE.MeshStandardMaterial({ color: '#b9b2a2' })); st.position.set(0, 0.09 + (2 - s) * 0.18, bd / 2 + 0.6 + s * 0.3); st.receiveShadow = true; g.add(st); }
    if (columns) {
      const portico = new THREE.Mesh(new THREE.BoxGeometry(Math.min(bw, columns * 3.2 + 2), 0.9, 5), trimMat); portico.position.set(0, h * 0.78, bd / 2 + 2.6); portico.castShadow = true; g.add(portico);
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.min(bw, columns * 3.2 + 2) / 2, 2.4, 4, 1), trimMat); ped.rotation.y = Math.PI / 4; ped.scale.set(1, 1, 0.3); ped.position.set(0, h * 0.78 + 1.6, bd / 2 + 2.6); g.add(ped);
      for (let i = 0; i < columns; i++) { const cx = -((columns - 1) * 3.2) / 2 + i * 3.2; const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, h * 0.78, 14), new THREE.MeshStandardMaterial({ color: '#f1ebdc', roughness: 0.7 })); col.position.set(cx, h * 0.39, bd / 2 + 4.6); col.castShadow = true; g.add(col); }
      const floor = new THREE.Mesh(new THREE.BoxGeometry(Math.min(bw, columns * 3.2 + 2), 0.3, 5.6), new THREE.MeshStandardMaterial({ color: '#cfc7b6' })); floor.position.set(0, 0.15, bd / 2 + 2.8); floor.receiveShadow = true; g.add(floor);
    }
    if (label) { const s = this._sign(label, Math.min(bw * 0.7, 14), 1.4); s.position.set(0, Math.min(h - 0.9, 4.6 + (columns ? h * 0.78 - 4.6 : 0)), bd / 2 + (columns ? 5.2 : 0.2)); g.add(s); }
    g.rotation.y = rotY; this.group.add(g);
    const cw = face === 'e' || face === 'w' ? bd : bw, cd = face === 'e' || face === 'w' ? bw : bd;
    this.colliders.push({ x1: x - cw / 2 - 0.3, z1: z - cd / 2 - 0.3, x2: x + cw / 2 + 0.3, z2: z + cd / 2 + 0.3, h });
    return g;
  }

  _buildings() {
    const cream = '#efe3c6', green = '#1b5e3a', sand = '#e9d8b4', white = '#f4f1ea';
    this._building({ x: -48, z: 34, w: 40, d: 14, h: 10.5, floors: 3, color: cream, trim: '#7a1f2e', face: 'n', label: 'Female Hostel' });
    this._building({ x: 48, z: 34, w: 40, d: 14, h: 10.5, floors: 3, color: cream, trim: '#1b3a6b', face: 'n', label: 'Male Hostel' });
    this._building({ x: -40, z: -31, w: 46, d: 28, h: 11, floors: 2, color: white, trim: green, face: 's', label: 'Lecture Hall', columns: 6, wide: true });
    this._building({ x: 40, z: -32, w: 32, d: 22, h: 9, floors: 2, color: sand, trim: green, face: 's', label: 'Library', roof: 'hip' });
    this._building({ x: -28, z: 66, w: 24, d: 15, h: 5.5, floors: 1, color: '#f7d9a8', trim: '#b5541a', face: 'n', label: 'Cafeteria', roof: 'hip', roofColor: '#a33b2a' });
    this._building({ x: 28, z: 66, w: 20, d: 15, h: 5.5, floors: 1, color: white, trim: '#c0392b', face: 'n', label: 'Clinic', roof: 'hip', roofColor: '#8a2f2f' });
    this._building({ x: -40, z: -89, w: 38, d: 22, h: 9, floors: 1, color: cream, trim: '#d6a51c', face: 's', label: 'Dining Hall', columns: 4, wide: true });
    this._building({ x: 92, z: -8, w: 26, d: 32, h: 10, floors: 2, color: white, trim: '#1b3a6b', face: 'w', label: 'Bwari Magistrate Court', columns: 4, wide: true });
    // chapel with a steeple and a cross
    const chapel = this._building({ x: 16, z: -88, w: 16, d: 24, h: 8, floors: 1, color: '#f6efe0', trim: '#5b3b2a', face: 's', label: 'Chapel', roof: 'hip', roofColor: '#6d3b2e', windows: true });
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 14, 4), new THREE.MeshStandardMaterial({ color: '#f6efe0' })); tower.position.set(-5, 7, 11); tower.castShadow = true; chapel.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.9, 5, 4), new THREE.MeshStandardMaterial({ color: '#6d3b2e' })); spire.rotation.y = Math.PI / 4; spire.position.set(-5, 16.5, 11); chapel.add(spire);
    const crossMat = new THREE.MeshStandardMaterial({ color: '#d6a51c', metalness: 0.6, roughness: 0.3 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), crossMat); c1.position.set(-5, 20.1, 11); chapel.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.25), crossMat); c2.position.set(-5, 20.5, 11); chapel.add(c2);
    // mosque with a dome and a minaret
    const mosque = this._building({ x: 50, z: -89, w: 22, d: 22, h: 7, floors: 1, color: '#f3f6ee', trim: '#1b7a4a', face: 's', label: 'Mosque' });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2e8b57', roughness: 0.4, metalness: 0.3 })); dome.position.set(0, 7.4, 0); dome.castShadow = true; mosque.add(dome);
    const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 18, 16), new THREE.MeshStandardMaterial({ color: '#f3f6ee' })); minaret.position.set(13, 9, 8); minaret.castShadow = true; mosque.add(minaret);
    const mdome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), dome.material); mdome.position.set(13, 18, 8); mosque.add(mdome);
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 8, 24, Math.PI * 1.5), crossMat); crescent.position.set(0, 14.8, 0); crescent.rotation.z = Math.PI * 0.75; mosque.add(crescent);
    // main gate: two pillars, an arch sign and the flag
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#efe3c6', roughness: 0.8 });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.2, 7, 2.2), pillarMat); p.position.set(sx * 8, 3.5, 94); p.castShadow = true; this.group.add(p); this.colliders.push({ x1: sx * 8 - 1.1, z1: 92.9, x2: sx * 8 + 1.1, z2: 95.1, h: 7 }); const cap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 2.8), new THREE.MeshStandardMaterial({ color: '#7a1f2e' })); cap.position.set(sx * 8, 7.2, 94); this.group.add(cap); }
    const arch = this._sign('NIGERIAN LAW SCHOOL · BWARI CAMPUS', 18, 1.8, '#1b3a2a'); arch.position.set(0, 7.6, 94); this.group.add(arch);
    const arch2 = arch.clone(); arch2.rotation.y = Math.PI; arch2.position.z = 93.95; this.group.add(arch2);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(18.4, 2.2, 0.4), new THREE.MeshStandardMaterial({ color: '#1b3a2a' })); beam.position.set(0, 7.6, 94.02); this.group.add(beam);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 12, 10), new THREE.MeshStandardMaterial({ color: '#cfcfcf', metalness: 0.8, roughness: 0.3 })); pole.position.set(14, 6, 84); this.group.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.8), new THREE.MeshStandardMaterial({ map: canvasTexture(300, 180, (g) => { g.fillStyle = '#008751'; g.fillRect(0, 0, 100, 180); g.fillStyle = '#fff'; g.fillRect(100, 0, 100, 180); g.fillStyle = '#008751'; g.fillRect(200, 0, 100, 180); }), side: THREE.DoubleSide })); flag.position.set(15.55, 11, 84); this.group.add(flag); this.flag = flag;
    // sports field with lines and goalposts
    const field = new THREE.Mesh(new THREE.PlaneGeometry(48, 30), new THREE.MeshStandardMaterial({ color: '#4f9a3a', roughness: 1 })); field.rotation.x = -Math.PI / 2; field.position.set(66, 0.012, 78); field.receiveShadow = true; this.group.add(field);
    const lineMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); this.group.add(m); };
    line(66, 63.3, 46, 0.3); line(66, 92.7, 46, 0.3); line(43.3, 78, 0.3, 30); line(88.7, 78, 0.3, 30); line(66, 78, 0.3, 30);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.9, 48), lineMat); ring.rotation.x = -Math.PI / 2; ring.position.set(66, 0.02, 78); this.group.add(ring);
    const postMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
    for (const gx of [44.5, 87.5]) { for (const dz of [-3.5, 3.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), postMat); p.position.set(gx, 1.2, 78 + dz); this.group.add(p); } const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 8), postMat); bar.rotation.x = Math.PI / 2; bar.position.set(gx, 2.4, 78); this.group.add(bar); }
    // Bwari Junction market: a canopy with stalls (shops come from the props pack)
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 12), new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.8 })); canopy.position.set(-92, 3.6, 16); canopy.castShadow = true; this.group.add(canopy);
    for (const [px, pz] of [[-102, 11], [-82, 11], [-102, 21], [-82, 21]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.6, 8), new THREE.MeshStandardMaterial({ color: '#555' })); p.position.set(px, 1.8, pz); this.group.add(p); }
    const stallMat = new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.9 });
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.6), stallMat); s.position.set(-100 + i * 5.2, 0.5, 16); s.castShadow = true; this.group.add(s); const goods = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: ['#e67e22', '#27ae60', '#f1c40f', '#c0392b'][i] })); goods.position.set(-100 + i * 5.2, 1.25, 16); this.group.add(goods); }
    this.colliders.push({ x1: -103, z1: 15, x2: -82, z2: 17, h: 1 });
    const jsign = this._sign('BWARI JUNCTION MARKET', 12, 1.4, '#7a1f2e'); jsign.position.set(-92, 4.6, 22.2); this.group.add(jsign);
    // suya spot (fire drum)
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 16), new THREE.MeshStandardMaterial({ color: '#2b2b2b', metalness: 0.5 })); drum.position.set(-84, 0.5, 10); this.group.add(drum);
    const fire = new THREE.PointLight('#ff7a1a', 0, 10); fire.position.set(-84, 1.4, 10); this.group.add(fire); this.nightLights.push({ light: fire, max: 2.5 });
  }

  async _props() {
    const props = await loadProps();
    const put = (name, x, z, rotY = 0, s = 4) => { const o = props(name); o.position.set(x, 0, z); o.rotation.y = rotY; o.scale.setScalar(s); this.group.add(o); return o; };
    // streetlights along the roads
    for (let z = -90; z <= 90; z += 24) { put('streetlight', -6.4, z, Math.PI / 2); put('streetlight', 6.4, z + 12, -Math.PI / 2); }
    for (let x = -78; x <= 78; x += 24) { put('streetlight', x, -6.4, 0); put('streetlight', x + 12, 6.4, Math.PI); put('streetlight', x, -62.4, 0); }
    // lamps for night (a few real lights, the rest only glow)
    for (const [x, z] of [[-6.4, 30], [6.4, -30], [-6.4, -70], [40, 6.4], [-40, 6.4], [-78, -6.4], [78, -6.4]]) { const l = new THREE.PointLight('#ffd27a', 0, 26, 1.5); l.position.set(x, 3.6, z); this.group.add(l); this.nightLights.push({ light: l, max: 18 }); }
    // benches and bushes near the doors
    const bench = (x, z, r) => put('bench', x, z, r);
    bench(-44, 12, 0); bench(-52, 12, 0); bench(44, 12, 0); bench(52, 12, 0); bench(-30, -10, Math.PI); bench(-50, -10, Math.PI); bench(34, -12, Math.PI); bench(46, -12, Math.PI); bench(60, 56, 0); bench(72, 56, 0); bench(10, -70, Math.PI); bench(22, -70, Math.PI);
    for (const [x, z] of [[-36, 16], [-60, 16], [36, 16], [60, 16], [-20, -8], [-60, -8], [26, -10], [54, -10], [-18, 54], [-38, 54], [18, 54], [38, 54], [-24, -70], [-56, -70], [8, -70], [24, -70], [42, -70], [58, -70], [74, -18], [74, 2]]) put('bush', x, z, Math.random() * 6, 4 + Math.random() * 2);
    for (const [x, z] of [[-10, 86], [10, 86], [-10, -20], [10, -20]]) put('trash_A', x, z, 0);
    put('dumpster', -70, 40, Math.PI / 2); put('dumpster', 70, 40, -Math.PI / 2); put('watertower', -70, 48, 0, 6); put('trafficlight_A', 7, 80, Math.PI);
    // parked cars at the gate and the junction
    put('car_sedan', -16, 78, Math.PI / 2); put('car_taxi', -16, 72, Math.PI / 2); put('car_hatchback', -74, -3, 0); put('car_police', 16, 72, -Math.PI / 2); put('car_stationwagon', -74, 12, 0);
    // small shops at the junction (KayKit buildings scaled up)
    const shops = ['building_A', 'building_B', 'building_C', 'building_E', 'building_F', 'building_G'];
    shops.forEach((n, i) => { const x = -110 + i * 8.5, z = -14; put(n, x, z, 0, 4.2); this.colliders.push({ x1: x - 4.5, z1: z - 4.5, x2: x + 4.5, z2: z + 4.5, h: 7 }); });
    ['building_D', 'building_H', 'building_B'].forEach((n, i) => { const x = -110 + i * 9, z = 22; put(n, x, z, Math.PI, 4.2); this.colliders.push({ x1: x - 4.5, z1: z - 4.5, x2: x + 4.5, z2: z + 4.5, h: 7 }); });
  }

  _trees() {
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 3.2, 7); const canopyGeo = new THREE.SphereGeometry(2.4, 10, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 1 }); const canopyMat = new THREE.MeshStandardMaterial({ color: '#2f7a2a', roughness: 1 });
    const spots = [];
    const ok = (x, z) => { if (Math.abs(x) < 8 || Math.abs(z) < 8 || Math.abs(z + 56) < 8) return false; for (const c of this.colliders) if (x > c.x1 - 3 && x < c.x2 + 3 && z > c.z1 - 3 && z < c.z2 + 3) return false; if (x > 40 && x < 92 && z > 60 && z < 96) return false; return true; };
    let tries = 0; while (spots.length < 110 && tries++ < 4000) { const x = -112 + Math.random() * 224, z = -112 + Math.random() * 206; if (ok(x, z) && !spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 7)) spots.push([x, z]); }
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length), canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, spots.length);
    const m = new THREE.Matrix4(); const col = new THREE.Color();
    spots.forEach(([x, z], i) => { const s = 0.8 + Math.random() * 0.7; m.makeScale(s, s, s); m.setPosition(x, 1.6 * s, z); trunks.setMatrixAt(i, m); m.makeScale(s, s * (0.8 + Math.random() * 0.4), s); m.setPosition(x, 4.2 * s, z); canopies.setMatrixAt(i, m); canopies.setColorAt(i, col.setHSL(0.3 + Math.random() * 0.06, 0.5, 0.26 + Math.random() * 0.12)); this.colliders.push({ x1: x - 0.4, z1: z - 0.4, x2: x + 0.4, z2: z + 0.4, h: 3 }); });
    trunks.castShadow = canopies.castShadow = true; canopies.receiveShadow = true; this.group.add(trunks, canopies);
  }

  // hour: 0..24 game time. Moves the sun and fades lights.
  setTime(hour, playerPos) {
    const t = ((hour % 24) + 24) % 24; const day = THREE.MathUtils.smoothstep(t, 5.5, 7.5) * (1 - THREE.MathUtils.smoothstep(t, 17.5, 19.5));
    const ang = ((t - 6) / 12) * Math.PI; const sx = Math.cos(ang) * 80, sy = Math.max(Math.sin(ang), -0.2) * 90, sz = 30;
    this.sun.position.set(playerPos.x + sx, Math.max(sy, 8), playerPos.z + sz); this.sun.target.position.copy(playerPos); this.sun.target.updateMatrixWorld();
    this.sun.intensity = 0.15 + 2.1 * day; this.sun.color.setHSL(0.1, 0.5, 0.5 + 0.5 * Math.min(1, day + 0.2));
    const dusk = 1 - Math.abs(day - 0.5) * 2;
    this.hemi.intensity = 0.12 + 0.6 * day;
    const sky = new THREE.Color().lerpColors(new THREE.Color('#0b1430'), new THREE.Color('#9ccbf0'), day).lerp(new THREE.Color('#f0a060'), dusk * 0.35);
    this.scene.background.copy(sky); this.scene.fog.color.copy(sky);
    this.windowMat.emissiveIntensity = (1 - day) * 1.4; this.lampMat.emissiveIntensity = 1 - day; this.scene.environmentIntensity = 0.06 + 0.5 * day;
    for (const { light, max } of this.nightLights) light.intensity = max * (1 - day);
  }

  update(dt, t) { if (this.flag) { this.flag.rotation.y = Math.sin(t * 1.3) * 0.15; } }

  onRoad(x, z) { return this.roadZones.some((r) => x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2); }
}
