import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import SceneDirector, { type RouteKey } from './SceneDirector';
import Starfield3D from './primitives/Starfield3D';
import CompareScene from './scenes/CompareScene';
import HomeScene from './scenes/HomeScene';
import MapScene from './scenes/MapScene';
import PayloadsScene from './scenes/PayloadsScene';
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
  const { mapMode, compareIds } = useSceneFlags();
  useEffect(() => attachSceneInputs(), []);

  // Interactive routes get pointer events (globe drag, node clicks);
  // ambience-only routes never block the DOM underneath.
  const interactive = (route === 'map' && mapMode === 'globe') || route === 'payloads';

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
          {route === 'compare' && compareIds.length >= 2 && <CompareScene />}
          {route === 'payloads' && <PayloadsScene />}
        </SceneDirector>
      </Canvas>
    </div>
  );
}
