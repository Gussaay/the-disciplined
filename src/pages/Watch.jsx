import { useEffect, useState, useSyncExternalStore } from 'react';
import { BatteryMedium, Bluetooth, ClipboardCopy, Clock, Footprints, HeartPulse, Link2, RefreshCw, Search, Unlink } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Bars, Page, Section, useConfirm, useToast } from '../components/ui';
import { pickWatch, watchSupported } from '../lib/watch';
import { link, live, subscribe } from '../lib/watchLive';
import { dayKey, fromKey, lastDays } from '../lib/dates';

const NONE = {};
const THEME = goalById('watch');

export default function Watch() {
  const { L, num, date, time } = useLang();
  const toast = useToast();
  const confirm = useConfirm();
  const [profile, setProfile] = useStore('profile', NONE);
  const [wset, setWset] = useStore('watchSettings', NONE);
  const [watch, setWatch] = useStore('watch', null);
  const [log] = useStore('watchLog', NONE);
  const [busy, setBusy] = useState('');
  useSyncExternalStore(subscribe, () => live.version || 0);

  useEffect(() => {
    if (watch?.id && watchSupported() && (live.status === 'idle' || live.status === 'disconnected')) link(watch, profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch?.id]);

  // While connected, ask the watch for its totals every minute.
  useEffect(() => {
    if (live.status !== 'connected') return undefined;
    const t = setInterval(() => live.session?.refresh?.().catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [live.status]);

  const today = dayKey();
  const day = log[today] || {};
  const week = lastDays(7, today).map((k) => ({ key: k, steps: log[k]?.steps || 0 }));
  const goal = Number(profile.stepGoal) || 8000;
  const s = live.session;

  const choose = async () => {
    try {
      const w = await pickWatch();
      setWatch(w);
      live.status = 'idle';
      link(w, profile);
    } catch (e) {
      if (!/cancel/i.test(e.message)) toast(e.message, 'error');
    }
  };

  const act = async (name, fn, done) => {
    setBusy(name);
    try {
      await fn();
      if (done) toast(done);
    } catch (e) {
      toast(e.message || L('The watch did not answer', 'لم تستجب الساعة'), 'error');
    } finally {
      setBusy('');
    }
  };

  const statusText = {
    idle: L('Not connected', 'غير متصلة'),
    connecting: L('Connecting…', 'جارٍ الاتصال…'),
    connected: L('Connected', 'متصلة'),
    disconnected: L('Disconnected', 'انقطع الاتصال'),
    error: L('Could not connect', 'تعذر الاتصال'),
  }[live.status];

  return (
    <Page goal="watch" title={L('My watch', 'ساعتي')} subtitle={watch ? `${watch.name} · ${statusText}` : undefined}>
      {!watchSupported() && (
        <p className="card muted text-sm">{L('Linking the watch works in the Android app.', 'ربط الساعة يعمل في تطبيق أندرويد.')}</p>
      )}

      {watchSupported() && !watch && (
        <div className="card space-y-3">
          <p className="font-bold">{L('Link your watch without its app', 'اربط ساعتك دون تطبيقها')}</p>
          <ol className="list-decimal space-y-1.5 ps-5 text-sm">
            <li>{L('In the FitPro app: Device → Unbind, then close FitPro. A watch talks to one app at a time.', 'في تطبيق FitPro: الجهاز ← إلغاء الربط، ثم أغلق FitPro. الساعة تتصل بتطبيق واحد فقط.')}</li>
            <li>{L('In the phone’s Bluetooth settings, forget the watch if it is listed.', 'في إعدادات البلوتوث بالهاتف، احذف الساعة إن كانت مقترنة.')}</li>
            <li>{L('Keep Bluetooth and Location on, and the watch next to the phone.', 'أبقِ البلوتوث والموقع مفعّلين والساعة قرب الهاتف.')}</li>
            <li>{L('Tap Link and pick the watch (often named after its model, e.g. GZCSW02, M6 or a “FitPro” name).', 'اضغط ربط واختر الساعة (غالباً باسم طرازها مثل GZCSW02 أو M6).')}</li>
          </ol>
          <button className="btn-primary w-full" onClick={choose}>
            <Link2 size={18} /> {L('Link my watch', 'اربط ساعتي')}
          </button>
        </div>
      )}

      {watch && (
        <>
          <div className="card flex items-center gap-3">
            <Bluetooth className={live.status === 'connecting' ? 'animate-pulse' : ''} style={{ color: live.status === 'connected' ? THEME.color : undefined }} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{statusText}</p>
              <p className="muted text-xs">
                {watch.name}{live.battery != null ? ` · ${L('battery', 'البطارية')} ${live.battery}%` : ''}{s?.protocol === 'heart-rate' ? ` · ${L('heart rate only', 'نبض القلب فقط')}` : ''}
              </p>
            </div>
            {live.battery != null && <BatteryMedium className="muted" />}
            {live.status !== 'connected' && live.status !== 'connecting' && (
              <button className="btn-soft !min-h-[40px] !px-3 text-sm" onClick={() => link(watch, profile)}>
                <RefreshCw size={16} /> {L('Connect', 'اتصل')}
              </button>
            )}
          </div>
          {live.status === 'error' && (
            <p className="card text-sm text-red-600">
              {live.error}
              <br />
              <span className="muted">{L('Make sure FitPro is closed and the watch is unbound there, then tap Connect.', 'تأكد أن FitPro مغلق وأن الساعة غير مربوطة فيه، ثم اضغط اتصل.')}</span>
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Tile icon={<Footprints size={18} />} label={L('Steps', 'الخطوات')} value={day.steps != null ? num(day.steps) : '–'} />
            <Tile label={L('Distance', 'المسافة')} value={day.distance != null ? `${num(day.distance / 1000, 2)} ${L('km', 'كم')}` : '–'} />
            <Tile label={L('Calories', 'السعرات')} value={day.kcal != null ? num(day.kcal) : '–'} />
          </div>
          {day.steps != null && (
            <div className="h-2 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10" aria-label={L('Step goal', 'هدف الخطوات')}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (day.steps / goal) * 100)}%`, background: THEME.color }} />
            </div>
          )}

          <div className="card space-y-3">
            <div className="flex items-center gap-3">
              <HeartPulse className="text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="tabular text-2xl font-extrabold">
                  {live.heart?.bpm || day.bpm || '–'} <span className="muted text-sm font-normal">{L('bpm', 'نبضة/د')}</span>
                </p>
                <p className="muted text-xs">
                  {[
                    (live.heart?.spo2 || day.spo2) && `SpO₂ ${live.heart?.spo2 || day.spo2}%`,
                    (live.heart?.systolic || day.systolic) && `${L('BP', 'الضغط')} ${live.heart?.systolic || day.systolic}/${live.heart?.diastolic || day.diastolic}`,
                    day.bpmMin && day.bpmMax && L(`today ${day.bpmMin}–${day.bpmMax}`, `اليوم ${day.bpmMin}–${day.bpmMax}`),
                  ].filter(Boolean).join(' · ') || L('Measure to see heart rate, oxygen and blood pressure', 'قِس لترى النبض والأكسجين والضغط')}
                </p>
              </div>
            </div>
            {s && s.protocol !== 'heart-rate' && s.measureHint && busy === 'heart' && (
              <p className="rounded-xl bg-brand-50 p-2 text-sm dark:bg-white/5">{L('The phone asked the watch to measure. Keep still. If nothing shows within 30 seconds, open the heart screen on the watch once, then send me the connection log.', 'طلب الهاتف من الساعة القياس. ابقَ ثابتاً. إن لم تظهر قراءة خلال 30 ثانية فافتح شاشة النبض في الساعة مرة، ثم أرسل لي سجل الاتصال.')}</p>
            )}
            {s && s.protocol !== 'heart-rate' && (
              <button
                className="btn-primary w-full"
                disabled={live.status !== 'connected' || busy === 'heart'}
                onClick={() => act('heart', async () => {
                  await s.measureHeart();
                  await new Promise((r) => setTimeout(r, 45000));
                  await s.stopHeart();
                })}
              >
                <HeartPulse size={18} /> {busy === 'heart' ? L('Measuring… keep the watch on', 'جارٍ القياس… أبقِ الساعة على معصمك') : L('Measure now', 'قِس الآن')}
              </button>
            )}
            <p className="muted text-xs">{L('Watch readings are for tracking, not for medical decisions.', 'قراءات الساعة للمتابعة وليست للتشخيص الطبي.')}</p>
          </div>

          {s && s.protocol !== 'heart-rate' && (
            <div className="grid grid-cols-3 gap-2">
              <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected'} onClick={() => act('refresh', s.refresh, L('Updated', 'تم التحديث'))}>
                <RefreshCw size={16} /> {L('Update', 'تحديث')}
              </button>
              <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected' || !s.findWatch} onClick={() => act('find', s.findWatch, L('The watch is vibrating', 'الساعة تهتز'))}>
                <Search size={16} /> {L('Find', 'ابحث')}
              </button>
              <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected'} onClick={() => act('time', s.syncTime, L('Time set', 'ضُبط الوقت'))}>
                <Clock size={16} /> {L('Set time', 'اضبط الوقت')}
              </button>
            </div>
          )}

          {s?.settings && (
            <Section title={L('Watch settings', 'إعدادات الساعة')}>
              <div className="card space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold">{L('Daily step goal', 'هدف الخطوات اليومي')}</span>
                  <select className="input !w-32" value={goal} onChange={(e) => setProfile({ ...profile, stepGoal: Number(e.target.value) })}>
                    {[4000, 6000, 8000, 10000, 12000, 15000].map((g) => <option key={g} value={g}>{num(g)}</option>)}
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold">{L('Screen stays on', 'مدة إضاءة الشاشة')}</span>
                  <select className="input !w-32" value={wset.screen ?? 10} onChange={(e) => setWset({ ...wset, screen: Number(e.target.value) })}>
                    {[5, 10, 15, 20, 30].map((v) => <option key={v} value={v}>{L(`${v} s`, `${v} ث`)}</option>)}
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold">{L('Raise wrist to wake the screen', 'ارفع المعصم لإضاءة الشاشة')}</span>
                  <input type="checkbox" className="h-5 w-5" checked={wset.wrist ?? true} onChange={(e) => setWset({ ...wset, wrist: e.target.checked })} />
                </label>
                <button
                  className="btn-primary w-full"
                  disabled={live.status !== 'connected' || busy === 'settings'}
                  onClick={() => act('settings', () => s.applySettings({ stepGoal: goal, screen: wset.screen ?? 10, wrist: wset.wrist ?? true }), L('Sent to the watch', 'أُرسلت إلى الساعة'))}
                >
                  {L('Send to the watch', 'أرسل إلى الساعة')}
                </button>
              </div>
            </Section>
          )}

          <Section title={L('Steps, last 7 days', 'الخطوات، آخر 7 أيام')}>
            <div className="card">
              <Bars color={THEME.color} data={week.map((d) => ({ label: date(fromKey(d.key), { weekday: 'short' }), value: d.steps, mark: d.steps >= goal }))} format={(v) => num(v)} />
              {day.updated && <p className="muted mt-2 text-xs">{L(`Last update ${time(new Date(day.updated))}`, `آخر تحديث ${time(new Date(day.updated))}`)}</p>}
            </div>
          </Section>

          <div className="flex gap-2">
            <button
              className="btn-ghost flex-1 text-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText([`The Disciplined watch log: ${watch.name} ${watch.id} ${live.session?.protocol || ''}`, live.error, ...live.log].filter(Boolean).join('\n'));
                  toast(L('Copied. Paste it in the chat with Claude.', 'نُسخ. الصقه في المحادثة مع Claude.'));
                } catch {
                  toast(L('Could not copy', 'تعذر النسخ'), 'error');
                }
              }}
            >
              <ClipboardCopy size={16} /> {L('Copy connection log', 'انسخ سجل الاتصال')}
            </button>
            <button
              className="btn-ghost flex-1 text-sm text-red-600"
              onClick={async () => {
                if (!(await confirm({ title: L('Forget this watch?', 'إلغاء ربط هذه الساعة؟'), body: L('Steps and heart readings already saved stay.', 'الخطوات والقراءات المحفوظة تبقى.'), yes: L('Forget', 'إلغاء الربط') }))) return;
                await live.session?.disconnect?.();
                set({ status: 'idle', session: null, battery: null, heart: null, log: [] });
                setWatch(null);
              }}
            >
              <Unlink size={16} /> {L('Forget watch', 'إلغاء الربط')}
            </button>
          </div>
        </>
      )}
    </Page>
  );
}

function Tile({ icon, label, value }) {
  return (
    <div className="card !p-3">
      <p className="muted flex items-center gap-1 text-xs">{icon}{label}</p>
      <p className="tabular text-lg font-extrabold">{value}</p>
    </div>
  );
}
