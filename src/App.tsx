import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { CompareProvider } from './components/CompareContext';
import Loading from './components/Loading';
import ComparePage from './pages/ComparePage';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';
import MissionDetailPage from './pages/MissionDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import PayloadsPage from './pages/PayloadsPage';

// Lazy: Leaflet + react-leaflet stay out of the first bundle (NFR-2).
const MapPage = lazy(() => import('./pages/MapPage'));
// Lazy: Three.js + Recharts for the Sun & Earth Navigator stay out too.
const NavigatorPage = lazy(() => import('./pages/NavigatorPage'));
// Lazy: the South Pole page computes a 29.5-day window for every site.
const SouthPolePage = lazy(() => import('./pages/SouthPolePage'));
// Lazy: the Research Library is a text-heavy page, kept out of first paint.
const LibraryPage = lazy(() => import('./pages/LibraryPage'));

export default function App() {
  return (
    <CompareProvider>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
          <Route path="/missions" element={<ListPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/mission/:id" element={<MissionDetailPage />} />
            <Route path="/navigator" element={<NavigatorPage />} />
            <Route path="/south-pole" element={<SouthPolePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/payloads" element={<PayloadsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </CompareProvider>
  );
}
