import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

// Meshes whose name starts with one of these are used for collision INSTEAD of the visible
// meshes (and are hidden). Handy if you later add a simplified, watertight "collision" mesh.
const COLLIDER_NAME = /^(col|collision|collider|ucx|phys)/i;

/** Merge every mesh under `root` (in world space) into one BVH used for walking collision. */
export function buildCollider(root) {
  root.updateMatrixWorld(true);
  const all = [];
  const explicit = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position) return;
    (COLLIDER_NAME.test(o.name) ? explicit : all).push(o);
  });
  const meshes = explicit.length ? explicit : all;
  if (!meshes.length) throw new Error('The model contains no meshes.');

  let vCount = 0;
  let iCount = 0;
  for (const m of meshes) {
    const g = m.geometry;
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const positions = new Float32Array(vCount * 3);
  const indices = new Uint32Array(iCount);
  const v = new THREE.Vector3();
  let vo = 0;
  let io = 0;
  for (const m of meshes) {
    const g = m.geometry;
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      positions[(vo + i) * 3] = v.x;
      positions[(vo + i) * 3 + 1] = v.y;
      positions[(vo + i) * 3 + 2] = v.z;
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) indices[io + i] = g.index.getX(i) + vo;
      io += g.index.count;
    } else {
      for (let i = 0; i < pos.count; i++) indices[io + i] = vo + i;
      io += pos.count;
    }
    vo += pos.count;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  const bvh = new MeshBVH(geometry, { maxLeafTris: 4 });
  geometry.computeBoundingBox();
  return { bvh, bounds: geometry.boundingBox.clone(), explicit, triangles: iCount / 3 };
}

const _seg = new THREE.Line3();
const _box = new THREE.Box3();
const _triPoint = new THREE.Vector3();
const _capPoint = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _dir = new THREE.Vector3();

/**
 * Push a vertical capsule (feet at `pos`) out of the mesh. Mutates `pos` and `vel`.
 * Returns true when the capsule is resting on something below it.
 */
export function resolveCapsule(bvh, pos, vel, dt, radius, height, walkableY = 0.6) {
  _seg.start.set(pos.x, pos.y + radius, pos.z);
  _seg.end.set(pos.x, pos.y + height - radius, pos.z);
  _box.makeEmpty();
  _box.expandByPoint(_seg.start);
  _box.expandByPoint(_seg.end);
  _box.min.addScalar(-radius);
  _box.max.addScalar(radius);

  bvh.shapecast({
    intersectsBounds: (box) => box.intersectsBox(_box),
    intersectsTriangle: (tri) => {
      const d = tri.closestPointToSegment(_seg, _triPoint, _capPoint);
      if (d < radius) {
        _dir.subVectors(_capPoint, _triPoint);
        if (_dir.lengthSq() < 1e-12) return false;
        _dir.normalize();
        // Contacts that push upward but are steeper than the walkable slope are treated as
        // walls, so the player can't climb onto furniture, ledges or scan bumps.
        if (_dir.y > 0 && _dir.y < walkableY) {
          _dir.y = 0;
          _dir.normalize();
        }
        const depth = radius - d;
        _seg.start.addScaledVector(_dir, depth);
        _seg.end.addScaledVector(_dir, depth);
      }
      return false;
    },
  });

  _delta.set(_seg.start.x - pos.x, _seg.start.y - radius - pos.y, _seg.start.z - pos.z);
  const onGround = _delta.y > Math.abs(dt * vel.y * 0.25);
  const offset = Math.max(0, _delta.length() - 1e-5);
  _delta.normalize().multiplyScalar(offset);
  pos.add(_delta);

  if (!onGround) {
    if (offset > 0) {
      _delta.normalize();
      vel.addScaledVector(_delta, -_delta.dot(vel));
    }
  } else {
    vel.set(0, 0, 0);
  }
  return onGround;
}
