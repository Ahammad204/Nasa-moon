import { Link } from 'react-router-dom';
import type { Mission, MissionStatus } from '../lib/types';
import StatusBadge from './StatusBadge';
import TiltCard from './TiltCard';

interface Props {
  mission: Mission;
  compareSelected: boolean;
  onCompareToggle: (id: string) => void;
  onQuickStatus?: (status: MissionStatus) => void;
  index?: number;
}

export default function MissionCard({
  mission,
  compareSelected,
  onCompareToggle,
  onQuickStatus,
  index = 0,
}: Props) {
  const site = mission.landingSite?.name ?? '-';
  const siteNote =
    mission.landingSite?.coordinatesApproximate && mission.landingSite?.name ? ' (approx)' : '';

  return (
    <TiltCard className="h-full">
    <article
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      className="flex h-full flex-col gap-2 rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel transition duration-200 hover:border-accent/50 hover:shadow-glow motion-safe:animate-fade-up"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg">
          <Link to={`/mission/${mission.id}`} className="hover:text-accent">
            {mission.name}
          </Link>
        </h2>
        {onQuickStatus ? (
          <button
            type="button"
            onClick={() => onQuickStatus(mission.status)}
            aria-label={`Filter by status ${mission.status}`}
            title="Filter by this status"
            className="flex min-h-[44px] items-center rounded-full hover:shadow-glow"
          >
            <StatusBadge status={mission.status} />
          </button>
        ) : (
          <StatusBadge status={mission.status} />
        )}
      </div>
      <p className="text-sm text-slate-300">
        {mission.provider ?? '-'} · Lander {mission.lander ?? '-'}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-400">Launch</dt>
        <dd>{mission.launchDate ?? '-'}</dd>
        <dt className="text-slate-400">Landing site</dt>
        <dd>
          {site}
          {siteNote}
        </dd>
      </dl>
      <div className="mt-2 flex items-center justify-between">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={compareSelected}
            onChange={() => onCompareToggle(mission.id)}
            className="h-4 w-4 accent-[#38bdf8]"
          />
          Compare
        </label>
        <Link
          to={`/mission/${mission.id}`}
          className="flex min-h-[44px] items-center text-sm text-accent underline"
        >
          Details -&gt;
        </Link>
      </div>
    </article>
    </TiltCard>
  );
}
