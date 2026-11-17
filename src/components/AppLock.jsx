// The app lock: with it on (Settings > Security), the Android app asks for the
// fingerprint when it opens and when it comes back after a minute away.
import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Fingerprint } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { isNative, asset } from '../lib/native';
import { verify } from '../lib/biometric';

const AWAY_MS = 60_000;

export default function AppLock() {
  const { L } = useLang();
  const [device] = useStore('device', {});
  const on = isNative && device.biometricLock === true;
  const [locked, setLocked] = useState(on);
  const [failed, setFailed] = useState(false);
  const leftAt = useRef(0);
  const asking = useRef(false);

  const unlock = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    setFailed(false);
    try {
      await verify(L('Unlock The Disciplined', 'افتح الملتزم'), L('Unlock', 'فتح القفل'));
      setLocked(false);
    } catch {
      setFailed(true);
    } finally {
      asking.current = false;
    }
  }, [L]);

  useEffect(() => {
    if (!on) {
      setLocked(false);
      return undefined;
    }
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) leftAt.current = Date.now();
      else if (leftAt.current && Date.now() - leftAt.current > AWAY_MS) setLocked(true);
    });
    return () => { sub.then((h) => h.remove()); };
  }, [on]);

  useEffect(() => {
    if (on && locked) unlock();
  }, [on, locked, unlock]);

  if (!on || !locked) return null;
  return (
    <div className="pt-safe fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-brand-800 px-8 text-center text-white">
      <img src={asset('icon-192.png')} alt="" className="h-20 w-20 rounded-3xl" />
      <div>
        <p className="text-xl font-extrabold">{L('The Disciplined is locked', 'الملتزم مقفل')}</p>
        <p className="mt-1 text-sm text-white/70">{L('Use your fingerprint to open it.', 'استخدم بصمتك لفتحه.')}</p>
      </div>
      <button className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label={L('Unlock', 'فتح القفل')} onClick={unlock}>
        <Fingerprint size={44} className="text-gold-300" />
      </button>
      {failed && <p className="text-sm text-gold-300">{L('Not recognised. Tap to try again.', 'لم يُتعرَّف عليها. اضغط للمحاولة مجدداً.')}</p>}
    </div>
  );
}
