import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { scene } from '../sceneStore';

// GPU starfield: ONE Points draw call for the whole sky (instanced-style buffer,
// never one mesh per star). Slow drift + parallax come from the camera rig.
export default function Starfield3D({ count = 2500 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = 30 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.55;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const b = 0.35 + Math.random() * 0.65;
      col[i * 3] = 0.72 * b;
      col[i * 3 + 1] = 0.82 * b;
      col[i * 3 + 2] = 1.0 * b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);

  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.004 + scene.pointerX * 0.00008;
    }
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.32}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}
