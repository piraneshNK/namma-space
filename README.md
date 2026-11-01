# Namma Space – first-person room walkthrough

React + three.js (react-three-fiber). You stand **inside** `room.glb` as a person: walk, run and look
around, with real collision against the room's mesh. You can't walk through walls or furniture,
can't leave the model, can't fly or jump up, and can't climb onto furniture.

## Run it

```bash
npm install          # also copies the Draco + KTX2 decoders into /public
npm run dev          # http://localhost:5173
```

Your model is `public/room.glb` (currently the *Apartment LiDAR Scan* you sent; replace the file to use another room).

## Controls

| Desktop | Phone / tablet |
|---|---|
| Click → mouse look (Esc to pause) | Left thumb: walk (push to the edge to run) |
| W A S D / arrows: walk, Shift: run | Right thumb: look |
| R: respawn, L: switch baked ↔ PBR lighting | |

## Deploy on Vercel

1. Push this folder to GitHub.
2. In Vercel: **Add New → Project →** pick the repo. Framework is detected as **Vite** (build `npm run build`, output `dist`).
3. Deploy. `vercel.json` already adds caching headers for the model and decoders.

## How the "person inside the room" part works

- `src/game/collision.js` merges every mesh of the GLB into one BVH (three-mesh-bvh) and pushes a **capsule** (1.7 m tall, 0.28 m radius) out of any triangle it touches.
- `src/game/movement.js` adds gravity, sub-stepping (no tunnelling through walls even on slow frames), a bounding-box clamp (a hard "can't leave the model" and "can't go above the ceiling" net), a slope limit, and a max climb height of 0.35 m above your starting floor.
- On load it finds a floor point with enough head-room near the centre of the model and turns you toward the most open direction. If you land somewhere odd, press **R**, or set `?spawn=x,z` (metres).
- The scan is rendered unlit (colours exactly as scanned) with the original texture quality, max anisotropic filtering and up to 2× pixel ratio.

## Tuning (everything is in `src/config.js`)

- Wrong size? The app scales a model to a 2.7 m ceiling only if its height is outside 2.2–4.5 units. Force it with `?scale=1.5` or set `autoScale: false`.
- Speed, body size, eye height, FOV, head bob, `maxRise`, `walkable` are all in `player` / top-level options.
- Different file: `?model=room-4k.glb` (put it in `public/`).
- Optional: add a simplified, watertight mesh named `collision…` inside the GLB and it will be used for collision instead of the detailed mesh (and hidden).

## Quality vs. speed

`room.glb` is ~26 MB. For faster loading without a visible quality loss:

```bash
npx @gltf-transform/cli optimize public/room.glb public/room.glb --compress meshopt --texture-compress webp
```

Decoders for Draco, Meshopt and KTX2 are built in, so compressed GLBs load as-is.
Keep the 8k texture for desktop; if phones struggle, ship a 4k version and open it with `?model=room-4k.glb`.

## Known limits of scans

LiDAR scans can have holes. The bounding-box clamp stops you leaving the model, but if a wall has a hole
you may be able to stand in the gap. Adding a `collision…` mesh (see above) fixes that properly.

## Tests

`npm test` runs a headless collision test (closed room + pillar, random sprinting, slow frames).

## Credit

“Apartment LiDAR Scan with 3DScannerApp” by **jakeblakeley**, licensed **CC BY 4.0**
(https://sketchfab.com/3d-models/apartment-lidar-scan-with-3dscannerapp-9cc5b5a0fac24e308d3c651826379c94).
The credit is shown on the start screen; if you replace the model, update or remove `credit` in `src/config.js`.
