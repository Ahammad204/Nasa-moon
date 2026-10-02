import FeatureCards from '../components/FeatureCards';
import HeroSection from '../components/HeroSection';
import StatsStrip from '../components/StatsStrip';

// Landing page (D-016). NASA/data credits render site-wide in AppShell (DATA_RULES).
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsStrip />
      <FeatureCards />
    </>
  );
}
