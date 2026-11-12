import { OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { getSubEarthPoint, getSubSolarPoint, subPointToDirection } from '../../lib/astro';
import type { Site } from '../../lib/astro';
import MoonModel from '../../three/primitives/MoonModel';
import { latLonToVector3 } from '../../three/primitives/Marker3D';

/**
 * Sun & Earth Navigator — 3D scene (Three.js / R3F, lazy-loaded chunk).
 *
 * The Moon is the app's own NASA model (public/models/moon.glb) with the
 * app's established lat/lon → Vector3 convention (Marker3D). The directional
 * light sits along the TRUE Sun direction in the Moon body-fixed frame, so
 * the terminator moves correctly when the time changes; the Sun and Earth
 * objects sit along their true directions too. Positions are true;
 * Sun/Earth sizes are exaggerated for visibility.
 *
 * Sun model: NASA Solar System Exploration "Sun" glTF
 * (solarsystem.nasa.gov/gltf_embed/2352/, public domain), self-hosted at
 * public/models/sun.glb. If that file is missing or fails to load, an
 * emissive sphere + glow sprite takes its place — the scene never depends
 * on a runtime network fetch.
 *
 * Earth is a stylized blue-marble sphere (procedural canvas texture, not
 * surveyed coastlines). The pin marks the selected site.
 */

const MOON_RADIUS = 1.6;
const SUN_MODEL_URL = '/models/sun.glb';

class GltfErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useGlowTexture(): THREE.Texture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** Stylized blue marble — procedural, not surveyed coastlines. */
function useEarthTexture(): THREE.Texture {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    if (ctx) {
      const ocean = ctx.createLinearGradient(0, 0, 0, 128);
      ocean.addColorStop(0, '#1e40af');
      ocean.addColorStop(0.5, '#2563eb');
      ocean.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, 256, 128);
      // Land masses (fixed blobs — stylized, not real coastlines).
      ctx.fillStyle = '#3f7a3a';
      const land: Array<[number, number, number, number]> = [
        [40, 30, 34, 20],
        [95, 55, 26, 18],
        [150, 25, 30, 22],
        [195, 70, 36, 20],
        [120, 90, 22, 12],
      ];
      for (const [x, y, rx, ry] of land) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Clouds.
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const clouds: Array<[number, number, number, number]> = [
        [60, 45, 30, 6],
        [140, 80, 36, 7],
        [210, 35, 28, 6],
        [30, 95, 26, 6],
        [175, 100, 30, 6],
      ];
      for (const [x, y, rx, ry] of clouds) {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function GlowSprite({
  position,
  scale,
  color,
  texture,
}: {
  position: THREE.Vector3;
  scale: number;
  color: string;
  texture: THREE.Texture;
}) {
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        map={texture}
        color={color}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  );
}

function SunFallbackSphere({
  position,
  glowTexture,
}: {
  position: THREE.Vector3;
  glowTexture: THREE.Texture;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#FBBF24" toneMapped={false} />
      </mesh>
      <GlowSprite position={new THREE.Vector3(0, 0, 0)} scale={16} color="#FBBF24" texture={glowTexture} />
    </group>
  );
}

function SunGlb({
  position,
  glowTexture,
}: {
  position: THREE.Vector3;
  glowTexture: THREE.Texture;
}) {
  const { scene } = useGLTF(SUN_MODEL_URL);
  // The Sun must glow with its own SDO texture: force the base map into the
  // emissive channel (the file ships emissiveFactor white but no emissive
  // texture, so without this it would render flat-lit). Materials are cloned
  // so the shared loader cache is untouched.
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        const mat = obj.material.clone();
        if (mat.map) {
          mat.emissiveMap = mat.map;
          mat.emissive = new THREE.Color('#ffffff');
          mat.emissiveIntensity = 1.4;
        }
        obj.material = mat;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={position}>
      {/* Node scale is 1000 with ±0.5 geometry: 0.005 -> radius ~2.5. */}
      <group scale={0.005}>
        <primitive object={model} />
      </group>
      <GlowSprite position={new THREE.Vector3(0, 0, 0)} scale={16} color="#FBBF24" texture={glowTexture} />
    </group>
  );
}

function Stars({ count = 600 }: { count?: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random direction on a far shell — visual only, no data.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = 45 + Math.random() * 25;
      const s = Math.sqrt(1 - u * u);
      arr[i * 3] = r * s * Math.cos(t);
      arr[i * 3 + 1] = r * u;
      arr[i * 3 + 2] = r * s * Math.sin(t);
    }
    return arr;
  }, [count]);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.09} color="#e2e8f0" sizeAttenuation transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

function SitePin({ position, reduced }: { position: THREE.Vector3; reduced: boolean }) {
  const haloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (reduced || !haloRef.current) return;
    const s = 1 + 0.25 * Math.sin(clock.elapsedTime * 2.4);
    haloRef.current.scale.setScalar(s);
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial color="#FBBF24" toneMapped={false} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#FBBF24" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

function horizonDirection(
  siteDir: THREE.Vector3,
  azimuthDeg: number,
  elevationDeg = 3,
): THREE.Vector3 {
  const up = siteDir.clone().normalize();
  const pole = Math.abs(up.y) > 0.999 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const east = new THREE.Vector3().crossVectors(up, pole).normalize();
  const north = new THREE.Vector3().crossVectors(east, up).normalize();
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return new THREE.Vector3()
    .addScaledVector(east, Math.cos(el) * Math.sin(az))
    .addScaledVector(north, Math.cos(el) * Math.cos(az))
    .addScaledVector(up, Math.sin(el))
    .normalize();
}

function CameraRig({
  view,
  siteDir,
  lookAzimuthDeg,
  reduced,
  onReturningChange,
}: {
  view: 'orbit' | 'surface';
  siteDir: THREE.Vector3;
  lookAzimuthDeg: number;
  reduced: boolean;
  /** True while the camera is flying back to the orbit home position. */
  onReturningChange: (returning: boolean) => void;
}) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const home = useMemo(() => new THREE.Vector3(0, 1.4, 6.2), []);
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const prevView = useRef(view);
  const returning = useRef(false);

  useFrame((_, dt) => {
    if (prevView.current === 'surface' && view === 'orbit') {
      returning.current = true;
      onReturningChange(true);
    }
    if (prevView.current === 'orbit' && view === 'surface') {
      returning.current = false;
      onReturningChange(false);
    }
    prevView.current = view;
    const k = reduced ? 1 : Math.min(1, dt * 3);
    // Surface view stands 0.05 units up (horizon dips ~14°) with a wider
    // field of view, looking straight at the horizon in the look azimuth:
    // the ground fills the lower frame, the horizon sits across it, and the
    // Sun/Earth appear at their true azimuth/elevation when near the horizon.
    const camPos = siteDir.clone().multiplyScalar(MOON_RADIUS + 0.05);
    if (view === 'surface') {
      // The camera's "up" must be the LOCAL up (away from the Moon's
      // centre), not world +Y: at the south pole world +Y points at the
      // ground, so a default up would flip the image upside-down.
      camera.up.copy(siteDir);
      const persp = camera as THREE.PerspectiveCamera;
      if (persp.fov !== 60) {
        persp.fov = 60;
        persp.updateProjectionMatrix();
      }
      const look = camPos
        .clone()
        .addScaledVector(horizonDirection(siteDir, lookAzimuthDeg, 0), 5);
      camera.position.lerp(camPos, k);
      lookTarget.current.lerp(look, k);
      camera.lookAt(lookTarget.current);
    } else if (returning.current) {
      camera.up.set(0, 1, 0);
      const persp = camera as THREE.PerspectiveCamera;
      if (persp.fov !== 50) {
        persp.fov = 50;
        persp.updateProjectionMatrix();
      }
      camera.position.lerp(home, k);
      lookTarget.current.lerp(origin, k);
      camera.lookAt(lookTarget.current);
      if (camera.position.distanceTo(home) < 0.05) {
        returning.current = false;
        onReturningChange(false);
      }
    }
  });
  return null;
}

export default function NavigatorScene3D({
  site,
  timeMs,
  view,
  lookAzimuthDeg,
  reducedMotion,
}: {
  site: Site;
  timeMs: number;
  view: 'orbit' | 'surface';
  /** Azimuth the surface view looks toward (Sun's when up, else Earth's). */
  lookAzimuthDeg: number;
  reducedMotion: boolean;
}) {
  const date = useMemo(() => new Date(timeMs), [timeMs]);
  const glowTexture = useGlowTexture();
  const earthTexture = useEarthTexture();

  // subPointToDirection is Z-up (its doc: "x/y in the lunar equatorial
  // plane, z = pole"); three.js is Y-up, so swap y and z. Without this the
  // Sun sat 45 units BELOW the Moon (invisible) and the key light came
  // from below too — the terminator was upside-down.
  const sunDir = useMemo(() => {
    const d = subPointToDirection(getSubSolarPoint(date));
    return new THREE.Vector3(d.x, d.z, d.y);
  }, [date]);
  const earthDir = useMemo(() => {
    const d = subPointToDirection(getSubEarthPoint(date));
    return new THREE.Vector3(d.x, d.z, d.y);
  }, [date]);
  const siteDir = useMemo(
    () => latLonToVector3(site.latitude, site.longitude, 1),
    [site.latitude, site.longitude],
  );
  const pinPos = useMemo(
    () => latLonToVector3(site.latitude, site.longitude, MOON_RADIUS * 1.06),
    [site.latitude, site.longitude],
  );
  const sunPos = useMemo(() => sunDir.clone().multiplyScalar(45), [sunDir]);
  const earthPos = useMemo(() => earthDir.clone().multiplyScalar(7.5), [earthDir]);
  const lightPos = useMemo(() => sunDir.clone().multiplyScalar(20), [sunDir]);
  // While the camera flies home from the surface view, OrbitControls stays
  // off so the two do not fight over the camera.
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const onReturningChange = useCallback((returning: boolean) => {
    setControlsEnabled(!returning);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 50, position: [0, 1.4, 6.2], near: 0.1, far: 220 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.5 }}
    >
      <Stars />
      {/* The Sun is the only key light: its direction is the true one, so the
          terminator on the Moon moves correctly as the time changes. */}
      <directionalLight position={lightPos} intensity={2.6} color="#fff7ea" />
      {/* Faint fill so night-side terrain is barely visible (earthshine). */}
      <ambientLight intensity={0.1} color="#6d87a3" />
      <MoonModel radius={MOON_RADIUS} spin={0} lights={false} />
      <SitePin position={pinPos} reduced={reducedMotion} />
      <GltfErrorBoundary fallback={<SunFallbackSphere position={sunPos} glowTexture={glowTexture} />}>
        <Suspense fallback={<SunFallbackSphere position={sunPos} glowTexture={glowTexture} />}>
          <SunGlb position={sunPos} glowTexture={glowTexture} />
        </Suspense>
      </GltfErrorBoundary>
      <group position={earthPos}>
        <mesh>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial map={earthTexture} roughness={0.9} metalness={0} />
        </mesh>
        <GlowSprite position={new THREE.Vector3(0, 0, 0)} scale={2.4} color="#38BDF8" texture={glowTexture} />
      </group>
      {view === 'orbit' && (
        <OrbitControls
          makeDefault
          enabled={controlsEnabled}
          enableDamping
          dampingFactor={0.1}
          enablePan={false}
          minDistance={3}
          maxDistance={24}
        />
      )}
      <CameraRig
        view={view}
        siteDir={siteDir}
        lookAzimuthDeg={lookAzimuthDeg}
        reduced={reducedMotion}
        onReturningChange={onReturningChange}
      />
    </Canvas>
  );
}
