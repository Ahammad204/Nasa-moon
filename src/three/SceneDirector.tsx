import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { FpsGuard } from './perf';
import { scene } from './sceneStore';

export type RouteKey = 'home' | 'missions' | 'map' | 'compare' | 'payloads' | 'other';

const CAMS: Record<RouteKey, { pos: [number, number, number]; look: [number, number, number] }> = {
  home: { pos: [0, 0.3, 7], look: [0, 0, 0] },
  missions: { pos: [-2.2, 1.4, 8], look: [-0.6, 0, 0] },
  map: { pos: [0, 0, 5.6], look: [0, 0, 0] },
  compare: { pos: [2.6, -1.2, 7.4], look: [0.4, 0, 0] },
  payloads: { pos: [0, 2.4, 8.6], look: [0, 0.4, 0] },
  other: { pos: [0, 0, 8], look: [0, 0, 0] },
};

// Drives the one shared camera: per-route targets (navigation drifts, never cuts)
// plus pointer/scroll parallax, and runs the FPS degrade guard.
export default function SceneDirector({
  route,
  children,
}: {
  route: RouteKey;
  children?: ReactNode;
}) {
  const guard = useMemo(() => new FpsGuard(), []);
  const posTarget = useRef(new THREE.Vector3(0, 0, 7));
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const lookCurrent = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(({ camera }, dt) => {
    guard.tick(performance.now());
    const cfg = CAMS[route] ?? CAMS.other;
    const drift = Math.min(scene.scrollY / 900, 3);
    // The map globe sits in a framed stage (K04): full parallax would swing it
    // behind the header/H1 chrome, so damp the pointer offset on that route.
    const par = route === 'map' ? 0.25 : 1;

    posTarget.current.set(
      cfg.pos[0] + scene.pointerX * 0.6 * par,
      cfg.pos[1] - scene.pointerY * 0.4 * par - drift * 0.8,
      cfg.pos[2] + drift * 0.5
    );
    lookTarget.current.set(cfg.look[0], cfg.look[1] - drift * 0.3, cfg.look[2]);

    camera.position.lerp(posTarget.current, Math.min(1, dt * 2.2));
    lookCurrent.current.lerp(lookTarget.current, Math.min(1, dt * 2.2));
    camera.lookAt(lookCurrent.current);
  });

  return <>{children}</>;
}
