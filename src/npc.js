// Coursemates who live on the campus: they wander between places, idle, dance and talk.
import * as THREE from 'three';
import { Avatar } from './avatar.js';
import { LOCATIONS } from './world.js';
import { NPC_DATA } from './game.js';

const LOOKS = {
  tunde: { gender: 'm', head: 'm2_head', hair: 'proc:low', hairColor: '#141414', skin: '#4e2c1a', top: 'm2_top', topColor: '#2c3e50', bottom: 'm2_bottom', bottomColor: '#111111', shoes: 'm2_shoes', shoesColor: '#111111', glasses: true },
  amaka: { gender: 'f', head: 'f1_head', hair: 'proc:braids', hairColor: '#2b1a10', skin: '#8a5a3a', top: 'f1_top', topColor: '#e84393', bottom: 'f1_bottom', bottomColor: '#111111', shoes: 'f1_shoes', shoesColor: null },
  musa: { gender: 'm', head: 'm1_head', hair: 'proc:cap', hairColor: '#16a085', skin: '#6b4027', top: 'm2_top', topColor: '#16a085', bottom: 'm2_bottom', bottomColor: '#7f8c8d', shoes: 'm2_shoes', shoesColor: '#ffffff', beard: true },
  ngozi: { gender: 'f', head: 'f1_head', hair: 'proc:hijab', hairColor: '#141414', skin: '#a9764f', top: 'f1_top', topColor: '#8e44ad', bottom: 'f1_bottom', bottomColor: '#2c3e50', shoes: 'f1_shoes', shoesColor: '#111111' },
  bayo: { gender: 'm', head: 'm2_head', hair: 'proc:fade', hairColor: '#141414', skin: '#36200f', top: 'm1_top', topColor: '#2c3e50', bottom: 'm1_bottom', bottomColor: '#2c3e50', shoes: 'm1_shoes', shoesColor: '#111111' },
};
const HOMES = { tunde: 'library', amaka: 'sports', musa: 'buka', ngozi: 'hostel', bayo: 'lecture' };
const FORMAL = new Set(['lecture', 'library', 'dining', 'court']);

export class NPCs {
  constructor(scene, world, controls) { this.scene = scene; this.world = world; this.controls = controls; this.list = []; this.hit = []; }
  async spawn() {
    await Promise.all(NPC_DATA.map(async (d, i) => {
      const av = new Avatar(this.scene, { ...LOOKS[d.id], name: d.name }, { tagClass: 'is-npc' });
      await av.load();
      const home = LOCATIONS.find((l) => l.id === HOMES[d.id]);
      av.group.position.set(home.door[0] + (i - 2) * 1.5, 0, home.door[1] + 2);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.9, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.95; hit.userData.npc = d.id; av.group.add(hit); this.hit.push(hit);
      this.list.push({ id: d.id, name: d.name, avatar: av, target: null, wait: 3 + Math.random() * 10, busy: false, loc: home });
    }));
  }
  byId(id) { return this.list.find((n) => n.id === id); }
  pick(raycaster) { const hits = raycaster.intersectObjects(this.hit, false); return hits.length ? this.byId(hits[0].object.userData.npc) : null; }
  nearest(pos, max = 2.6) { let best = null, bd = max; for (const n of this.list) { const d = n.avatar.group.position.distanceTo(pos); if (d < bd) { bd = d; best = n; } } return best; }
  face(n, pos) { const p = n.avatar.group.position; n.avatar.group.rotation.y = Math.atan2(pos.x - p.x, pos.z - p.z); }
  setBusy(n, on, playerPos) { n.busy = on; n.target = null; if (on && playerPos) { this.face(n, playerPos); n.avatar.setMoving(0); } }

  update(dt, hour) {
    for (const n of this.list) {
      const av = n.avatar; if (!av.loaded) continue;
      if (n.busy) { av.setMoving(0); av.update(dt); continue; }
      const pos = av.group.position;
      if (!n.target) {
        n.wait -= dt;
        if (n.wait <= 0) {
          // pick somewhere to go: lectures in the morning, hostel at night, otherwise anywhere
          let loc; const r = Math.random();
          if (hour >= 8.5 && hour < 12 && r < 0.6) loc = LOCATIONS.find((l) => l.id === 'lecture');
          else if ((hour >= 22 || hour < 6) && r < 0.7) loc = LOCATIONS.filter((l) => l.id === 'hostel')[n.avatar.config.gender === 'f' ? 0 : 1];
          else loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
          const a = Math.random() * Math.PI * 2, rr = 2 + Math.random() * 3;
          n.target = new THREE.Vector3(loc.door[0] + Math.cos(a) * rr, 0, loc.door[1] + 3 + Math.sin(a) * rr); n.loc = loc; n.stuck = 0;
          if (av.loopName && /dance/.test(av.loopName)) av.play('idle');
        } else {
          av.setMoving(0);
          if (n.loc?.id === 'sports' && Math.random() < dt * 0.05 && !av.isBusy()) av.setDancing(1 + Math.floor(Math.random() * 3));
        }
      } else {
        const dx = n.target.x - pos.x, dz = n.target.z - pos.z; const d = Math.hypot(dx, dz);
        if (d < 0.6) { n.target = null; n.wait = 15 + Math.random() * 40; av.setMoving(0); av.setFormal(FORMAL.has(n.loc?.id)); }
        else {
          const sp = 1.5; const before = pos.clone(); this.controls.move(pos, (dx / d) * sp * dt, (dz / d) * sp * dt);
          const real = before.distanceTo(pos) / dt; if (real < 0.3) { n.stuck += dt; if (n.stuck > 1.5) { n.target = null; n.wait = 2; } } else n.stuck = 0;
          const ang = Math.atan2(dx, dz); let diff = ang - av.group.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); av.group.rotation.y += diff * Math.min(1, dt * 8);
          av.setMoving(Math.max(real, 0.6));
        }
      }
      av.update(dt);
    }
  }
}
