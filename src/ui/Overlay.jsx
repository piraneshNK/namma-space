import { useProgress } from '@react-three/drei';
import config from '../config';
import { isTouch } from '../game/input';

export default function Overlay({ world, playing, onStart }) {
  const { progress } = useProgress();
  const credit = config.credit;

  if (!world) {
    return (
      <div className="panel center">
        <h1>Namma Space</h1>
        <div className="bar"><div style={{ width: `${Math.max(4, progress)}%` }} /></div>
        <p className="dim">Loading room… {Math.round(progress)}%</p>
      </div>
    );
  }

  if (playing) {
    return (
      <>
        <div className="cross" />
        {!isTouch && <div className="hint">Esc pause · R respawn · L lighting · Shift run</div>}
      </>
    );
  }

  return (
    <div className="panel center" onClick={onStart}>
      <h1>Namma Space</h1>
      <p className="dim">You are standing inside the room. Walk around – you can’t leave it.</p>
      <button className="go">{isTouch ? 'Tap to enter' : 'Click to enter'}</button>
      <p className="keys">
        {isTouch
          ? 'Left thumb: walk (push to the edge to run) · Right thumb: look'
          : 'W A S D / arrows: walk · Mouse: look · Shift: run · R: respawn · L: lighting · Esc: pause'}
      </p>
      <p className="tiny dim">
        Room {world.size.x.toFixed(1)} × {world.size.z.toFixed(1)} × {world.size.y.toFixed(1)} m
        {world.scale !== 1 ? ` · scaled ×${world.scale.toFixed(2)}` : ''}
      </p>
      {credit && (
        <p className="tiny dim">
          “{credit.title}” by <a href={credit.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{credit.author}</a>, {credit.license}
        </p>
      )}
    </div>
  );
}
