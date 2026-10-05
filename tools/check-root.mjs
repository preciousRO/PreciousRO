import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const walk=(n,d)=>{ if(d>3)return; console.log(' '.repeat(d*2)+n.getName()+' t='+n.getTranslation().map(v=>v.toFixed(2))+' s='+n.getScale().map(v=>v.toFixed(2))+(n.getMesh()?' [mesh]':'')); if(d<2) n.listChildren().forEach(c=>walk(c,d+1)); };
  console.log('==',f.split('/').slice(-1)[0]); doc.getRoot().listScenes()[0].listChildren().forEach(n=>walk(n,0));
  const skin=doc.getRoot().listSkins()[0]; console.log('skin joints', skin.listJoints().length, 'first', skin.listJoints().slice(0,3).map(j=>j.getName()).join(','));
}
