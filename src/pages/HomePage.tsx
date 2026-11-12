import { Link } from 'react-router-dom';
import FeatureCards from '../components/FeatureCards';
import MissionTimeline from '../components/home/MissionTimeline';
import MoonRightNow from '../components/home/MoonRightNow';
import HeroSection from '../components/HeroSection';
import StatsStrip from '../components/StatsStrip';

// Landing page (D-016). NASA/data credits render site-wide in AppShell (DATA_RULES).
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsStrip />
      <FeatureCards />
      <MoonRightNow />
      <MissionTimeline />
      <section className="mt-8 rounded-lg border border-space-800 bg-space-900 p-5 shadow-panel">
        <h2 className="text-xl font-semibold">South Pole — power &amp; communication</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Artemis III is headed for the lunar south pole, where sunlit ridges sit
          next to permanently shadowed craters. See how the 13 candidate landing
          regions compare for sunlight and Earth visibility over a full lunar day —
          the two things a lander needs most.
        </p>
        <Link
          to="/south-pole"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-4 text-sm font-medium text-white hover:bg-accent/70"
        >
          Compare south-pole sites for power and communication -&gt;
        </Link>
      </section>
    </>
  );
}
