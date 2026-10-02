import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Design language: a quiet crater-relief moon with phase lighting and glowing
// data markers (Apple-style product 3D, not a wireframe globe). Procedural
// geometry — no photo texture: craters displace the surface, maria darken it,
// a side key light gives a real crescent/terminator.
interface Crater {
  dir: THREE.Vector3;
  radius: number;
  depth: number;
}

function makeCraters(count: number): Crater[] {
  const craters: Crater[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    craters.push({
      dir: new THREE.Vector3(
        Math.sin(p) * Math.cos(t),
        Math.cos(p),
        Math.sin(p) * Math.sin(t)
      ),
      radius: 0.04 + Math.random() * 0.14,
      depth: 0.015 + Math.random() * 0.045,
    });
  }
  return craters;
}

const MARIA: THREE.Vector3[] = [
  new THREE.Vector3(0.55, 0.25, 0.8).normalize(),
  new THREE.Vector3(-0.35, 0.55, 0.75).normalize(),
  new THREE.Vector3(0.1, -0.6, 0.79).normalize(),
  new THREE.Vector3(-0.7, -0.1, 0.7).normalize(),
];

function buildMoonGeometry(radius: number): THREE.BufferGeometry {
  const craters = makeCraters(64);
  const geo = new THREE.SphereGeometry(radius, 96, 64);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const highland = new THREE.Color('#dde2e8');
  const mare = new THREE.Color('#575f69');
  const shade = new THREE.Color();

  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i).normalize();
    let h = 0;
    for (const c of craters) {
      const d = v.angleTo(c.dir);
      if (d < c.radius) {
        const x = d / c.radius;
        h -= c.depth * (1 - x * x);
      } else if (d < c.radius * 1.3) {
        const x = (d - c.radius) / (c.radius * 0.3);
        h += c.depth * 0.5 * Math.sin(x * Math.PI);
      }
    }
    h += 0.006 * Math.sin(v.x * 6.1) * Math.sin(v.y * 5.3) * Math.sin(v.z * 5.7);
    const r = radius * (1 + h);
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);

    shade.copy(highland);
    for (const m of MARIA) {
      const d = v.angleTo(m);
      if (d < 0.8) shade.lerp(mare, 0.85 * (1 - d / 0.8));
    }
    if (h < 0) shade.multiplyScalar(0.82 + h * 3);
    colors[i * 3] = shade.r;
    colors[i * 3 + 1] = shade.g;
    colors[i * 3 + 2] = shade.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export default function MoonMesh({
  radius = 1.6,
  spin = 0.05,
}: {
  radius?: number;
  spin?: number;
}) {
  const bodyRef = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => buildMoonGeometry(radius), [radius]);

  useFrame((_, dt) => {
    if (bodyRef.current) bodyRef.current.rotation.y += dt * spin;
  });

  return (
    <group>
      {/* side key light = real crescent/terminator; low fill keeps the dark side */}
      <directionalLight position={[7, 2.5, 1.2]} intensity={2.6} color="#fff7ea" />
      <directionalLight position={[-6, -2, -3]} intensity={0.15} color="#3a5a7a" />
      <ambientLight intensity={0.07} color="#6d87a3" />
      <mesh ref={bodyRef} geometry={geo}>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
