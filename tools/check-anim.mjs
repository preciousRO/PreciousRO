import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const anim = doc.getRoot().listAnimations()[0];
  let dur = 0; const info = [];
  for (const ch of anim.listChannels()) {
    const node = ch.getTargetNode(); const s = ch.getSampler();
    const inp = s.getInput(); dur = Math.max(dur, inp.getMax([0])[0]);
    if (node.getName() === 'Hips' && ch.getTargetPath() === 'translation') {
      const out = s.getOutput(); info.push('hips min ' + out.getMin([0,0,0]).map(v=>v.toFixed(2)) + ' max ' + out.getMax([0,0,0]).map(v=>v.toFixed(2)));
    }
    if (node.getName() === 'Armature' || node.getParentNode() === null) info.push('root:' + node.getName()+'/'+ch.getTargetPath());
  }
  const roots = doc.getRoot().listScenes()[0].listChildren().map(n=>n.getName()+' s='+n.getScale().map(v=>v.toFixed(2)));
  console.log(f.split('/').slice(-1)[0], 'dur', dur.toFixed(2), 'channels', anim.listChannels().length, info.join(' | '), 'scene roots:', roots.join(','));
}
