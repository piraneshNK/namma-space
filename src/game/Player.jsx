import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import config from '../config';
import { input } from './input';
import { bestYaw, createPlayerState, findSpawn, stepPlayer } from './movement';

/** First-person walker: a capsule that collides with the room mesh. No jump, no flying. */
export default function Player({ world }) {
  const camera = useThree((s) => s.camera);
  const state = useRef(createPlayerState());
  const bob = useRef(0);
  const cfg = useMemo(() => ({ ...config.player }), []);

  const respawn = (faceOpen) => {
    const s = state.current;
    s.pos.copy(findSpawn(world, cfg.height, config.spawn));
    s.floorY = s.pos.y;
    s.vel.set(0, 0, 0);
    s.hx = 0;
    s.hz = 0;
    if (faceOpen) {
      input.yaw = bestYaw(world, s.pos, cfg.eye);
      input.pitch = 0;
    }
  };

  useEffect(() => {
    camera.rotation.order = 'YXZ';
    respawn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;

    if (input.respawn) { input.respawn = false; respawn(false); }

    let fwd = 0;
    let side = 0;
    let sprint = false;
    if (input.active) {
      const k = input.keys;
      fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + input.moveY;
      side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + input.moveX;
      sprint = k.has('ShiftLeft') || k.has('ShiftRight') || input.sprint;
    }
    const len = Math.hypot(fwd, side);
    if (len > 1) { fwd /= len; side /= len; }

    const sin = Math.sin(input.yaw);
    const cos = Math.cos(input.yaw);
    const wishX = -sin * fwd + cos * side;
    const wishZ = -cos * fwd - sin * side;

    const fell = stepPlayer(world, s, wishX, wishZ, sprint ? cfg.run : cfg.walk, dt, cfg);
    if (fell) respawn(false);

    let bobY = 0;
    if (config.headBob && s.onGround) {
      const speed = Math.hypot(s.hx, s.hz);
      bob.current += speed * dt * 2.4;
      bobY = Math.sin(bob.current) * 0.018 * Math.min(1, speed / cfg.walk);
    }
    camera.position.set(s.pos.x, s.pos.y + cfg.eye + bobY, s.pos.z);
    camera.rotation.set(input.pitch, input.yaw, 0);
  });

  return null;
}
