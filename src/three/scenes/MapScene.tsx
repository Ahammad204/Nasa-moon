import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hasMapPosition, missions } from '../../lib/missions';
import {
  latLonToVector3,
  MARKER_GEO,
  MARKER_MAT,
  MARKER_MAT_SELECTED,
} from '../primitives/Marker3D';
import MoonModel from '../primitives/MoonModel';
import { attachPicker } from '../pick';
import { scene, selectFromScene, useSceneFlags } from '../sceneStore';

const R = 2.1;

// Interactive 3D globe (L03): drag rotates (DOM buttons drive the same yaw/pitch
// fields for keyboard parity), markers are real data points; click selects, and
// the DOM panel in MapPage mirrors the selection both ways.
//
// K04 framing: the moon must read as the stage centerpiece, never as a backdrop
// behind the page chrome. The sphere's vertical offset is computed per frame so
// its top edge always clears the header/H1 cluster (and shrinks on narrow
// viewports where that cluster is taller), and a selection turns the globe to
// face the chosen site so a list click is always answered in view.
export default function MapScene() {
  const groupRef = useRef<THREE.Group>(null);
  const markersRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const face = useRef<{ yaw: number; pitch: number } | null>(null);
  const { gl, camera, size } = useThree();
  const { selectedId } = useSceneFlags();

  const markers = useMemo(
    () =>
      missions.filter(hasMapPosition).map((m) => {
        const lat = m.landingSite!.latitude!;
        const lon = m.landingSite!.longitude!;
        // 1.06R clears the displaced surface (crater rims lift to ≈1.036R).
        return { id: m.id, lat, lon, pos: latLonToVector3(lat, lon, R * 1.06) };
      }),
    []
  );

  // One-shot facing: rotate yaw/pitch toward the selected landing site.
  // Free drag cancels it (see pointerdown below) so it never fights the user.
  useEffect(() => {
    if (!selectedId) {
      face.current = null;
      return;
    }
    const m = markers.find((x) => x.id === selectedId);
    if (!m) {
      face.current = null;
      return;
    }
    // Derivation: Rx(pitch)·Ry(yaw) maps (cos·cosLon, sinLat, cos·sinLon) → +Z
    // exactly when yaw = lon − π/2 and pitch = lat (both clamped like the drag).
    const lonR = (m.lon * Math.PI) / 180;
    const latR = (m.lat * Math.PI) / 180;
    face.current = {
      yaw: lonR - Math.PI / 2,
      pitch: Math.max(-1.1, Math.min(1.1, latR)),
    };
  }, [selectedId, markers]);

  useEffect(() => {
    const root = groupRef.current;
    if (!root) return;
    return attachPicker(gl.domElement, camera, root, (hit) => {
      const id = hit.object.userData.missionId as string | undefined;
      if (id) selectFromScene(id);
    });
  }, [gl, camera]);

  useEffect(() => {
    const el = gl.domElement;
    let dragging = false;
    let px = 0;
    let py = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      face.current = null; // the user takes over; stop auto-facing
      px = e.clientX;
      py = e.clientY;
      el.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      scene.globe.yaw += (e.clientX - px) * 0.005;
      scene.globe.pitch = Math.max(-1.1, Math.min(1.1, scene.globe.pitch + (e.clientY - py) * 0.003));
      px = e.clientX;
      py = e.clientY;
    };
    const up = () => {
      dragging = false;
      el.style.cursor = 'grab';
    };
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.style.cursor = '';
    };
  }, [gl]);

  useFrame((_, dt) => {
    const g = scene.globe;
    if (g.cmd) {
      if (g.cmd === 'left') g.yaw -= 0.3;
      if (g.cmd === 'right') g.yaw += 0.3;
      if (g.cmd === 'in') g.zoom = Math.max(3.6, g.zoom - 0.8);
      if (g.cmd === 'out') g.zoom = Math.min(9, g.zoom + 0.8);
      g.cmd = null;
    }
    if (face.current) {
      const k = Math.min(1, dt * 3);
      const dyaw = Math.atan2(Math.sin(face.current.yaw - g.yaw), Math.cos(face.current.yaw - g.yaw));
      const dpitch = face.current.pitch - g.pitch;
      g.yaw += dyaw * k;
      g.pitch += dpitch * k;
      if (Math.abs(dyaw) < 0.01 && Math.abs(dpitch) < 0.01) face.current = null;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = g.yaw;
      groupRef.current.rotation.x = g.pitch;
      // Framing math (camera at z=5.6, fov 55 → half-height 2.915 world units):
      // moon radius = 0.36·viewportH at scale 1; the group's world −y offset d
      // shifts it down by 0.1715·d·viewportH pixels. Solve d so the sphere's
      // top edge lands `clearPx` below the viewport top (header + H1 row).
      const compact = size.width < 768;
      const rFrac = (compact ? 0.72 : 1) * 0.36;
      const clearPx = compact ? 300 : 165;
      const d = Math.max(0, Math.min(2, (clearPx / size.height - 0.5 + rFrac) / 0.1715));
      groupRef.current.position.y = -d;
      groupRef.current.scale.setScalar((6 / g.zoom) * (compact ? 0.72 : 1));
    }
    markersRef.current.forEach((mesh, id) => {
      mesh.material = id === g.selectedId ? MARKER_MAT_SELECTED : MARKER_MAT;
    });
  });

  return (
    <>
      <group ref={groupRef} position={[0, 0, 0]}>
        <MoonModel radius={R} spin={0} />
        {markers.map((m) => (
          <mesh
            key={m.id}
            geometry={MARKER_GEO}
            material={MARKER_MAT}
            position={m.pos}
            userData={{ kind: 'marker', missionId: m.id }}
            ref={(mesh) => {
              if (mesh) markersRef.current.set(m.id, mesh);
              else markersRef.current.delete(m.id);
            }}
          />
        ))}
      </group>
      {/* World-fixed fill: the moon's key light rotates with the group, so at
          some orientations the camera-facing half goes black — the user must
          always be able to read the surface they are dragging. */}
      <directionalLight position={[-3, 2, 6]} intensity={1} color="#b9cde8" />
    </>
  );
}
