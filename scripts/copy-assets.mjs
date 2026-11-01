// Copies the Draco and KTX2 (Basis) decoders out of three.js into /public so they are
// served from your own domain (no third-party CDN needed). Runs automatically after npm install.
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const jobs = [
  ['node_modules/three/examples/jsm/libs/basis', 'public/basis'],
  ['node_modules/three/examples/jsm/libs/draco/gltf', 'public/draco'],
];
for (const [from, to] of jobs) {
  if (!existsSync(from)) { console.warn(`[copy-assets] missing ${from}, skipped`); continue; }
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-assets] ${from} -> ${to}`);
}
