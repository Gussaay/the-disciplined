import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { useTheme } from './hooks/useTheme';
import { isNative } from './lib/native';
import { Spinner } from './components/ui';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import { useReminders } from './hooks/useReminders';

const Gym = lazy(() => import('./pages/Gym'));
const GymSession = lazy(() => import('./pages/GymSession'));
const GymHistory = lazy(() => import('./pages/GymHistory'));
const Food = lazy(() => import('./pages/Food'));
const Prayer = lazy(() => import('./pages/Prayer'));
const Quran = lazy(() => import('./pages/Quran'));
const QuranSurah = lazy(() => import('./pages/QuranSurah'));
const Azkar = lazy(() => import('./pages/Azkar'));
const Social = lazy(() => import('./pages/Social'));
const English = lazy(() => import('./pages/English'));
const Settings = lazy(() => import('./pages/Settings'));

/** Android hardware back: history first, then leave the app from the home screen. */
function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!isNative) return undefined;
    const sub = CapApp.addListener('backButton', () => {
      if (location.pathname === '/') CapApp.exitApp();
      else navigate(-1);
    });
    return () => {
      sub.then((h) => h.remove());
    };
  }, [navigate, location.pathname]);
}

export default function App() {
  useTheme();
  useNativeBackButton();
  useReminders();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  // A workout in progress owns the whole screen.
  const hideNav = location.pathname === '/gym/session';

  return (
    <>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gym" element={<Gym />} />
          <Route path="/gym/session" element={<GymSession />} />
          <Route path="/gym/history" element={<GymHistory />} />
          <Route path="/food" element={<Food />} />
          <Route path="/prayer" element={<Prayer />} />
          <Route path="/prayer/quran" element={<Quran />} />
          <Route path="/prayer/quran/:id" element={<QuranSurah />} />
          <Route path="/prayer/azkar" element={<Azkar />} />
          <Route path="/prayer/azkar/:id" element={<Azkar />} />
          <Route path="/social" element={<Social />} />
          <Route path="/english" element={<English />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!hideNav && <BottomNav />}
    </>
  );
}
