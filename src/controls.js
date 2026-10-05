// Third person controls: WASD / arrows, click or tap to walk, drag to orbit, wheel to zoom, touch joystick.
import * as THREE from 'three';

const WALK = 1.65, RUN = 4.6, RADIUS = 0.38;

export class Controls {
  constructor(camera, dom, world) {
    this.camera = camera; this.dom = dom; this.world = world; this.player = null;
    this.keys = new Set(); this.yaw = Math.PI; this.pitch = 0.32; this.dist = 6.5; this.target = null; this.joy = { x: 0, y: 0, active: false }; this.runToggle = false;
    this.enabled = true; this.focus = null; this.onTap = null; this.onInteract = null;
    this.camPos = new THREE.Vector3(); this.lookAt = new THREE.Vector3(); this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._bind();
  }

  _bind() {
    const d = this.dom;
    window.addEventListener('keydown', (e) => { if (this._typing()) return; this.keys.add(e.code); if (e.code === 'KeyE' || e.code === 'Space') { this.onInteract?.(); e.preventDefault(); } if (e.code === 'ShiftLeft') this.runToggle = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); if (e.code === 'ShiftLeft') this.runToggle = false; });
    window.addEventListener('blur', () => this.keys.clear());
    let down = null, moved = false;
    d.addEventListener('pointerdown', (e) => { if (e.target !== d) return; down = { x: e.clientX, y: e.clientY, id: e.pointerId, b: e.button }; moved = false; d.setPointerCapture(e.pointerId); });
    d.addEventListener('pointermove', (e) => { if (!down || e.pointerId !== down.id) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!moved && Math.hypot(dx, dy) > 6) moved = true; if (moved) { this.yaw -= (e.movementX || 0) * 0.0045; this.pitch = THREE.MathUtils.clamp(this.pitch + (e.movementY || 0) * 0.003, -0.15, 1.2); } });
    const up = (e) => { if (!down || e.pointerId !== down.id) return; if (!moved && down.b === 0) this._tap(e.clientX, e.clientY); down = null; };
    d.addEventListener('pointerup', up); d.addEventListener('pointercancel', () => { down = null; });
    d.addEventListener('wheel', (e) => { this.dist = THREE.MathUtils.clamp(this.dist + e.deltaY * 0.01, 2.2, 16); e.preventDefault(); }, { passive: false });
    d.addEventListener('contextmenu', (e) => e.preventDefault());
    // pinch zoom
    let pinch = 0; d.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
    d.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && pinch) { const p = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); this.dist = THREE.MathUtils.clamp(this.dist - (p - pinch) * 0.03, 2.2, 16); pinch = p; } }, { passive: true });
  }
  _typing() { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); }

  _tap(cx, cy) {
    if (!this.enabled || !this.player) return;
    const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    if (this.onTap && this.onTap(this.ray)) return;
    const p = new THREE.Vector3(); if (this.ray.ray.intersectPlane(this.plane, p)) { this.target = p; this._marker(p); }
  }
  _marker(p) { if (!this.marker) { this.marker = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.4, 24), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.9 })); this.marker.rotation.x = -Math.PI / 2; this.world.scene.add(this.marker); } this.marker.position.set(p.x, 0.03, p.z); this.marker.visible = true; this.markerT = 1.2; }

  // Moves a circle of RADIUS from pos by (dx, dz), sliding along colliders. Returns the new position.
  move(pos, dx, dz) {
    const cs = this.world.colliders; const b = this.world.bounds;
    const step = (axis, delta) => {
      if (!delta) return; pos[axis] += delta;
      for (const c of cs) {
        if (pos.x + RADIUS > c.x1 && pos.x - RADIUS < c.x2 && pos.z + RADIUS > c.z1 && pos.z - RADIUS < c.z2) {
          if (axis === 'x') pos.x = delta > 0 ? c.x1 - RADIUS : c.x2 + RADIUS; else pos.z = delta > 0 ? c.z1 - RADIUS : c.z2 + RADIUS;
        }
      }
      pos.x = THREE.MathUtils.clamp(pos.x, b.x1, b.x2); pos.z = THREE.MathUtils.clamp(pos.z, b.z1, b.z2);
    };
    step('x', dx); step('z', dz); return pos;
  }

  update(dt) {
    const p = this.player; if (!p || !p.loaded) return;
    const pos = p.group.position;
    let vx = 0, vz = 0;
    if (this.enabled && !this.focus) {
      const k = this.keys; let ix = 0, iz = 0;
      if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1; if (k.has('KeyS') || k.has('ArrowDown')) iz += 1; if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1; if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
      if (this.joy.active) { ix += this.joy.x; iz += this.joy.y; }
      const len = Math.hypot(ix, iz);
      if (len > 0.1) {
        this.target = null; if (this.marker) this.marker.visible = false;
        const n = Math.min(1, len); const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
        // camera relative: forward is away from the camera
        const fx = -sy, fz = -cy; const rx = cy, rz = -sy;
        const dx = (fx * -iz + rx * ix) / len, dz = (fz * -iz + rz * ix) / len;
        const sp = (this.runToggle || len > 0.95 && this.joy.active && len > 0.98 ? RUN : WALK) * n;
        vx = dx * sp; vz = dz * sp;
      } else if (this.target) {
        const dx = this.target.x - pos.x, dz = this.target.z - pos.z; const d = Math.hypot(dx, dz);
        if (d < 0.35) { this.target = null; if (this.marker) this.marker.visible = false; }
        else { const sp = d > 12 ? RUN : WALK; vx = (dx / d) * sp; vz = (dz / d) * sp; }
      }
    }
    const speed = Math.hypot(vx, vz);
    if (speed > 0.05) {
      const before = pos.clone(); this.move(pos, vx * dt, vz * dt);
      const real = before.distanceTo(pos) / dt;
      if (real < 0.2 && this.target) { this.stuck = (this.stuck || 0) + dt; if (this.stuck > 1.2) { this.target = null; this.stuck = 0; if (this.marker) this.marker.visible = false; } } else this.stuck = 0;
      const ang = Math.atan2(vx, vz); let diff = ang - p.group.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); p.group.rotation.y += diff * Math.min(1, dt * 12);
      p.setMoving(Math.min(speed, real + 0.3 > speed ? speed : real));
    } else p.setMoving(0);
    if (this.marker && this.marker.visible) { this.markerT -= dt; this.marker.material.opacity = Math.max(0.2, this.markerT); this.marker.scale.setScalar(1 + Math.sin(performance.now() * 0.008) * 0.1); }
    // camera
    const f = this.focus; const dist = f ? f.dist : this.dist; const pitch = f ? f.pitch : this.pitch; const yaw = f ? f.yaw : this.yaw;
    const look = f ? f.at.clone() : new THREE.Vector3(pos.x, pos.y + 1.45, pos.z);
    const off = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist);
    const want = look.clone().add(off);
    // keep the camera out of buildings by shortening the boom
    if (!f) { const dir = want.clone().sub(look); const L = dir.length(); dir.normalize(); let best = L; for (const c of this.world.colliders) { if (c.h < 2.5) continue; const t = rayBox(look, dir, c); if (t !== null && t < best) best = Math.max(1.2, t - 0.4); } if (best < L) want.copy(look).add(dir.multiplyScalar(best)); }
    want.y = Math.max(want.y, 0.6);
    const k = f ? Math.min(1, dt * 4) : Math.min(1, dt * 9);
    this.camPos.lerp(want, k); this.lookAt.lerp(look, k);
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.lookAt);
  }

  // Orbit the camera around a point (used by the avatar creator)
  setFocus(at, { dist = 2.6, yaw = Math.PI * 0.15, pitch = 0.05 } = {}) { this.focus = at ? { at, dist, yaw, pitch } : null; }
  snap() { this.update(1); this.camPos.copy(this.camera.position); }
}

function rayBox(o, d, c) {
  const min = [c.x1, 0, c.z1], max = [c.x2, c.h, c.z2]; const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z]; let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) { if (Math.abs(dd[i]) < 1e-6) { if (oo[i] < min[i] || oo[i] > max[i]) return null; } else { let a = (min[i] - oo[i]) / dd[i], b = (max[i] - oo[i]) / dd[i]; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null; } }
  return t0 > 0 ? t0 : null;
}
