import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMotionPrefs } from '../lib/motionPrefs';
import { hasWebGL } from '../lib/webgl';
import CompareTray from './CompareTray';
import PageTransition from './PageTransition';
import ReduceMotionToggle from './ReduceMotionToggle';
import StarfieldBackground from './StarfieldBackground';
import { setNavRequest, useSceneFlags, useSceneQuality } from '../three/sceneStore';
import type { RouteKey } from '../three/SceneDirector';

// Lazy: three/R3F/drei ship in one shared chunk that never blocks first paint.
const SpaceCanvas = lazy(() => import('../three/SpaceCanvas'));

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/missions', label: 'Missions' },
  { to: '/map', label: 'Map' },
  { to: '/compare', label: 'Compare' },
  { to: '/payloads', label: 'Payloads' },
];

export default function AppShell() {
  // The compare set is app-global state (FR-9): keep it across nav clicks.
  const [params] = useSearchParams();
  const compare = params.get('compare');
  const search = compare ? `?compare=${compare}` : '';
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { reduced } = useMotionPrefs();
  const quality = useSceneQuality();
  const { navRequest, mapMode } = useSceneFlags();
  const use3D = hasWebGL() && !reduced && quality > 0;

  // Mobile: the nav folds into a menu button so the header stays one row.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-mobile-menu]')) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const routeKey: RouteKey =
    pathname === '/'
      ? 'home'
      : pathname.startsWith('/missions')
        ? 'missions'
        : pathname.startsWith('/map')
          ? 'map'
          : pathname.startsWith('/compare')
            ? 'compare'
            : pathname.startsWith('/payloads')
              ? 'payloads'
              : 'other';

  // Interactive 3D routes: page boxes must let pointer events fall through to
  // the canvas; interactive DOM clusters re-enable themselves with pe-auto.
  const interactiveRoute = (routeKey === 'map' && mapMode === 'globe') || routeKey === 'payloads';

  // 3D → router bridge (mission nodes in scenes ask to navigate).
  useEffect(() => {
    if (navRequest) {
      setNavRequest(null);
      navigate(navRequest);
    }
  }, [navRequest, navigate]);

  // The #root wrapper box also swallows pointer events unless told otherwise.
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) root.style.pointerEvents = interactiveRoute ? 'none' : '';
    return () => {
      if (root) root.style.pointerEvents = '';
    };
  }, [interactiveRoute]);

  // Defer the 240 kB 3D chunk until the browser is idle: it must never compete
  // with first-paint resources on any route (brief: no blocked/slow pages).
  const [canvasReady, setCanvasReady] = useState(false);
  useEffect(() => {
    const win = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    };
    if (win.requestIdleCallback) win.requestIdleCallback(() => setCanvasReady(true), { timeout: 2500 });
    else setTimeout(() => setCanvasReady(true), 1500);
  }, []);

  return (
    <div
      className={`relative flex min-h-screen flex-col ${interactiveRoute ? 'pointer-events-none' : ''}`}
    >
      {use3D && canvasReady ? (
        <Suspense fallback={<StarfieldBackground />}>
          <SpaceCanvas route={routeKey} />
        </Suspense>
      ) : (
        <StarfieldBackground />
      )}
      <header className="pointer-events-auto sticky top-0 z-40 border-b border-space-800 bg-space-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink
            to="/"
            className="flex min-h-[44px] items-center text-lg font-semibold tracking-tight text-slate-100"
          >
            CLPS Lunar Mission Browser
          </NavLink>
          <nav className="hidden flex-wrap gap-1 md:flex">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={{ pathname: to, search }}
                end={to === '/' || to === '/missions'}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center rounded-md px-3 text-sm transition-colors duration-200 ${
                    isActive
                      ? 'bg-space-800 text-white shadow-glow'
                      : 'text-slate-300 hover:bg-space-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center md:flex">
            <ReduceMotionToggle />
          </div>
          <button
            type="button"
            data-mobile-menu
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-space-700 px-2 text-slate-200 md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div data-mobile-menu className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={{ pathname: to, search }}
                  end={to === '/' || to === '/missions'}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center rounded-md px-3 text-sm transition-colors duration-200 ${
                      isActive
                        ? 'bg-space-800 text-white shadow-glow'
                        : 'text-slate-300 hover:bg-space-900'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-2 flex">
              <ReduceMotionToggle />
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer
        className={`pointer-events-auto relative z-10 border-t border-space-800 text-xs leading-relaxed text-slate-400 ${
          interactiveRoute ? 'bg-space-950' : ''
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 py-4">
          <p>
            Basemap: NASA/LRO/LROC Team (Arizona State University) WAC global morphology mosaic,
            published by USGS Astrogeology Science Center — public domain, please cite authors.
          </p>
          <p>
            Moon 3D model: NASA Solar System Exploration, &quot;Earth&apos;s Moon&quot; — public
            domain.
          </p>
          <p>Mission data: NASA Science, &quot;CLPS Deliveries&quot; (science.nasa.gov).</p>
          <p>Lander details: mission provider pages (Astrobotic, Intuitive Machines, Firefly, …).</p>
          <p className="mt-2 text-slate-400">
            An independent educational project — not affiliated with or endorsed by NASA.
          </p>
        </div>
      </footer>
      <CompareTray />
    </div>
  );
}
