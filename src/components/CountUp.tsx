import { useEffect, useRef } from 'react';

interface Props {
  value: number;
  className?: string;
  whenVisible?: boolean;
}

// Counts up once (on mount, or on first scroll into view with whenVisible);
// later value changes snap instantly. Text updates go through textContent on a
// ref — zero React re-renders per frame.
export default function CountUp({ value, className, whenVisible = false }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let observer: IntersectionObserver | undefined;

    const run = () => {
      if (animated.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animated.current = true;
        el.textContent = String(value);
        return;
      }
      animated.current = true;
      const duration = 600;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - start) / duration, 1);
        el.textContent = String(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (animated.current) {
      run();
    } else if (whenVisible) {
      el.textContent = '0';
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer?.disconnect();
            run();
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(el);
    } else {
      run();
    }

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [value, whenVisible]);

  return (
    <>
      <span ref={ref} className={className} aria-hidden="true">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
