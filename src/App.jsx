import { lazy, Suspense, useEffect } from 'react';
import { retryImport } from './lib/lazyRetry';

// Pages load with a retry and one guarded reload, so an update shipping
// while the app is open never strands a screen on a missing chunk.
const lazyPage = (factory) => lazy(() => retryImport(factory));
import { Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { useTheme } from './hooks/useTheme';
import { isNative } from './lib/native';
import { Spinner } from './components/ui';
import BottomNav from './components/BottomNav';
import AppLock from './components/AppLock';
import Home from './pages/Home';
import { useReminders } from './hooks/useReminders';
import { useAuth } from './hooks/useAuth';
import { useStore } from './hooks/useStore';
import { startUpdates } from './lib/liveUpdate';

const Gym = lazyPage(() => import('./pages/Gym'));
const GymSession = lazyPage(() => import('./pages/GymSession'));
const GymHistory = lazyPage(() => import('./pages/GymHistory'));
const Food = lazyPage(() => import('./pages/Food'));
const FoodDatabasePage = lazyPage(() => import('./pages/FoodDatabasePage'));
const Prayer = lazyPage(() => import('./pages/Prayer'));
const Quran = lazyPage(() => import('./pages/Quran'));
const QuranSurah = lazyPage(() => import('./pages/QuranSurah'));
const Azkar = lazyPage(() => import('./pages/Azkar'));
const Social = lazyPage(() => import('./pages/Social'));
const English = lazyPage(() => import('./pages/English'));
const Settings = lazyPage(() => import('./pages/Settings'));
const SignIn = lazyPage(() => import('./pages/SignIn'));
const Dashboard = lazyPage(() => import('./pages/Dashboard'));
const Weight = lazyPage(() => import('./pages/Weight'));
const Tasks = lazyPage(() => import('./pages/Tasks'));
const Watch = lazyPage(() => import('./pages/Watch'));

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
  useEffect(() => {
    startUpdates();
  }, []);
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const { user, loading, cloudEnabled } = useAuth();
  const [device] = useStore('device', {});
  // A workout in progress and the sign-in screen own the whole screen.
  const hideNav = location.pathname === '/gym/session' || location.pathname === '/signin';
  // First open: ask to sign in or register, unless the person chose to carry
  // on without an account.
  if (cloudEnabled && !loading && !user && !device.authSkipped && location.pathname !== '/signin') {
    return <Navigate to="/signin" replace />;
  }

  return (
    <>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gym" element={<Gym />} />
          <Route path="/gym/session" element={<GymSession />} />
          <Route path="/gym/history" element={<GymHistory />} />
          <Route path="/food" element={<Food />} />
          <Route path="/food/database" element={<FoodDatabasePage />} />
          <Route path="/prayer" element={<Prayer />} />
          <Route path="/prayer/quran" element={<Quran />} />
          <Route path="/prayer/quran/:id" element={<QuranSurah />} />
          <Route path="/prayer/azkar" element={<Azkar />} />
          <Route path="/prayer/azkar/:id" element={<Azkar />} />
          <Route path="/social" element={<Social />} />
          <Route path="/english" element={<English />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/weight" element={<Weight />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/watch" element={<Watch />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {!hideNav && <BottomNav />}
      <AppLock />
    </>
  );
}
