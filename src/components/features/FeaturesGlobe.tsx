// Lunar Feature Explorer — 3D globe view (Phase 3b, globe).
//
// Local <Canvas> inside a lazy component (same pattern as
// NavigatorScene3D): the three.js code loads on demand only, never in the
// /features first-load chunk. NOT the shared SpaceCanvas — the map is a
// bounded panel inside a content grid.
//
// Cells: ONE InstancedMesh of a single unit patch geometry (built for the
// current cellDeg at lat [0, cellDeg), lon [0, cellDeg)), one instance per
// non-empty cell, positioned by the rigid rotation in globeGeometry (centre
// exact, local north preserved). Colour = densityColor, exactly the flat
// map's scale. Radius 1.05R: measured rim displacement reaches ~1.036R,
// so 1.05R clears the surface with margin; markers sit at 1.06R.
//
// Differences from the flat map, by design:
// - Opacity is uniform (the page's opacity prop): per-instance alpha is
//   not supported, so the flat map's count-based alpha ramp (faint cells
//   fainter) has no globe equivalent. The colour scale is identical.
// - While picking a near point, ANY globe click sets the near point —
//   including clicks on cells and markers — and never selects a cell
//   (cleaner than the flat map, where a cell click still selects).
// - Canvas cells are not keyboard-focusable; the filters and the feature
//   list stay fully keyboard-operable (same mitigation as the flat map's
//   canvas-renderer note).
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import MoonModel from '../../three/primitives/MoonModel';
import { latLonToVector3, MARKER_GEO, MARKER_MAT } from '../../three/primitives/Marker3D';
import { attachPicker } from '../../three/pick';
import { CATEGORY_COLORS } from '../../lib/features/categories';
import { densityColor } from '../../lib/features/density';
import type { GridCell, LunarFeatureRecord } from '../../lib/features/engine';
import {
  buildCellPatch,
  cellInstanceQuaternion,
  clampGlobeZoom,
  facingForLatLon,
  GLOBE_PITCH_CLAMP,
  GLOBE_ZOOM_MAX,
  GLOBE_ZOOM_MIN,
  vectorToLatLon,
  zoomToGroupScale,
} from '../../lib/features/globeGeometry';
import type { Mission } from '../../lib/types';

const R = 2.1;
// 1.05R clears the displaced surface (crater rims lift to ~1.036R).
const CELL_RADIUS = R * 1.05;
// Markers sit just above the cells, same as MapScene (1.06R).
const MARKER_RADIUS = R * 1.06;
// Selected-cell overlay: above the cell patches, below the markers.
const SELECTED_RADIUS = R * 1.058;

const NEAR_POINT_MAT = new THREE.MeshBasicMaterial({ color: '#fb7185' });

export interface FeaturesGlobeProps {
  cells: GridCell[];
  maxDensity: number;
  opacity: number;
  mode: 'heat' | 'markers';
  /** Filtered features to draw as markers (parent caps at 500). */
  markers: LunarFeatureRecord[];
  /** True when markers are hidden: too many features and not zoomed in. */
  markersBlocked: boolean;
  blockedCount: number;
  cellDeg: 2.5 | 5 | 10;
  selectedCellId: string | null;
  selectedFeatureId: number | null;
  showMissions: boolean;
  missionsWithCoords: Mission[];
  pickingNearPoint: boolean;
  nearPoint: { lat: number; lon: number; radiusKm: number } | null;
  /** Current zoom in the page's own units ([1, 7]); drives group scale. */
  zoom: number;
  onCellClick: (cellId: string) => void;
  onFeatureClick: (feature: LunarFeatureRecord) => void;
  onMissionClick: (mission: Mission) => void;
  onMapClick: (lat: number, lon: number) => void;
  onZoomChange: (zoom: number) => void;
}

function GlobeScene(props: FeaturesGlobeProps) {
  const {
    cells,
    maxDensity,
    opacity,
    mode,
    markers,
    cellDeg,
    selectedCellId,
    selectedFeatureId,
    showMissions,
    missionsWithCoords,
    pickingNearPoint,
    nearPoint,
    zoom,
    onCellClick,
    onFeatureClick,
    onMissionClick,
    onMapClick,
    onZoomChange,
  } = props;
  const groupRef = useRef<THREE.Group>(null);
  const cellsRef = useRef<THREE.InstancedMesh>(null);
  const markersRef = useRef<THREE.InstancedMesh>(null);
  // Globe orientation, local to this view (MapScene keeps its own in the
  // scene store; this view is self-contained). Initial yaw -PI/2 faces
  // lon 0 — the near side, where most named features are.
  const yaw = useRef(-Math.PI / 2);
  const pitch = useRef(0);
  const face = useRef<{ yaw: number; pitch: number } | null>(null);
  const { gl, camera } = useThree();

  const unitPatch = useMemo(() => {
    const { positions, indices } = buildCellPatch(0, cellDeg, 0, cellDeg, CELL_RADIUS, 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [cellDeg]);
  useEffect(() => () => unitPatch.dispose(), [unitPatch]);

  const selectedCell = useMemo(
    () => cells.find((c) => c.id === selectedCellId) ?? null,
    [cells, selectedCellId],
  );
  const selectedPatch = useMemo(() => {
    if (!selectedCell) return null;
    const { positions, indices } = buildCellPatch(
      selectedCell.latMin,
      selectedCell.latMax,
      selectedCell.lonMin,
      selectedCell.lonMax,
      SELECTED_RADIUS,
      2,
    );
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [selectedCell]);
  useEffect(() => () => selectedPatch?.dispose(), [selectedPatch]);

  // Cells: one instance per non-empty cell, colour = the flat map's scale.
  // Layout effect (not passive) so the first painted frame already has
  // the instances placed — no flash of unplaced patches at the origin.
  useLayoutEffect(() => {
    const mesh = cellsRef.current;
    if (!mesh || cells.length === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    cells.forEach((cell, i) => {
      dummy.quaternion.copy(
        cellInstanceQuaternion(
          cellDeg / 2,
          cellDeg / 2,
          (cell.latMin + cell.latMax) / 2,
          (cell.lonMin + cell.lonMax) / 2,
        ),
      );
      dummy.position.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(densityColor(cell.densityPer1000Km2, maxDensity)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cells, maxDensity, cellDeg]);

  // Markers: one instance per feature, coloured by category; the selected
  // marker is 1.6x and sky blue.
  useLayoutEffect(() => {
    const mesh = markersRef.current;
    if (!mesh || markers.length === 0) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    markers.forEach((f, i) => {
      dummy.position.copy(latLonToVector3(f.lat, f.lon, MARKER_RADIUS));
      dummy.quaternion.identity();
      dummy.scale.setScalar(f.id === selectedFeatureId ? 1.6 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(
        i,
        color.set(f.id === selectedFeatureId ? '#38bdf8' : CATEGORY_COLORS[f.category]),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [markers, selectedFeatureId]);

  // Facing: turn the globe to face the selected cell / feature.
  const faceTarget = useMemo(() => {
    if (selectedFeatureId !== null) {
      const f = markers.find((m) => m.id === selectedFeatureId);
      if (f) return { lat: f.lat, lon: f.lon };
      // The selected feature is outside the 500-marker cap (or the view
      // is in heat mode): face its cell instead — the cell list is where
      // the selection came from.
    }
    if (selectedCell) {
      return {
        lat: (selectedCell.latMin + selectedCell.latMax) / 2,
        lon: (selectedCell.lonMin + selectedCell.lonMax) / 2,
      };
    }
    return null;
  }, [selectedFeatureId, selectedCell, markers]);

  useEffect(() => {
    face.current = faceTarget ? facingForLatLon(faceTarget.lat, faceTarget.lon) : null;
  }, [faceTarget]);

  // Picking: attachPicker returns the first hit carrying userData.kind.
  useEffect(() => {
    const root = groupRef.current;
    if (!root) return;
    return attachPicker(gl.domElement, camera, root, (hit) => {
      const kind = hit.object.userData.kind as string | undefined;
      if (pickingNearPoint) {
        // Any globe click sets the near point (see the header note) —
        // convert the hit from world space into the group's local space
        // first, so the group's rotation and zoom scale don't skew it.
        const local = root.worldToLocal(hit.point.clone());
        const { lat, lon } = vectorToLatLon(local);
        onMapClick(lat, lon);
        return;
      }
      if (kind === 'cell') {
        if (hit.instanceId != null) {
          const cell = cells[hit.instanceId];
          if (cell) onCellClick(cell.id);
        } else {
          // The selected-cell overlay mesh (not instanced).
          const cellId = hit.object.userData.cellId as string | undefined;
          if (cellId) onCellClick(cellId);
        }
      } else if (kind === 'marker' && hit.instanceId != null) {
        const f = markers[hit.instanceId];
        if (f) onFeatureClick(f);
      } else if (kind === 'mission') {
        const id = hit.object.userData.missionId as string | undefined;
        const m = id ? missionsWithCoords.find((mm) => mm.id === id) : undefined;
        if (m) onMissionClick(m);
      }
      // 'surface' hits (bare Moon): no-op outside picking mode.
    });
  }, [
    gl,
    camera,
    cells,
    markers,
    missionsWithCoords,
    pickingNearPoint,
    onCellClick,
    onFeatureClick,
    onMissionClick,
    onMapClick,
  ]);

  // Drag rotates (free drag cancels facing); wheel zooms.
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
      yaw.current += (e.clientX - px) * 0.005;
      pitch.current = Math.max(
        -GLOBE_PITCH_CLAMP,
        Math.min(GLOBE_PITCH_CLAMP, pitch.current + (e.clientY - py) * 0.003),
      );
      px = e.clientX;
      py = e.clientY;
    };
    const up = () => {
      dragging = false;
      el.style.cursor = 'grab';
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = clampGlobeZoom(zoom + (e.deltaY > 0 ? -0.5 : 0.5));
      if (next !== zoom) onZoomChange(next);
    };
    el.style.cursor = 'grab';
    // Without this the browser treats a finger drag as a page-scroll
    // gesture, fires pointercancel mid-drag and the globe stops following
    // the finger (mouse is unaffected — that's why desktop always worked).
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.style.touchAction = '';
      el.style.cursor = '';
    };
  }, [gl, zoom, onZoomChange]);

  useFrame((_, dt) => {
    if (face.current) {
      const k = Math.min(1, dt * 3);
      const dyaw = Math.atan2(
        Math.sin(face.current.yaw - yaw.current),
        Math.cos(face.current.yaw - yaw.current),
      );
      const dpitch = face.current.pitch - pitch.current;
      yaw.current += dyaw * k;
      pitch.current += dpitch * k;
      if (Math.abs(dyaw) < 0.01 && Math.abs(dpitch) < 0.01) face.current = null;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = yaw.current;
      groupRef.current.rotation.x = pitch.current;
      groupRef.current.scale.setScalar(zoomToGroupScale(zoom));
    }
  });

  const showMarkers = mode === 'markers' && markers.length > 0;

  return (
    <>
      <group ref={groupRef}>
        <MoonModel radius={R} spin={0} />
        {/* Bare-Moon pick surface: the GLB meshes carry no pick tag, so a
            click on uncovered Moon would otherwise never reach the picker
            — and picking a near point must work anywhere on the disc. It
            renders nothing (opacity 0, no depth write) and sits at R, so
            cells (1.05R) and markers (1.06R) always win the distance sort. */}
        <mesh userData={{ kind: 'surface' }}>
          <sphereGeometry args={[R, 48, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {mode === 'heat' && cells.length > 0 && (
          <instancedMesh
            key={`cells-${cellDeg}`}
            ref={cellsRef}
            args={[undefined, undefined, Math.max(1, cells.length)]}
            geometry={unitPatch}
            frustumCulled={false}
            userData={{ kind: 'cell' }}
          >
            {/* Uniform opacity: per-instance alpha is not supported, so
                the flat map's count-based alpha ramp has no equivalent
                here (see the header note). depthWrite off so overlapping
                polar patches blend instead of hard-edging each other. */}
            <meshBasicMaterial
              transparent
              opacity={opacity}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </instancedMesh>
        )}
        {selectedPatch && selectedCell && (
          <mesh
            geometry={selectedPatch}
            userData={{ kind: 'cell', cellId: selectedCell.id }}
          >
            <meshBasicMaterial
              color="#f8fafc"
              transparent
              opacity={0.35}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        {showMarkers && (
          <instancedMesh
            ref={markersRef}
            args={[undefined, undefined, Math.max(1, markers.length)]}
            geometry={MARKER_GEO}
            frustumCulled={false}
            userData={{ kind: 'marker' }}
          >
            <meshBasicMaterial />
          </instancedMesh>
        )}
        {showMissions &&
          missionsWithCoords.map((m) => (
            <mesh
              key={m.id}
              geometry={MARKER_GEO}
              material={MARKER_MAT}
              position={latLonToVector3(
                m.landingSite!.latitude!,
                m.landingSite!.longitude!,
                MARKER_RADIUS,
              )}
              userData={{ kind: 'mission', missionId: m.id }}
            />
          ))}
        {nearPoint && (
          <mesh
            geometry={MARKER_GEO}
            material={NEAR_POINT_MAT}
            scale={1.8}
            position={latLonToVector3(nearPoint.lat, nearPoint.lon, MARKER_RADIUS)}
          />
        )}
      </group>
      {/* World-fixed fill: the moon's key light rotates with the group, so
          at some orientations the camera-facing half goes black — the user
          must always be able to read the surface they are dragging. */}
      <directionalLight position={[-3, 2, 6]} intensity={1} color="#b9cde8" />
    </>
  );
}

const ZOOM_BUTTON =
  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-space-700/70 bg-space-950/80 text-sm text-slate-200 backdrop-blur-md hover:bg-space-800 disabled:cursor-not-allowed disabled:opacity-50';

export default function FeaturesGlobe(props: FeaturesGlobeProps) {
  const { mode, markersBlocked, blockedCount, pickingNearPoint, zoom, onZoomChange } =
    props;
  return (
    <div className="relative h-[50vh] min-h-[320px] w-full overflow-hidden rounded-lg border border-space-800 shadow-panel md:h-[62vh]">
      {/* Canvas cells are not keyboard-focusable; the filters and the
          feature list stay fully keyboard-operable (same mitigation as
          the flat map's canvas-renderer note). */}
      <div
        role="img"
        aria-label="3D globe of the Moon showing named-feature density. Drag to rotate, scroll to zoom, click a cell for its features."
        className="h-full w-full"
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 55, position: [0, 0, 5.6], near: 0.1, far: 100 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <GlobeScene {...props} />
        </Canvas>
      </div>
      <div className="absolute right-2 top-2 flex gap-2">
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= GLOBE_ZOOM_MAX}
          onClick={() => onZoomChange(clampGlobeZoom(zoom + 1))}
          className={ZOOM_BUTTON}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= GLOBE_ZOOM_MIN}
          onClick={() => onZoomChange(clampGlobeZoom(zoom - 1))}
          className={ZOOM_BUTTON}
        >
          −
        </button>
      </div>
      {mode === 'markers' && markersBlocked && (
        <p
          role="status"
          className="pointer-events-none absolute left-2 top-2 max-w-[90%] rounded-md border border-space-700 bg-space-950/90 px-3 py-2 text-xs text-slate-200"
        >
          {blockedCount.toLocaleString('en-US')} features match — zoom in to zoom level 3 or
          higher, or narrow the filters to 500 or fewer, to see individual markers.
        </p>
      )}
      {pickingNearPoint && (
        <p
          role="status"
          className="pointer-events-none absolute bottom-2 left-2 max-w-[90%] rounded-md border border-accent/50 bg-space-950/90 px-3 py-2 text-xs text-slate-200"
        >
          Click the map to set the near point.
        </p>
      )}
    </div>
  );
}
