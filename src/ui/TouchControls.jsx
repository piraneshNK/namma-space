import { useRef, useState } from 'react';
import config from '../config';
import { input, lookBy } from '../game/input';

const RADIUS = 56;

/** Left thumb = move joystick, right thumb = look. Only mounted on touch devices. */
export default function TouchControls() {
  const joy = useRef(null);
  const look = useRef(null);
  const [knob, setKnob] = useState(null); // {cx, cy, dx, dy}

  const onJoyDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    joy.current = { id: e.pointerId, cx: e.clientX, cy: e.clientY };
    setKnob({ cx: e.clientX, cy: e.clientY, dx: 0, dy: 0 });
  };
  const onJoyMove = (e) => {
    const j = joy.current;
    if (!j || j.id !== e.pointerId) return;
    let dx = e.clientX - j.cx;
    let dy = e.clientY - j.cy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx = (dx / d) * RADIUS; dy = (dy / d) * RADIUS; }
    input.moveX = dx / RADIUS;
    input.moveY = -dy / RADIUS;
    input.sprint = Math.hypot(dx, dy) / RADIUS > 0.92;
    setKnob({ cx: j.cx, cy: j.cy, dx, dy });
  };
  const onJoyUp = (e) => {
    if (joy.current?.id !== e.pointerId) return;
    joy.current = null;
    input.moveX = 0; input.moveY = 0; input.sprint = false;
    setKnob(null);
  };

  const onLookDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onLookMove = (e) => {
    const l = look.current;
    if (!l || l.id !== e.pointerId) return;
    lookBy(e.clientX - l.x, e.clientY - l.y, config.look.touch);
    l.x = e.clientX; l.y = e.clientY;
  };
  const onLookUp = (e) => { if (look.current?.id === e.pointerId) look.current = null; };

  return (
    <>
      <div className="zone left" onPointerDown={onJoyDown} onPointerMove={onJoyMove} onPointerUp={onJoyUp} onPointerCancel={onJoyUp} />
      <div className="zone right" onPointerDown={onLookDown} onPointerMove={onLookMove} onPointerUp={onLookUp} onPointerCancel={onLookUp} />
      {knob && (
        <div className="joy" style={{ left: knob.cx - RADIUS, top: knob.cy - RADIUS }}>
          <div className="joy-knob" style={{ transform: `translate(${knob.dx}px, ${knob.dy}px)` }} />
        </div>
      )}
    </>
  );
}
