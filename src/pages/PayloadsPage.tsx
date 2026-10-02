import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CountUp from '../components/CountUp';
import { missions } from '../lib/missions';
import { groupPayloads } from '../lib/payloads';
import { requestGlobeCmd, useSceneFlags } from '../three/sceneStore';

const GROUPS = groupPayloads(missions);

export default function PayloadsPage() {
  const { payloadFocus } = useSceneFlags();
  const refs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!payloadFocus) return;
    const el = refs.current.get(payloadFocus);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [payloadFocus]);

  return (
    <section>
      {/* Scrim: the root canvas renders the graph behind this copy — at
          phone widths the text sat right on top of the 3D lines. */}
      <div className="mb-5 rounded-lg bg-space-950/70 p-4 backdrop-blur-sm">
        <h1 className="mb-2 text-2xl font-bold">Payload explorer</h1>
        <p className="mb-2 text-sm text-slate-400">
          <CountUp value={GROUPS.length} /> payloads across <CountUp value={missions.length} /> CLPS
          deliveries. Payload names are shown
          exactly as their sources spell them, so variants stay separate. CT-4, CS-8 and CX-2 have no
          payload details published yet.
        </p>
        <p className="text-xs text-slate-400">
          Behind you, the 3D relationship graph: click a mission node to open that mission, or a
          payload node to jump to its card below.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="h-[38vh] flex-1 rounded-lg border border-dashed border-space-700/60" aria-hidden="true" />
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={() => requestGlobeCmd('in')}
            className="min-h-[44px] rounded-md border border-space-700 px-3 text-sm hover:bg-space-900"
          >
            Zoom in
          </button>
          <button
            type="button"
            onClick={() => requestGlobeCmd('out')}
            className="min-h-[44px] rounded-md border border-space-700 px-3 text-sm hover:bg-space-900"
          >
            Zoom out
          </button>
          <p className="text-xs text-slate-400">drag to rotate</p>
        </div>
      </div>
      <div className="pointer-events-auto space-y-4">
        {GROUPS.map((g) => (
          <article
            key={g.name}
            ref={(el) => {
              if (el) refs.current.set(g.name, el);
              else refs.current.delete(g.name);
            }}
            className={`rounded-lg border p-4 ${
              g.name === payloadFocus
                ? 'border-accent/60 bg-accent-dim/30'
                : 'border-space-800 bg-space-900'
            }`}
          >
            <h2 className="font-semibold">{g.name}</h2>
            <p className="text-sm text-slate-400">{g.organizations.join(' · ') || '-'}</p>
            <ul className="mt-2 space-y-2">
              {g.entries.map(({ mission, payload }) => (
                <li key={mission.id} className="text-sm">
                  <Link
                    to={`/mission/${mission.id}`}
                    className="inline-flex min-h-[44px] items-center text-accent underline"
                  >
                    {mission.name}
                  </Link>
                  <span className="text-slate-400"> ({mission.taskOrder ?? '-'}) — </span>
                  <span className="text-slate-300">{payload.purpose ?? '-'}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
