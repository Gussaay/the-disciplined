// Tells the person about a new version: a downloaded web update waiting for a
// restart, or a new APK to install. As in Easy Pedia, the APK downloads inside
// the app with a progress bar and opens Android's installer, instead of going
// through the browser and the Downloads folder. Shows nothing on the website
// (it updates itself) or when the app is up to date.
import { useState, useSyncExternalStore } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useLang } from '../i18n';
import { restartIntoUpdate, updateStore } from '../lib/liveUpdate';
import { downloadStore, getDownload, openDownload, removeDownload, startDownload } from '../lib/downloads';
import { APK_LATEST_URL } from '../config';

const APK_ID = 'the-disciplined-apk';

export function useUpdates() {
  return useSyncExternalStore(updateStore.subscribe, updateStore.getSnapshot);
}

/** Download-and-install of one APK, with its state kept across restarts. */
export function useApk(apk) {
  const downloads = useSyncExternalStore(downloadStore.subscribe, downloadStore.getSnapshot);
  const [opening, setOpening] = useState(false);
  const saved = downloads.find((d) => d.id === APK_ID) || null;
  // A record from an earlier version is not this update.
  const record = saved && (!apk?.versionCode || Number(saved.versionCode) === Number(apk.versionCode)) ? saved : null;

  const download = async () => {
    const old = getDownload(APK_ID);
    if (old && old.status !== 'downloading' && Number(old.versionCode) !== Number(apk?.versionCode)) await removeDownload(APK_ID);
    return startDownload({
      id: APK_ID,
      url: apk?.apkUrl || APK_LATEST_URL,
      fileName: `the-disciplined-${apk?.versionCode || 'latest'}.apk`,
      title: `The Disciplined ${apk?.version || ''}`.trim(),
      meta: { versionCode: apk?.versionCode ?? null },
    });
  };
  const install = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const res = await openDownload(APK_ID);
      if (!res.ok && res.missing) await download();
    } finally {
      setOpening(false);
    }
  };
  return { record, busy: record?.status === 'downloading', done: record?.status === 'done', progress: record?.progress || 0, error: record?.error || null, download, install, opening };
}

export function ApkInstall({ apk, label }) {
  const { L } = useLang();
  const a = useApk(apk);
  return (
    <div className="space-y-2">
      {a.busy && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.max(3, a.progress)}%` }} />
          </div>
          <p className="muted mt-1 text-xs">{L(`Downloading… ${a.progress}%`, `جارٍ التنزيل… ${a.progress}%`)}</p>
        </div>
      )}
      {a.done && !a.error && (
        <p className="rounded-xl bg-brand-50 p-2 text-xs dark:bg-white/5">
          {L('Downloaded. Tap Install. The first time, Android asks to allow installing from this app: turn it on, come back and tap Install again.', 'تم التنزيل. اضغط تثبيت. في المرة الأولى يطلب أندرويد السماح بالتثبيت من هذا التطبيق: فعّله ثم ارجع واضغط تثبيت مرة أخرى.')}
        </p>
      )}
      {a.error && !a.busy && <p className="text-xs text-red-600">{a.error}</p>}
      {a.done ? (
        <button className="btn-primary w-full" disabled={a.opening} onClick={a.install}>
          <Download size={18} /> {a.error ? L('Try again', 'حاول مجدداً') : L('Install', 'تثبيت')}
        </button>
      ) : (
        <button className="btn-primary w-full" disabled={a.busy} onClick={a.download}>
          <Download size={18} /> {a.busy ? L('Downloading…', 'جارٍ التنزيل…') : label || L('Download and install', 'تنزيل وتثبيت')}
        </button>
      )}
    </div>
  );
}

export default function UpdateBanner() {
  const { L } = useLang();
  const u = useUpdates();
  if (u.apk) {
    return (
      <div className="card space-y-3 bg-gold-100 dark:bg-gold-500/10">
        <div className="flex items-center gap-3">
          <Download className="shrink-0 text-gold-600" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{L(`New app version ${u.apk.version}`, `إصدار جديد من التطبيق ${u.apk.version}`)}</p>
            <p className="muted text-xs">{L('This one installs over the app once; your data stays. After it, updates arrive by themselves.', 'يُثبَّت فوق التطبيق مرة واحدة وبياناتك تبقى. بعده تصل التحديثات تلقائياً.')}</p>
          </div>
        </div>
        <ApkInstall apk={u.apk} />
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
