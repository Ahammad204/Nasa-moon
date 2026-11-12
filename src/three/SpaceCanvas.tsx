import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import SceneDirector, { type RouteKey } from './SceneDirector';
import Starfield3D from './primitives/Starfield3D';
import HomeScene from './scenes/HomeScene';
import MapScene from './scenes/MapScene';
import { attachSceneInputs, useSceneFlags, useSceneQuality } from './sceneStore';

function starCount(quality: number): number {
  if (quality < 2) return 500;
  const mobile = window.innerWidth < 500 || (navigator.hardwareConcurrency ?? 8) <= 4;
  return mobile ? 800 : 2500;
}

// The ONE persistent WebGL canvas (brief's core rule). Mounted once in AppShell;
// route changes only re-render the scene contents/camera targets inside it.
export default function SpaceCanvas({ route }: { route: RouteKey }) {
  const quality = useSceneQuality();
  const { mapMode } = useSceneFlags();
  useEffect(() => attachSceneInputs(), []);

  // Interactive routes get pointer events (globe drag, node clicks);
  // ambience-only routes never block the DOM underneath. The payloads graph
  // lives in its own panel canvas now (PayloadGraphPanel), so this canvas
  // is ambience-only on that route too.
  const interactive = route === 'map' && mapMode === 'globe';

  return (
    <div
      data-space-canvas="1"
      className={`fixed inset-0 z-0 ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        camera={{ fov: 55, position: [0, 0, 7] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <SceneDirector route={route}>
          <Starfield3D count={starCount(quality)} />
          {route === 'home' && <HomeScene />}
          {route === 'map' && mapMode === 'globe' && <MapScene />}
        </SceneDirector>
      </Canvas>
    </div>
  );
}
