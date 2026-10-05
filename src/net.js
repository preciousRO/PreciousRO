// Multiplayer: everyone on the campus sees each other walk, chat with speech bubbles, and can talk by voice nearby.
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';
import { Avatar } from './avatar.js';
import { SUPABASE_URL, SUPABASE_KEY, ROOM } from './config.js';

const SEND_HZ = 8, VOICE_RANGE = 16;

export class Net {
  constructor(scene, ui) {
    this.scene = scene; this.ui = ui; this.id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())).slice(0, 8);
    this.remotes = new Map(); this.channel = null; this.online = 1; this.acc = 0; this.lastSent = null; this.getState = null; this.connected = false;
    this.voice = { on: false, stream: null, peers: new Map() };
  }

  async connect(name, config, getState) {
    this.name = name; this.config = config; this.getState = getState;
    try {
      this.sb = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { params: { eventsPerSecond: 20 } } });
      this.channel = this.sb.channel(ROOM, { config: { presence: { key: this.id }, broadcast: { self: false, ack: false } } });
      this.channel
        .on('presence', { event: 'sync' }, () => this._sync())
        .on('presence', { event: 'leave' }, ({ key }) => this._leave(key))
        .on('broadcast', { event: 'move' }, ({ payload }) => this._move(payload))
        .on('broadcast', { event: 'chat' }, ({ payload }) => this._chat(payload))
        .on('broadcast', { event: 'anim' }, ({ payload }) => this._anim(payload))
        .on('broadcast', { event: 'cfg' }, ({ payload }) => this._cfg(payload))
        .on('broadcast', { event: 'rtc' }, ({ payload }) => this._rtc(payload))
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') { this.connected = true; await this._track(); this.ui.addChat('', 'Connected. Everyone on this campus can read you.', 'sys'); }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { this.ui.addChat('', 'Campus chat is offline right now. Single player still works.', 'sys'); }
        });
    } catch (e) { console.warn('net', e); this.ui.addChat('', 'Campus chat unavailable. Single player still works.', 'sys'); }
  }
  async _track() { const s = this.getState(); await this.channel.track({ name: this.name, cfg: this.config, p: s.p, r: s.r, voice: this.voice.on, t: Date.now() }); }

  _sync() {
    const state = this.channel.presenceState(); const ids = new Set();
    for (const [key, metas] of Object.entries(state)) {
      if (key === this.id) continue; ids.add(key); const m = metas[metas.length - 1];
      if (!this.remotes.has(key)) this._join(key, m); else { const r = this.remotes.get(key); if (m.voice && !r.voice) { r.voice = true; this._maybeCall(key); } r.name = m.name; }
    }
    for (const key of [...this.remotes.keys()]) if (!ids.has(key)) this._leave(key);
    this.online = ids.size + 1; this.ui.setOnline(this.online);
  }
  _join(key, m) {
    const r = { id: key, name: m.name || 'Aspirant', avatar: null, target: new THREE.Vector3(...(m.p || [0, 0, 84])), rot: m.r || 0, anim: 'idle', speed: 0, voice: !!m.voice, lastSeen: performance.now(), loading: true };
    this.remotes.set(key, r);
    const av = new Avatar(this.scene, { ...(m.cfg || {}), name: r.name }, { tagClass: 'is-remote' });
    av.group.position.copy(r.target); av.group.rotation.y = r.rot;
    av.load().then(() => { if (!this.remotes.has(key)) { av.dispose(); return; } r.avatar = av; r.loading = false; this.ui.addChat('', r.name + ' is on campus', 'sys'); if (r.voice) this._maybeCall(key); }).catch((e) => console.warn('remote avatar', e));
  }
  _leave(key) { const r = this.remotes.get(key); if (!r) return; this.remotes.delete(key); r.avatar?.dispose(); this._hangup(key); this.ui.addChat('', r.name + ' left the campus', 'sys'); this.online = this.remotes.size + 1; this.ui.setOnline(this.online); }
  _move(p) { const r = this.remotes.get(p.id); if (!r) return; r.target.set(p.p[0], 0, p.p[2]); r.rot = p.r; r.anim = p.a; r.speed = p.s || 0; r.lastSeen = performance.now(); if (r.avatar && p.f !== undefined) r.avatar.setFormal(!!p.f); }
  _chat(p) { const r = this.remotes.get(p.id); this.ui.addChat(p.name || r?.name || 'Someone', p.text); r?.avatar?.say(p.text); }
  _anim(p) { const r = this.remotes.get(p.id); if (!r?.avatar) return; if (/dance/.test(p.name)) r.avatar.play(p.name); else r.avatar.play(p.name, { once: true }); }
  _cfg(p) { const r = this.remotes.get(p.id); if (!r?.avatar) return; r.name = p.cfg.name || r.name; if (p.cfg.gender && p.cfg.gender !== r.avatar.config.gender) { const old = r.avatar; r.avatar = null; old.dispose(); const av = new Avatar(this.scene, { ...p.cfg }, { tagClass: 'is-remote' }); av.group.position.copy(r.target); av.load().then(() => { if (this.remotes.get(p.id) === r) r.avatar = av; else av.dispose(); }); } else r.avatar.setConfig(p.cfg); }

  send(event, payload) { if (!this.connected) return; this.channel.send({ type: 'broadcast', event, payload: { id: this.id, ...payload } }).catch(() => {}); }
  sendChat(text) { this.send('chat', { name: this.name, text }); }
  sendAnim(name) { this.send('anim', { name }); }
  updateConfig(cfg) { this.config = cfg; this.name = cfg.name || this.name; this.send('cfg', { cfg }); if (this.connected) this._track().catch(() => {}); }

  update(dt) {
    if (this.connected && this.getState) {
      this.acc += dt; const s = this.getState(); const key = s.p.map((v) => v.toFixed(1)).join(',') + '|' + s.r.toFixed(2) + '|' + s.a + '|' + s.f;
      if (this.acc >= 1 / SEND_HZ && (key !== this.lastSent || this.acc > 2)) { this.acc = 0; this.lastSent = key; this.send('move', { p: s.p, r: s.r, a: s.a, s: s.s, f: s.f }); }
    }
    const now = performance.now();
    for (const r of this.remotes.values()) {
      const av = r.avatar; if (!av) continue;
      const pos = av.group.position; const d = pos.distanceTo(r.target);
      if (d > 8) pos.copy(r.target); else if (d > 0.02) { const k = Math.min(1, dt * 10); pos.lerp(r.target, k); }
      let diff = r.rot - av.group.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); av.group.rotation.y += diff * Math.min(1, dt * 10);
      if (r.anim === 'walk' || r.anim === 'run') av.setMoving(r.anim === 'run' ? 4.6 : 1.65); else if (av.loopName === 'walk' || av.loopName === 'run') av.setMoving(0);
      av.update(dt);
      if (r.audio) { const dist = this.getState ? Math.hypot(this.getState().p[0] - pos.x, this.getState().p[2] - pos.z) : 0; r.audio.volume = THREE.MathUtils.clamp(1 - (dist - 3) / (VOICE_RANGE - 3), 0, 1); }
      if (now - r.lastSeen > 60000 && !r.loading) { /* stale: presence will clean it up */ }
    }
  }

  // ---- voice (WebRTC mesh, signalled over the same channel) ----
  async toggleVoice() {
    if (this.voice.on) { this.voice.on = false; this.voice.stream?.getTracks().forEach((t) => t.stop()); this.voice.stream = null; for (const k of [...this.voice.peers.keys()]) this._hangup(k); this.ui.setMic(false); if (this.connected) this._track().catch(() => {}); return false; }
    try { this.voice.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false }); }
    catch (e) { this.ui.toast('Microphone not allowed'); return false; }
    this.voice.on = true; this.ui.setMic(true); if (this.connected) await this._track().catch(() => {});
    for (const [k, r] of this.remotes) if (r.voice) this._maybeCall(k);
    return true;
  }
  _maybeCall(key) { if (!this.voice.on || this.voice.peers.has(key)) return; if (this.id < key) this._call(key, true); }
  _pc(key) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] });
    this.voice.stream?.getTracks().forEach((t) => pc.addTrack(t, this.voice.stream));
    pc.onicecandidate = (e) => { if (e.candidate) this.send('rtc', { to: key, kind: 'ice', data: e.candidate.toJSON() }); };
    pc.ontrack = (e) => { const r = this.remotes.get(key); if (!r) return; if (!r.audio) { r.audio = document.createElement('audio'); r.audio.autoplay = true; r.audio.playsInline = true; document.body.appendChild(r.audio); } r.audio.srcObject = e.streams[0]; r.audio.play().catch(() => {}); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) this._hangup(key, true); };
    this.voice.peers.set(key, pc); return pc;
  }
  async _call(key) { const pc = this._pc(key); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); this.send('rtc', { to: key, kind: 'offer', data: pc.localDescription.toJSON() }); }
  async _rtc(p) {
    if (p.to !== this.id) return; const from = p.id;
    try {
      if (p.kind === 'offer') { if (!this.voice.on) return; this._hangup(from, true); const pc = this._pc(from); await pc.setRemoteDescription(p.data); const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); this.send('rtc', { to: from, kind: 'answer', data: pc.localDescription.toJSON() }); }
      else if (p.kind === 'answer') { const pc = this.voice.peers.get(from); if (pc) await pc.setRemoteDescription(p.data); }
      else if (p.kind === 'ice') { const pc = this.voice.peers.get(from); if (pc) await pc.addIceCandidate(p.data).catch(() => {}); }
    } catch (e) { console.warn('rtc', e); }
  }
  _hangup(key, keepRemote = false) { const pc = this.voice.peers.get(key); if (pc) { pc.close(); this.voice.peers.delete(key); } const r = this.remotes.get(key); if (r?.audio) { r.audio.srcObject = null; r.audio.remove(); r.audio = null; } if (!keepRemote) return; if (r && this.voice.on && r.voice && this.id < key) setTimeout(() => this._maybeCall(key), 1500); }
}
