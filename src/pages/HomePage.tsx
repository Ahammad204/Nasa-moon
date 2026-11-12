import FeatureCards from '../components/FeatureCards';
import FeaturedSites from '../components/home/FeaturedSites';
import FaqSection from '../components/home/FaqSection';
import HowItWorks from '../components/home/HowItWorks';
import MapTeaser from '../components/home/MapTeaser';
import MissionTimeline from '../components/home/MissionTimeline';
import MoonLabTeaser from '../components/home/MoonLabTeaser';
import TrustSection from '../components/home/TrustSection';
import MoonRightNow from '../components/home/MoonRightNow';
import SouthPoleSpotlight from '../components/home/SouthPoleSpotlight';
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
      <FeaturedSites />
      <HowItWorks />
      <SouthPoleSpotlight />
      <MoonLabTeaser />
      <MapTeaser />
      <TrustSection />
      <FaqSection />
    </>
  );
}
