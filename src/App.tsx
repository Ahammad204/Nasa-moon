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
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/payloads" element={<PayloadsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </CompareProvider>
  );
}
