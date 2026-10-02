import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// Soft fade/slide on route change, keyed to pathname (search-param edits don't retrigger).
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="motion-safe:animate-fade-up">
      {children}
    </div>
  );
}
