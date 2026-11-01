import * as THREE from 'three';
import { resolveCapsule } from './collision.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createPlayerState() {
  return { pos: new THREE.Vector3(), vel: new THREE.Vector3(), hx: 0, hz: 0, onGround: false };
}

/**
 * Advance the player one frame.
 *  wishX/wishZ: world-space direction (length 0..1), speed: m/s at full input.
 * Returns true if the player fell out of the world (caller should respawn).
 * There is deliberately no jump, and the player is clamped inside the model's bounds.
 */
export function stepPlayer(world, s, wishX, wishZ, speed, dt, cfg) {
  const k = 1 - Math.exp(-cfg.accel * dt);
  s.hx += (wishX * speed - s.hx) * k;
  s.hz += (wishZ * speed - s.hz) * k;
  s.vel.y = Math.max(s.vel.y - cfg.gravity * dt, -30);

  // Sub-step so fast movement / long frames can never tunnel through a wall.
  const travel = Math.max(Math.hypot(s.hx, s.hz), Math.abs(s.vel.y)) * dt;
  const steps = Math.min(10, Math.max(1, Math.ceil(travel / (cfg.radius * 0.4))));
  const sdt = dt / steps;
  for (let i = 0; i < steps; i++) {
    const px = s.pos.x;
    const py = s.pos.y;
    const pz = s.pos.z;
    s.pos.x += s.hx * sdt;
    s.pos.z += s.hz * sdt;
    s.pos.y += s.vel.y * sdt;
    s.onGround = resolveCapsule(world.bvh, s.pos, s.vel, sdt, cfg.radius, cfg.height, cfg.walkable);

    // No climbing: scans have soft furniture edges that can ramp the capsule upward.
    // Anything higher than `maxRise` above the starting floor is treated as out of bounds.
    if (s.floorY !== undefined && cfg.maxRise != null && s.pos.y > s.floorY + cfg.maxRise) {
      s.pos.set(px, Math.min(py, s.floorY + cfg.maxRise), pz);
      s.vel.y = Math.min(s.vel.y, 0);
      s.hx *= 0.5;
      s.hz *= 0.5;
    }
  }

  // Hard safety net: never leave the model's bounding box, never go above the ceiling.
  const b = world.bounds;
  s.pos.x = clamp(s.pos.x, b.min.x + cfg.radius, b.max.x - cfg.radius);
  s.pos.z = clamp(s.pos.z, b.min.z + cfg.radius, b.max.z - cfg.radius);
  const maxY = b.max.y - cfg.height;
  if (s.pos.y > maxY) {
    s.pos.y = maxY;
    if (s.vel.y > 0) s.vel.y = 0;
  }
  return s.pos.y < b.min.y - 2;
}

/** Find a floor point with enough headroom, starting at the room centre (or `preferred` [x,z]). */
export function findSpawn(world, height, preferred) {
  const b = world.bounds;
  const c = b.getCenter(new THREE.Vector3());
  const size = b.getSize(new THREE.Vector3());
  const candidates = [];
  if (preferred && preferred.length === 2 && preferred.every(Number.isFinite)) candidates.push(preferred);
  candidates.push([c.x, c.z]);
  for (const f of [0.1, 0.2, 0.3, 0.4]) {
    for (let a = 0; a < 8; a++) {
      candidates.push([c.x + Math.cos((a * Math.PI) / 4) * size.x * f, c.z + Math.sin((a * Math.PI) / 4) * size.z * f]);
    }
  }
  const ray = new THREE.Ray();
  for (const [x, z] of candidates) {
    ray.origin.set(x, c.y, z);
    ray.direction.set(0, -1, 0);
    const down = world.bvh.raycastFirst(ray, THREE.DoubleSide);
    if (!down) continue;
    const floorY = down.point.y;
    ray.origin.set(x, floorY + 0.05, z);
    ray.direction.set(0, 1, 0);
    const up = world.bvh.raycastFirst(ray, THREE.DoubleSide);
    if (up && up.distance < height + 0.1) continue;
    return new THREE.Vector3(x, floorY + 0.02, z);
  }
  return new THREE.Vector3(c.x, b.min.y + 0.5, c.z);
}

/** Yaw (radians) that faces the most open direction from `pos`. */
export function bestYaw(world, pos, eye) {
  const ray = new THREE.Ray();
  let best = 0;
  let bestDist = -1;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ray.origin.set(pos.x, pos.y + eye, pos.z);
    ray.direction.set(-Math.sin(a), 0, -Math.cos(a));
    const hit = world.bvh.raycastFirst(ray, THREE.DoubleSide);
    const d = hit ? hit.distance : 50;
    if (d > bestDist) { bestDist = d; best = a; }
  }
  return best;
}
