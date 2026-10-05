import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Resolve asset URLs from this script's own location so hosting under any page URL works.
export const BASE = new URL('../', import.meta.url).href;
export const url = (p) => new URL(p, BASE).href;

const loader = new GLTFLoader();
const cache = new Map();
export function loadGLTF(path) {
  if (!cache.has(path)) cache.set(path, loader.loadAsync(url(path)));
  return cache.get(path);
}
export async function loadJSON(path) {
  const r = await fetch(url(path));
  if (!r.ok) throw new Error('Failed to load ' + path);
  return r.json();
}

let props = null;
// KayKit city bits: one GLB with one scene per prop. Returns a factory: props('bench') -> fresh Object3D.
export async function loadProps() {
  if (props) return props;
  const gltf = await loadGLTF('props/kaykit.glb');
  const map = new Map();
  for (const scene of gltf.scenes) {
    const root = scene.children[0] || scene;
    map.set(root.name, root);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  props = (name) => { const src = map.get(name); if (!src) { console.warn('prop missing', name); return new THREE.Group(); } const c = src.clone(true); return c; };
  props.names = [...map.keys()];
  return props;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
