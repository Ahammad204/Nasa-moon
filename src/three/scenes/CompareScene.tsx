import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COMPARE_FIELDS } from '../../lib/compare';
import { getMissionById } from '../../lib/missions';
import { useSceneFlags } from '../sceneStore';

const COL_GAP = 2.6;
const ROW_GAP = 0.62;

function difference(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) {
    const max = Math.max(Math.abs(na), Math.abs(nb), 1);
    return Math.min(1, Math.abs(na - nb) / max);
  }
  return a === b ? 0 : 1;
}

// Spatial compare (L04): each selected mission is a depth-staggered column of
// field nodes (7 per mission, real COMPARE_FIELDS order). Connectors between
// columns carry MEANING: color intensity ∝ how different the two values are
// (numeric delta where possible, otherwise 0=same / 1=different). The DOM table
// below remains the accessible source of truth.
export default function CompareScene() {
  const { compareIds } = useSceneFlags();
  const spinRef = useRef<THREE.Group>(null);

  const data = useMemo(() => {
    const missions = compareIds
      .map((id) => getMissionById(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .slice(0, 3);
    const cols = missions.map((m, ci) => ({
      id: m.id,
      x: (ci - (missions.length - 1) / 2) * COL_GAP,
      z: ci * 0.5,
      values: COMPARE_FIELDS.map((f) => f.value(m)),
    }));
    const segments: number[] = [];
    const colors: number[] = [];
    for (let c = 0; c < cols.length - 1; c += 1) {
      for (let r = 0; r < COMPARE_FIELDS.length; r += 1) {
        const d = difference(cols[c].values[r], cols[c + 1].values[r]);
        segments.push(cols[c].x, -r * ROW_GAP, cols[c].z, cols[c + 1].x, -r * ROW_GAP, cols[c + 1].z);
        const intensity = 0.12 + d * 0.88;
        colors.push(0.23 * intensity, 0.74 * intensity, 0.97 * intensity);
        colors.push(0.23 * intensity, 0.74 * intensity, 0.97 * intensity);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return { cols, geo };
  }, [compareIds]);

  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.y += dt * 0.06;
  });

  if (data.cols.length < 2) return null;

  return (
    <group ref={spinRef} position={[0, 1.2, 0]} rotation={[0.12, -0.35, 0]}>
      <lineSegments geometry={data.geo}>
        <lineBasicMaterial vertexColors transparent opacity={0.9} />
      </lineSegments>
      {data.cols.map((col, ci) =>
        COMPARE_FIELDS.map((_, ri) => (
          <mesh
            key={`${col.id}-${ri}`}
            position={[col.x, -ri * ROW_GAP, col.z]}
          >
            <sphereGeometry args={[ri === 0 ? 0.11 : 0.075, 10, 10]} />
            <meshBasicMaterial color={ci === 0 ? '#38bdf8' : ci === 1 ? '#7dd3fc' : '#fbbf24'} />
          </mesh>
        ))
      )}
    </group>
  );
}
