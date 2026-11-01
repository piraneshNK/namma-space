// ─────────────────────────────────────────────────────────────
//  Everything you are likely to tweak lives here.
//  Units are metres (after the model has been scaled, see below).
// ─────────────────────────────────────────────────────────────
const q = new URLSearchParams(window.location.search);

export default {
  // Shown on the start screen. CC-BY requires crediting the author; set to null for your own model.
  credit: {
    title: 'Apartment LiDAR Scan with 3DScannerApp',
    author: 'jakeblakeley',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/apartment-lidar-scan-with-3dscannerapp-9cc5b5a0fac24e308d3c651826379c94',
  },

  // Model file. Put yours at /public/room.glb. Override with  ?model=room-4k.glb
  modelUrl: q.get('model') || '/room.glb',

  // Scale: if the model's height is outside 2.2–4.5 units it is scaled so the
  // room becomes `targetCeiling` metres tall. Set autoScale:false to keep the
  // file's own scale, or force a factor with  ?scale=1.5
  autoScale: true,
  targetCeiling: 2.7,
  scaleOverride: q.get('scale') ? Number(q.get('scale')) : null,

  // 'auto' = unlit/baked look when the model has no normals (typical scans),
  // PBR lighting otherwise. Press L in the app to toggle. 'pbr' | 'baked' also valid.
  shading: 'auto',

  // Where you start (x,z in model metres). null = centre of the room. Or  ?spawn=1.2,-0.5
  spawn: q.get('spawn') ? q.get('spawn').split(',').map(Number) : null,

  player: {
    height: 1.7,     // total body height
    eye: 1.6,        // camera height above the floor
    radius: 0.28,    // body width (collision capsule)
    walk: 1.8,       // m/s
    run: 3.4,        // m/s  (hold Shift, or push the joystick all the way)
    accel: 12,       // how quickly you reach full speed (higher = snappier)
    gravity: 22,
    maxRise: 0.35,   // max height above your starting floor you can ever reach (no climbing furniture). null = off
    walkable: 0.6,   // steeper contacts act as walls (0.6 ≈ 53°). Raise to 0.8 to block even small ledges.
  },

  look: { mouse: 0.0022, touch: 0.0042 },
  fov: 72,
  headBob: true,
  maxPixelRatio: 2,   // lower to 1.5 if a laptop struggles
};
