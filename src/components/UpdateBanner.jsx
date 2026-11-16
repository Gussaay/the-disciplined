// Tells the person about a new version: a downloaded web update waiting for a
// restart, or a new APK to install. Shows nothing on the website (it updates
// itself) or when the app is up to date.
import { useSyncExternalStore } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useLang } from '../i18n';
import { restartIntoUpdate, updateStore } from '../lib/liveUpdate';
import { openUrl } from '../lib/native';
import { APK_LATEST_URL } from '../config';

export function useUpdates() {
  return useSyncExternalStore(updateStore.subscribe, updateStore.getSnapshot);
}

export default function UpdateBanner() {
  const { L } = useLang();
  const u = useUpdates();
  if (u.apk) {
    return (
      <div className="card flex items-center gap-3 bg-gold-100 dark:bg-gold-500/10">
        <Download className="shrink-0 text-gold-600" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{L(`New app version ${u.apk.version}`, `إصدار جديد من التطبيق ${u.apk.version}`)}</p>
          <p className="muted text-xs">{L('Download it, then open the file to install over this one. Your data stays.', 'نزّله ثم افتح الملف ليُثبَّت فوق هذا الإصدار. بياناتك تبقى.')}</p>
        </div>
        <button className="btn-primary !min-h-[40px] shrink-0 !px-3 text-sm" onClick={() => openUrl(u.apk.apkUrl || APK_LATEST_URL)}>
          {L('Download', 'تنزيل')}
        </button>
      </div>
    );
  }
  if (u.ready) {
    return (
      <div className="card flex items-center gap-3">
        <RefreshCw className="shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{L('An update is ready', 'تحديث جاهز')}</p>
          <p className="muted text-xs">{L('It installs by itself next time the app opens, or restart now.', 'يُثبَّت تلقائياً عند فتح التطبيق مرة أخرى، أو أعد التشغيل الآن.')}</p>
        </div>
        <button className="btn-soft !min-h-[40px] shrink-0 !px-3 text-sm" onClick={restartIntoUpdate}>
          {L('Restart now', 'أعد التشغيل')}
        </button>
      </div>
    );
  }
  return null;
}
