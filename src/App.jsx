import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import config from './config';
import Room from './game/Room';
import Player from './game/Player';
import Overlay from './ui/Overlay';
import TouchControls from './ui/TouchControls';
import { input, installInput, isTouch } from './game/input';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel center">
        <h1>Couldn’t load the room</h1>
        <p className="dim">Make sure the file exists at <code>{config.modelUrl}</code> (put it in <code>public/room.glb</code>).</p>
        <p className="tiny dim">{String(this.state.error?.message || this.state.error)}</p>
      </div>
    );
  }
}

function Lights() {
  // Only matters in PBR mode; baked/unlit scans ignore lights.
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#ffffff', '#6b6358', 0.9]} />
      <Environment resolution={128} background={false}>
        <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={1} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1} position={[-6, 2, 0]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
      </Environment>
    </>
  );
}

export default function App() {
  const [world, setWorld] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => installInput(), []);
  useEffect(() => { input.active = playing; if (!playing) { input.moveX = 0; input.moveY = 0; input.sprint = false; } }, [playing]);
  useEffect(() => {
    if (isTouch) return undefined;
    const onLock = () => { if (!document.pointerLockElement) setPlaying(false); };
    document.addEventListener('pointerlockchange', onLock);
    return () => document.removeEventListener('pointerlockchange', onLock);
  }, []);

  const start = () => {
    if (!isTouch) document.querySelector('canvas')?.requestPointerLock?.();
    setPlaying(true);
  };

  return (
    <ErrorBoundary>
      <Canvas
        dpr={[1, config.maxPixelRatio]}
        camera={{ fov: config.fov, near: 0.05, far: 200, position: [0, 1.6, 0] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ scene }) => { scene.background = new THREE.Color('#05070d'); }}
      >
        <Suspense fallback={null}>
          <Room onReady={setWorld} />
          <Lights />
        </Suspense>
        {world && <Player world={world} />}
      </Canvas>
      <Overlay world={world} playing={playing} onStart={start} />
      {playing && isTouch && <TouchControls />}
    </ErrorBoundary>
  );
}
