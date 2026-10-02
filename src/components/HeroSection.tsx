import { Link } from 'react-router-dom';
import { useMotionPrefs } from '../lib/motionPrefs';
import { hasWebGL } from '../lib/webgl';
import HeroMoonFallback from './HeroMoonFallback';

const TITLE_WORDS = ['CLPS', 'Lunar', 'Mission', 'Browser'];

function HeroVisual() {
  const { reduced } = useMotionPrefs();
  const show3d = hasWebGL() && !reduced;
  // The 3D moon lives in the shared SpaceCanvas behind this slot; the CSS moon
  // is the reduced-motion / no-WebGL fallback (and reserves the layout height).
  return show3d ? (
    <div className="mx-auto h-56 w-56 sm:h-72 sm:w-72" aria-hidden="true" />
  ) : (
    <HeroMoonFallback />
  );
}

export default function HeroSection() {
  return (
    <section className="mb-14 grid items-center gap-8 md:grid-cols-2">
      <div>
        <h1 className="text-3xl leading-tight text-slate-100 sm:text-4xl">
          {TITLE_WORDS.map((word, i) => (
            <span
              key={word}
              style={{ animationDelay: `${i * 90}ms` }}
              className={`mr-2 inline-block motion-safe:animate-fade-up ${
                i === TITLE_WORDS.length - 1 ? 'text-accent' : ''
              }`}
            >
              {word}
            </span>
          ))}
        </h1>
        <div
          style={{ animationDelay: '320ms' }}
          className="mt-3 h-1 w-28 rounded-full bg-gradient-to-r from-accent to-accent-dim motion-safe:animate-fade-up"
        />
        <p
          style={{ animationDelay: '360ms' }}
          className="mt-4 max-w-xl text-base text-slate-300 motion-safe:animate-fade-up"
        >
          Every NASA CLPS lunar mission — landers, payloads, landing sites, and status — on one
          interactive Moon map. Built for students, educators, and mission enthusiasts.
        </p>
        <div
          style={{ animationDelay: '460ms' }}
          className="mt-6 flex flex-wrap gap-3 motion-safe:animate-fade-up"
        >
          <Link
            to="/missions"
            className="flex min-h-[44px] items-center rounded-md bg-accent-dim px-5 text-sm font-medium text-white transition duration-200 hover:bg-accent-dim/80 hover:shadow-glow"
          >
            Browse Missions
          </Link>
          <Link
            to="/map"
            className="flex min-h-[44px] items-center rounded-md border border-space-700 px-5 text-sm transition duration-200 hover:border-accent/50 hover:bg-space-900"
          >
            Explore the Map
          </Link>
        </div>
      </div>
      <div className="motion-safe:animate-float">
        <HeroVisual />
      </div>
    </section>
  );
}
