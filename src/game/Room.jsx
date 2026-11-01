import { useEffect, useState } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import config from '../config';
import { buildCollider } from './collision';

const TEXTURE_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];

function applyShading(root, mode) {
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    if (!o.userData.orig) o.userData.orig = o.material;
    const orig = o.userData.orig;
    if (mode === 'baked' && !orig.isMeshBasicMaterial) {
      o.userData.baked ??= new THREE.MeshBasicMaterial({
        map: orig.map,
        color: orig.map ? 0xffffff : orig.color,
        vertexColors: orig.vertexColors,
        toneMapped: false,
      });
      o.material = o.userData.baked;
    } else {
      o.material = orig;
      if (!orig.isMeshBasicMaterial && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    }
    o.material.side = THREE.DoubleSide;          // scans are often single-sided / flipped
    if (o.material.isMeshBasicMaterial) o.material.toneMapped = false; // keep scan colours exact
    o.material.needsUpdate = true;
  });
}

export default function Room({ onReady }) {
  const gl = useThree((s) => s.gl);
  const gltf = useLoader(GLTFLoader, config.modelUrl, (loader) => {
    loader.setDRACOLoader(new DRACOLoader().setDecoderPath('/draco/'));
    loader.setKTX2Loader(new KTX2Loader().setTranscoderPath('/basis/').detectSupport(gl));
    loader.setMeshoptDecoder(MeshoptDecoder);
  });
  const root = gltf.scene;
  const [mode, setMode] = useState(null);

  // One-time setup: scale -> texture quality -> collision mesh.
  useEffect(() => {
    const raw = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    let scale = 1;
    if (config.scaleOverride) scale = config.scaleOverride;
    else if (config.autoScale && (raw.y < 2.2 || raw.y > 4.5)) scale = config.targetCeiling / raw.y;
    root.scale.setScalar(scale);
    root.updateMatrixWorld(true);

    const maxAniso = gl.capabilities.getMaxAnisotropy();
    let hasNormals = true;
    let anyUnlit = false;
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        for (const slot of TEXTURE_SLOTS) if (m[slot]) m[slot].anisotropy = maxAniso;
        if (m.isMeshBasicMaterial) anyUnlit = true;
      }
      if (!o.geometry.attributes.normal) hasNormals = false;
    });

    const collider = buildCollider(root);
    collider.explicit.forEach((o) => { o.visible = false; });
    setMode(config.shading === 'auto' ? (!hasNormals || anyUnlit ? 'baked' : 'pbr') : config.shading);
    onReady({ ...collider, scale, size: collider.bounds.getSize(new THREE.Vector3()) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  useEffect(() => { if (mode) applyShading(root, mode); }, [root, mode]);

  useEffect(() => {
    const onKey = (e) => { if (e.code === 'KeyL') setMode((m) => (m === 'baked' ? 'pbr' : 'baked')); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <primitive object={root} />;
}
