import type { Mission, MissionStatus } from '../lib/types';
import MissionCard from './MissionCard';

interface Props {
  missions: Mission[];
  compareIds: string[];
  onCompareToggle: (id: string) => void;
  onQuickStatus?: (status: MissionStatus) => void;
  /** Changing this re-keys the grid so the spatial entrance replays on filter/search. */
  signature?: string;
}

export default function MissionList({
  missions,
  compareIds,
  onCompareToggle,
  onQuickStatus,
  signature = '',
}: Props) {
  return (
    <div key={signature} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {missions.map((mission, index) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          index={index}
          compareSelected={compareIds.includes(mission.id)}
          onCompareToggle={onCompareToggle}
          onQuickStatus={onQuickStatus}
        />
      ))}
    </div>
  );
}
