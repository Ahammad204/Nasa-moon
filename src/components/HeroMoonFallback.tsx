// Static CSS moon — hero visual before the 3D chunk loads, and the permanent
// fallback for reduced-motion / low-end devices (D-015).
export default function HeroMoonFallback() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-56 w-56 rounded-full shadow-glow sm:h-72 sm:w-72"
      style={{
        background:
          'radial-gradient(circle at 35% 30%, #c7d2de 0%, #8fa0b3 38%, #4b5a6d 72%, #1c2740 100%)',
      }}
    >
      <div
        className="absolute inset-0 rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle at 65% 70%, rgba(10,14,23,0.55) 0%, transparent 45%), radial-gradient(circle at 25% 60%, rgba(10,14,23,0.35) 0%, transparent 30%)',
        }}
      />
      <div className="absolute -inset-3 rounded-full border border-accent/20" />
    </div>
  );
}
