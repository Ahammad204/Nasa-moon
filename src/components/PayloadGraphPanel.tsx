import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, type ReactNode } from 'react';
import { useMotionPrefs } from '../lib/motionPrefs';
import { hasWebGL } from '../lib/webgl';
import { requestGlobeCmd, useSceneQuality } from '../three/sceneStore';
import PayloadsScene from '../three/scenes/PayloadsScene';

// Aim the panel camera at the graph (same position the shared canvas used
// for this route, so the framing Boss already saw is kept).
function CameraRig() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 0.9, 0);
  }, [camera]);
  return null;
}

// Fit the ring inside the panel: the graph is wider than it is tall, so on
// narrow (mobile) panels it must shrink or its left/right edges crop (the
// ring also rotates, so keep a margin at every angle).
function GraphScale({ children }: { children: ReactNode }) {
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(1, size.height);
  const scale = Math.min(1.35, Math.max(0.8, 0.85 * aspect));
  return <group scale={scale}>{children}</group>;
}

function ZoomButton({ label, cmd }: { label: string; cmd: 'in' | 'out' }) {
  return (
    <button
      type="button"
      aria-label={`Zoom ${label}`}
      onClick={() => requestGlobeCmd(cmd)}
      className="min-h-[44px] whitespace-nowrap rounded-md border border-space-700 bg-space-900 px-4 text-sm text-slate-100 hover:bg-space-800"
    >
      Zoom {label}
    </button>
  );
}

// The 3D relationship graph, contained in its own panel: header row (title +
// zoom controls), then a local canvas. Nothing renders behind page text any
// more — the shared full-screen canvas no longer mounts this scene.
export default function PayloadGraphPanel() {
  const { reduced } = useMotionPrefs();
  const quality = useSceneQuality();
  const can3D = hasWebGL() && !reduced && quality > 0;

  return (
    <section
      aria-label="Payload relationship graph"
      className="mb-6 overflow-hidden rounded-lg border border-space-800 bg-space-950 shadow-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-space-800 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-100">Relationship graph</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Drag to rotate. Click a mission node to open that mission, or a payload node to jump
            to its card below.{' '}
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-[#38bdf8]" />{' '}
              Mission
            </span>{' '}
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-[#7dd3fc]" />{' '}
              Payload group
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <ZoomButton label="in" cmd="in" />
          <ZoomButton label="out" cmd="out" />
        </div>
      </div>
      {can3D ? (
        <div className="relative h-[380px] sm:h-[440px]">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ fov: 55, position: [0, 2.4, 8.6] }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          >
            <CameraRig />
            <GraphScale>
              <PayloadsScene />
            </GraphScale>
          </Canvas>
        </div>
      ) : (
        <p className="p-4 text-sm text-slate-400">
          The 3D graph is off (reduced motion, low-power mode, or no WebGL). The full payload
          list is below.
        </p>
      )}
    </section>
  );
}
