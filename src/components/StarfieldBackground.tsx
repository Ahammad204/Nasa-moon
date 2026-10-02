import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  depth: number;
}

// Hides the starfield mechanics (RULES §4): canvas stars + parallax drift run on
// rAF + refs only and never re-render React; static under prefers-reduced-motion.
function startStarfield(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): () => void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  let stars: Star[] = [];
  let w = 0;
  let h = 0;
  let raf = 0;
  let mx = 0;
  let my = 0;
  let scroll = 0;
  let meteor: { x: number; y: number; life: number } | null = null;
  let nextMeteor = 5000 + Math.random() * 6000;

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(160, Math.floor((w * h) / 12000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.5 + 0.15,
      depth: Math.random() * 0.8 + 0.2,
    }));
  }

  function draw(t: number) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const px = s.x + mx * s.depth * 12 + Math.sin(t / 9000 + s.y) * 2 * s.depth;
      const py = s.y + my * s.depth * 12 - scroll * s.depth * 0.05;
      const yy = ((py % h) + h) % h;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(px, yy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = '#dbeafe';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Occasional meteor sweep — a rare, quiet streak (background motion only).
    if (!meteor && t > nextMeteor) {
      meteor = { x: Math.random() * w * 0.6, y: Math.random() * h * 0.3, life: 1 };
    }
    if (meteor) {
      meteor.x += 7;
      meteor.y += 3.2;
      meteor.life -= 0.02;
      if (meteor.life <= 0 || meteor.x > w + 80 || meteor.y > h) {
        meteor = null;
        nextMeteor = t + 15000 + Math.random() * 12000;
      } else {
        ctx.strokeStyle = `rgba(219, 234, 254, ${(0.45 * meteor.life).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(meteor.x - 70, meteor.y - 32);
        ctx.lineTo(meteor.x, meteor.y);
        ctx.stroke();
      }
    }
  }

  function loop(t: number) {
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', resize);

  if (reduceMotion) {
    draw(0);
    return () => window.removeEventListener('resize', resize);
  }

  const onMove = (e: MouseEvent) => {
    mx = (e.clientX / window.innerWidth - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  const onScroll = () => {
    scroll = window.scrollY;
  };
  const onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(loop);
  };
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    return startStarfield(canvas, ctx);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 animate-nebula bg-[radial-gradient(60%_50%_at_20%_15%,rgba(56,189,248,0.10),transparent_60%),radial-gradient(55%_45%_at_85%_75%,rgba(129,140,248,0.08),transparent_65%)]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
