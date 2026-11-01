import config from '../config';

// Plain mutable object shared between the DOM handlers and the render loop.
export const input = {
  keys: new Set(),
  moveX: 0,      // touch joystick, -1..1
  moveY: 0,      // touch joystick, -1..1 (forward = +)
  sprint: false, // touch joystick pushed all the way
  yaw: 0,
  pitch: 0,
  active: false, // false while the start / pause screen is showing
  respawn: false,
};

export const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function lookBy(dx, dy, sensitivity) {
  input.yaw -= dx * sensitivity;
  input.pitch = Math.max(-1.45, Math.min(1.45, input.pitch - dy * sensitivity));
}

export function installInput() {
  const blockKeys = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const onKeyDown = (e) => {
    if (blockKeys.includes(e.code)) e.preventDefault();
    input.keys.add(e.code);
    if (e.code === 'KeyR') input.respawn = true;
  };
  const onKeyUp = (e) => input.keys.delete(e.code);
  const onBlur = () => input.keys.clear();
  const onMove = (e) => {
    if (!input.active || e.pointerType === 'touch') return;
    if (document.pointerLockElement) lookBy(e.movementX, e.movementY, config.look.mouse);
    else if (e.buttons & 1) lookBy(e.movementX, e.movementY, config.look.mouse); // drag-to-look fallback
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointermove', onMove);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pointermove', onMove);
  };
}
