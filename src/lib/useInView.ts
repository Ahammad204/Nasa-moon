import { useEffect, useRef, useState } from 'react';

// Fires once when the element first enters the viewport (reduced motion: instantly).
//
// A jump scroll (End key, anchor link, restored scroll position) can skip
// past an element without IntersectionObserver ever reporting it as
// intersecting — the element would then stay invisible (or a CountUp stuck
// at 0) forever. So an element that is already fully above the viewport
// counts as seen too: the user has scrolled past it.
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true);
      return;
    }
    let revealed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { threshold },
    );
    function reveal() {
      if (revealed) return;
      revealed = true;
      observer.disconnect();
      window.removeEventListener('scroll', checkPassed, true);
      setInView(true);
    }
    function checkPassed() {
      // Fully above the viewport: jumped past, never intersected.
      const node = ref.current;
      if (node && node.getBoundingClientRect().bottom < 0) reveal();
    }
    observer.observe(el);
    // Mounted already past the element (restored scroll position).
    checkPassed();
    window.addEventListener('scroll', checkPassed, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', checkPassed, true);
    };
  }, [threshold]);

  return { ref, inView };
}
