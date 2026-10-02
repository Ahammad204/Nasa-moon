import { useEffect, useRef, type ReactNode } from 'react';

// Subtle CSS-3D tilt on pointer move (ref-driven transforms, zero React re-renders).
export default function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(700px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    };
    const onLeave = () => {
      el.style.transform = 'perspective(700px) rotateX(0) rotateY(0)';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-transform duration-200 will-change-transform ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
