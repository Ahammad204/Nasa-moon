import { useMotionPrefs } from '../lib/motionPrefs';

// Explicit way out of 3D/motion (brief): persisted per-user, independent of the OS.
export default function ReduceMotionToggle() {
  const { manualOn, setManualReduce } = useMotionPrefs();
  return (
    <button
      type="button"
      aria-pressed={manualOn}
      onClick={() => setManualReduce(!manualOn)}
      className="flex min-h-[44px] items-center rounded-md border border-space-700 px-3 text-xs text-slate-300 hover:border-accent/50 hover:bg-space-900"
    >
      Reduce Motion: {manualOn ? 'On' : 'Off'}
    </button>
  );
}
