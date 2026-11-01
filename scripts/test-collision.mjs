// Headless check of the walking collision: closed box room + a pillar, random sprinting, long frames.
import * as THREE from 'three';
import { buildCollider } from '../src/game/collision.js';
import { createPlayerState, findSpawn, stepPlayer } from '../src/game/movement.js';

const cfg = { height: 1.7, radius: 0.28, accel: 12, gravity: 22, maxRise: 0.35, walkable: 0.6 };
const room = new THREE.Group();
const shell = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 5));
shell.position.set(0, 1.3, 0);
const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.6));
pillar.position.set(0.8, 1.3, 0.5);
room.add(shell, pillar);
const world = buildCollider(room);

let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
let failures = 0;
const fail = (m) => { failures++; console.error('FAIL', m); };

function run(dt, frames, speed) {
  const s = createPlayerState();
  s.pos.copy(findSpawn(world, cfg.height, null));
  s.floorY = s.pos.y;
  let a = 0;
  for (let i = 0; i < frames; i++) {
    if (i % 40 === 0) a = rnd() * Math.PI * 2;
    stepPlayer(world, s, -Math.sin(a), -Math.cos(a), speed, dt, cfg);
    const { x, y, z } = s.pos;
    if (Math.abs(x) > 2.001 || Math.abs(z) > 2.501) fail(`left the room at frame ${i}: ${x.toFixed(2)},${z.toFixed(2)}`);
    if (y < -0.05 || y > cfg.maxRise + 0.001) fail(`bad height ${y.toFixed(3)} at frame ${i}`);
    const dx = Math.max(0.5 - x, 0, x - 1.1);
    const dz = Math.max(0.2 - z, 0, z - 0.8);
    if (Math.hypot(dx, dz) < cfg.radius - 0.04) fail(`inside pillar at frame ${i}: ${x.toFixed(2)},${z.toFixed(2)}`);
  }
  return s;
}

const spawn = findSpawn(world, cfg.height, null);
if (Math.abs(spawn.y) > 0.05) fail(`spawn not on floor: ${spawn.y}`);

const drop = createPlayerState();
drop.pos.set(-1, 0.9, -1);
for (let i = 0; i < 120; i++) stepPlayer(world, drop, 0, 0, 0, 1 / 60, cfg);
if (Math.abs(drop.pos.y) > 0.03) fail(`did not land on floor: ${drop.pos.y}`);

run(1 / 60, 6000, 3.4);
run(1 / 20, 3000, 3.4);   // worst-case frame time used by the app
run(1 / 30, 3000, 9);     // far faster than the real run speed
console.log(failures ? `${failures} failure(s)` : 'collision tests passed');
process.exit(failures ? 1 : 0);
