import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import MoonMesh from './MoonMesh';

// NASA Solar System Exploration "Earth's Moon" model (Moon_1_3474.glb, public
// domain), self-hosted so runtime makes no external requests. Geometry bounds
// are ±500 units — scaled to `radius`. The procedural MoonMesh stays as the
// Suspense fallback (load / no-WebGL parity): no blank frames while fetching.
const MODEL_URL = '/models/moon.glb';
const MODEL_R = 500;

function TexturedMoon({ radius, spin }: { radius: number; spin: number }) {
  const { scene } = useGLTF(MODEL_URL);
  const spinRef = useRef<THREE.Group>(null);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        const map = obj.material.map;
        if (map) map.anisotropy = 16;
      }
    });
    return clone;
  }, [scene]);

  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.y += dt * spin;
  });

  return (
    <group>
      {/* Same rig as the procedural moon so the swap doesn't rebalance the scene. */}
      <directionalLight position={[7, 2.5, 1.2]} intensity={2.6} color="#fff7ea" />
      <directionalLight position={[-6, -2, -3]} intensity={0.15} color="#3a5a7a" />
      <ambientLight intensity={0.07} color="#6d87a3" />
      <group ref={spinRef}>
        <group scale={radius / MODEL_R}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}

export default function MoonModel({
  radius = 1.6,
  spin = 0,
}: {
  radius?: number;
  spin?: number;
}) {
  return (
    <Suspense fallback={<MoonMesh radius={radius} spin={spin} />}>
      <TexturedMoon radius={radius} spin={spin} />
    </Suspense>
  );
}

useGLTF.preload(MODEL_URL);
