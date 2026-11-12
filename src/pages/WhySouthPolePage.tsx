import { useState } from 'react';
import { Link } from 'react-router-dom';
import SourceBadge from '../components/SourceBadge';
import timelineData from '../data/water-timeline.json';
import { useInView } from '../lib/useInView';

interface TimelineEvent {
  year: string;
  title: string;
  summary: string;
  sourceIds: string[];
  lastVerified: string;
}

const events = timelineData as unknown as TimelineEvent[];

const VIDEO_ID = 'X8Zz14hQzgg';

// "Why the South Pole?" — the story of lunar water, in six steps.
//
// The timeline is a semantic ordered list; each item fades in when it
// scrolls into view (useInView returns true instantly under
// prefers-reduced-motion, so the page works fully without animation).
// The NASA video loads no iframe until clicked — only a poster image.
function TimelineItem({ event, index }: { event: TimelineEvent; index: number }) {
  const { ref, inView } = useInView<HTMLLIElement>(0.2);
  return (
    <li ref={ref} className="relative pb-8 pl-10 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute left-[7px] top-1.5 h-4 w-4 rounded-full border-2 border-accent bg-space-950"
      />
      <div
        className={`transition-all duration-500 motion-reduce:transition-none ${
          inView ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'
        }`}
      >
        <p className="text-sm font-semibold tabular-nums text-accent">
          {event.year}
          <span className="sr-only">, event {index + 1} of {events.length}</span>
        </p>
        <h3 className="mt-0.5 text-lg font-semibold text-slate-100">{event.title}</h3>
        <p className="mt-1 text-slate-300">{event.summary}</p>
        <div className="mt-2">
          <SourceBadge ids={event.sourceIds} />
        </div>
      </div>
    </li>
  );
}

function WaterVideo() {
  const [loaded, setLoaded] = useState(false);
  return (
    <figure className="overflow-hidden rounded-lg border border-space-800 bg-space-900 shadow-panel">
      {loaded ? (
        <iframe
          title="Water Released from Moon: Director's Cut (NASA)"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          aria-label="Play video: Water Released from Moon, Director's Cut (NASA)"
          className="relative block w-full text-left"
        >
          <img
            src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
            alt="Still from the NASA video Water Released from Moon: Director's Cut"
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-space-950/40">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-dim text-2xl text-white shadow-panel">
              ▶
            </span>
          </span>
          <span className="absolute bottom-2 left-2 rounded bg-space-950/80 px-2 py-1 text-xs text-slate-200">
            NASA video: click to load (no video loads until you press play)
          </span>
        </button>
      )}
      <figcaption className="flex flex-wrap items-center gap-2 p-3 text-sm text-slate-300">
        <span>Science colour, not a site-selection source.</span>
        <SourceBadge ids={['nasa-water-video']} />
      </figcaption>
    </figure>
  );
}

export default function WhySouthPolePage() {
  return (
    <section className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          🌙 The south pole
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          Sixty years of hunting for lunar water
        </h1>
        <p className="mt-2 text-base text-slate-300">
          For decades the Moon was thought to be bone dry. Then, step by step,
          telescopes and spacecraft found water: first as a prediction, then as
          hydrogen, then as ice in craters that never see the Sun. This is that
          story, and why the next astronauts are headed for the south pole.
        </p>
      </header>

      <h2 className="mb-4 text-xl font-bold">The water timeline</h2>
      <ol
        aria-label="Timeline of lunar water discoveries, 1961 to 2023"
        className="relative border-l-2 border-space-700 pl-0"
      >
        {events.map((event, i) => (
          <TimelineItem key={event.year} event={event} index={i} />
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-400">
        Summaries are in our own words. Sources verified 2026-11-12.
      </p>

      <h2 className="mb-4 mt-10 text-xl font-bold">Landing at the pole</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="text-2xl" aria-hidden="true">
            🧊
          </div>
          <h3 className="mt-1 font-semibold text-slate-100">Ice where it is dark</h3>
          <p className="mt-1 text-sm text-slate-300">
            The highest water-ice concentrations sit in dark polar craters. That
            is why the south pole is the target.
          </p>
          <div className="mt-2">
            <SourceBadge ids={['nasa-moon-water']} />
          </div>
        </div>
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="text-2xl" aria-hidden="true">
            ☀️
          </div>
          <h3 className="mt-1 font-semibold text-slate-100">Grazing sunlight</h3>
          <p className="mt-1 text-sm text-slate-300">
            Sunlight at the pole is low and grazing, so illumination timing
            decides when a lander has power.{' '}
            <Link to="/navigator" className="text-accent underline">
              Check a site in the Navigator →
            </Link>
          </p>
          <div className="mt-2">
            <SourceBadge ids={['nasa-moon-water']} />
          </div>
        </div>
        <div className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel">
          <div className="text-2xl" aria-hidden="true">
            📡
          </div>
          <h3 className="mt-1 font-semibold text-slate-100">Earth comes and goes</h3>
          <p className="mt-1 text-sm text-slate-300">
            At high latitude, Earth&apos;s line of sight shifts with libration,
            so communication windows open and close.{' '}
            <Link to="/navigator" className="text-accent underline">
              See the windows →
            </Link>
          </p>
          <div className="mt-2">
            <SourceBadge ids={['nasa-moon-water']} />
          </div>
        </div>
      </div>

      <h2 className="mb-4 mt-10 text-xl font-bold">Watch: water released from the Moon</h2>
      <WaterVideo />

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/navigator"
          className="inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-5 text-sm font-medium text-white hover:bg-accent/70"
        >
          Open the Sun &amp; Earth Navigator →
        </Link>
        <Link
          to="/south-pole"
          className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-5 text-sm text-slate-200 hover:bg-space-900"
        >
          Compare south-pole sites →
        </Link>
      </div>
    </section>
  );
}
