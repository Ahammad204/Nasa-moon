import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { hasMapPosition, missions } from '../../lib/missions';
import MoonModel from '../primitives/MoonModel';
import { latLonToVector3, MARKER_GEO, MARKER_MAT } from '../primitives/Marker3D';

// Home hero: wireframe moon with real landing-site markers (correct-ish relative
// positions from the dataset). The whole group spins so markers stay put on their
// features. Ambience — interaction lives on the Map (L03).
export default function HomeScene() {
  const groupRef = useRef<THREE.Group>(null);

  const markers = useMemo(
    () =>
      missions
        .filter(hasMapPosition)
        .map((m) => ({
          id: m.id,
          pos: latLonToVector3(
            m.landingSite!.latitude!,
            m.landingSite!.longitude!,
            1.5 * 1.03
          ),
        })),
    []
  );

  const { size } = useThree();

  // Frame the moon for the viewport: one-column hero (phones) puts it in the
  // centered visual slot under the copy; wider layouts dock it right, pulled
  // in by aspect so it never clips on portrait tablets. The breakpoint must
  // match CSS media queries — the canvas is a classic-scrollbar narrower than
  // window.innerWidth (768 vs ~753), which would disagree with the grid.
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const compact = vw < 768;

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.05;
  });

  const aspect = size.width / size.height;
  // Dock right but keep the whole disc on-canvas: x + radius(1.5) + margin
  // must fit inside the half-width (3.64·aspect at fov 55, z 7).
  const moonPos: [number, number, number] = compact
    ? [0, -1.8, 0]
    : [Math.min(2.3, 3.64 * aspect - 1.6), 0.3, 0];

  return (
    <>
      <group ref={groupRef} position={moonPos} scale={compact ? 0.62 : 1}>
        <MoonModel radius={1.5} spin={0} />
        {markers.map((m) => (
          <mesh key={m.id} geometry={MARKER_GEO} material={MARKER_MAT} position={m.pos} />
        ))}
      </group>
      {/* World-fixed fill (same fix as MapScene): the key light rides the
          spinning group, so at some phases the camera-facing half goes black. */}
      <directionalLight position={[-3, 2, 6]} intensity={1} color="#b9cde8" />
    </>
  );
}
