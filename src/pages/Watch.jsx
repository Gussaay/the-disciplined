import { useEffect, useState, useSyncExternalStore } from 'react';
import { BatteryMedium, Bluetooth, Bot, CheckCircle2, ClipboardCopy, Clock, Dumbbell, Footprints, HeartPulse, Link2, MessageSquare, RefreshCw, Search, Unlink } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Bars, Page, Section, useConfirm, useToast } from '../components/ui';
import { pickWatch, watchSupported } from '../lib/watch';
import { link, live, resetLive, subscribe } from '../lib/watchLive';
import { SPORTS } from '../lib/ls02';
import { logIssueUrl } from '../lib/reportLog';
import { openUrl } from '../lib/native';
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
  const [learning, setLearning] = useState(null);
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
  const workouts = lastDays(7, today).flatMap((k) => log[k]?.workouts || []).sort((a, b) => b.start - a.start).slice(0, 10);
  const sportName = (kind) => {
    const n = SPORTS[kind];
    return n ? L(n[0], n[1]) : L('Workout', 'تمرين');
  };

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
                {watch.name}{live.battery != null ? ` · ${L('battery', 'البطارية')} ${live.battery}%` : ''}{s?.protocol === 'heart-rate' ? ` · ${L('heart rate only', 'نبض القلب فقط')}` : ''}{live.firmware ? ` · ${live.firmware}` : ''}
              </p>
              {live.status === 'connected' && live.lastAck && (
                <p className="flex items-center gap-1 text-xs" style={{ color: THEME.color }}>
                  <CheckCircle2 size={12} /> {L(`The watch confirmed your last order at ${time(new Date(live.lastAck.at))}`, `أكدت الساعة استلام آخر أمر الساعة ${time(new Date(live.lastAck.at))}`)}
                </p>
              )}
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
            {day.hr?.length > 1 && <Spark points={day.hr} color="#EF4444" />}
            {learning && (
              <p className="rounded-xl bg-brand-50 p-2 text-sm dark:bg-white/5">
                {L(`Teaching the app your watch: trying start command ${learning[0]} of ${learning[1]}. Keep the watch on your wrist and don't touch it.`, `تعريف التطبيق بساعتك: تجربة أمر البدء ${learning[0]} من ${learning[1]}. أبقِ الساعة على معصمك ولا تلمسها.`)}
              </p>
            )}
            {!learning && busy === 'heart' && s?.promptHeart && !s.canStartHeart() && (
              <p className="rounded-xl bg-brand-50 p-2 text-sm dark:bg-white/5">{L('The watch is buzzing: tap the heart on it. The reading shows here and is saved.', 'الساعة تهتز الآن: اضغط على القلب فيها. تظهر القراءة هنا وتُحفظ.')}</p>
            )}
            {s && s.protocol !== 'heart-rate' && (
              <button
                className="btn-primary w-full"
                disabled={live.status !== 'connected' || busy === 'heart'}
                onClick={() => act('heart', async () => {
                  // First time: find the watch's start command by trying each known one.
                  if (s.learnHeart && !s.canStartHeart() && !wset.heartTried) {
                    setLearning([0, 0]);
                    try {
                      const found = await s.learnHeart((i, n) => setLearning([i, n]));
                      setWset({ ...wset, heartTried: true, ...(found ? { heartCmd: found } : {}) });
                      if (found) {
                        toast(L('Found it: the phone now starts the measurement.', 'وُجد الأمر: الهاتف يبدأ القياس الآن.'));
                        return;
                      }
                    } finally {
                      setLearning(null);
                    }
                  }
                  if (s.promptHeart && !s.canStartHeart()) {
                    await s.promptHeart();
                    await new Promise((r) => setTimeout(r, 60000));
                    return;
                  }
                  await s.measureHeart();
                  await new Promise((r) => setTimeout(r, 45000));
                  await s.stopHeart();
                })}
              >
                <HeartPulse size={18} /> {busy === 'heart' ? L('Measuring… keep the watch on', 'جارٍ القياس… أبقِ الساعة على معصمك') : L('Measure now', 'قِس الآن')}
              </button>
            )}
            {s?.measureBp && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-soft !min-h-[44px] text-sm"
                  disabled={live.status !== 'connected' || busy === 'bp'}
                  onClick={() => act('bp', async () => {
                    await s.measureBp();
                    await new Promise((r) => setTimeout(r, 45000));
                    await s.stopBp();
                  }, L('Blood pressure saved from the watch', 'حُفظ الضغط من الساعة'))}
                >
                  {busy === 'bp' ? L('Measuring…', 'جارٍ القياس…') : L('Blood pressure', 'ضغط الدم')}
                </button>
                <button
                  className="btn-soft !min-h-[44px] text-sm"
                  disabled={live.status !== 'connected' || busy === 'spo2'}
                  onClick={() => act('spo2', async () => {
                    await s.measureSpo2();
                    await new Promise((r) => setTimeout(r, 45000));
                    await s.stopSpo2();
                  }, L('Oxygen saved from the watch', 'حُفظ الأكسجين من الساعة'))}
                >
                  {busy === 'spo2' ? L('Measuring…', 'جارٍ القياس…') : L('Oxygen', 'الأكسجين')}
                </button>
              </div>
            )}
            {s?.promptHeart && !s.canStartHeart() && wset.heartTried && (
              <p className="muted text-xs">
                {L('This watch does not take a start order for heart rate from any app: it measures by itself every 10 minutes (saved here), live while its heart screen is open, and during a workout started on the watch. Measure now makes it buzz so you only tap the heart.', 'هذه الساعة لا تقبل أمر بدء قياس النبض من أي تطبيق: تقيس تلقائياً كل 10 دقائق (تُحفظ هنا)، ومباشرة عند فتح شاشة النبض، وأثناء تمرين تبدؤه من الساعة. زر "قِس الآن" يجعلها تهتز لتضغط على القلب فقط.')}{' '}
                <button className="underline" onClick={() => setWset({ ...wset, heartTried: false })}>{L('Try the start commands again', 'جرّب أوامر البدء مرة أخرى')}</button>
              </p>
            )}
            <p className="muted text-xs">{L('Watch readings are for tracking, not for medical decisions.', 'قراءات الساعة للمتابعة وليست للتشخيص الطبي.')}</p>
          </div>

          {s && s.protocol !== 'heart-rate' && (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected'} onClick={() => act('refresh', s.refresh, L('Updated', 'تم التحديث'))}>
                <RefreshCw size={16} /> {L('Update', 'تحديث')}
              </button>
              <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected' || !s.findWatch} onClick={() => act('find', s.findWatch, L('The watch is vibrating', 'الساعة تهتز'))}>
                <Search size={16} /> {L('Find', 'ابحث')}
              </button>
              <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected'} onClick={() => act('time', s.syncTime, L('Time set', 'ضُبط الوقت'))}>
                <Clock size={16} /> {L('Set time', 'اضبط الوقت')}
              </button>
              <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected' || !s.notify} onClick={() => act('msg', () => s.notify('Hello from The Disciplined'), L('Sent: check the watch screen', 'أُرسلت: انظر إلى شاشة الساعة'))}>
                <MessageSquare size={16} /> {L('Test message', 'رسالة تجربة')}
              </button>
            </div>
          )}

          {(live.sport || workouts.length > 0) && (
            <Section title={L('Workouts on the watch', 'تمارين الساعة')}>
              <div className="card space-y-2">
                {live.sport && (
                  <p className="flex items-center gap-2 text-sm font-bold" style={{ color: THEME.color }}>
                    <Dumbbell size={16} className="animate-pulse" /> {L(`${sportName(live.sport.kind)} in progress`, `${sportName(live.sport.kind)} جارٍ الآن`)}{live.heart?.bpm ? ` · ${live.heart.bpm} ${L('bpm', 'نبضة/د')}` : ''}
                  </p>
                )}
                {workouts.map((w) => (
                  <div key={w.start} className="flex items-center justify-between gap-2 text-sm">
                    <span><span className="font-bold">{sportName(w.kind)}</span> <span className="muted">{date(new Date(w.start), { weekday: 'short' })} {time(new Date(w.start))}</span></span>
                    <span className="tabular">{L(`${Math.max(1, Math.round((w.end - w.start) / 60000))} min`, `${Math.max(1, Math.round((w.end - w.start) / 60000))} د`)}{w.bpmAvg ? ` · ♥ ${w.bpmAvg}/${w.bpmMax}` : ''}</span>
                  </div>
                ))}
              </div>
            </Section>
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

          {s?.setDrinkReminder && (
            <Section title={L('More watch features', 'مزايا إضافية للساعة')}>
              <div className="card space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold">{L('Drink water reminder', 'تذكير شرب الماء')}</span>
                  <select className="input !w-32" value={wset.drinkMinutes ?? 60} onChange={(e) => setWset({ ...wset, drinkMinutes: Number(e.target.value) })}>
                    {[30, 45, 60, 90, 120].map((v) => <option key={v} value={v}>{L(`every ${v} min`, `كل ${v} دقيقة`)}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected' || busy === 'drink'} onClick={() => act('drink', () => s.setDrinkReminder({ on: true, minutes: wset.drinkMinutes ?? 60 }), L('Reminder set on the watch', 'ضُبط التذكير على الساعة'))}>
                    {L('Turn on', 'تشغيل')}
                  </button>
                  <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected' || busy === 'drink'} onClick={() => act('drink', () => s.setDrinkReminder({ on: false, minutes: wset.drinkMinutes ?? 60 }), L('Reminder off', 'أُوقف التذكير'))}>
                    {L('Turn off', 'إيقاف')}
                  </button>
                </div>
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold">{L('Watch alarm', 'منبه الساعة')}</span>
                  <span className="flex items-center gap-2">
                    <input type="time" className="input !w-28" value={wset.alarmTime ?? '07:00'} onChange={(e) => setWset({ ...wset, alarmTime: e.target.value })} />
                    <input type="checkbox" className="h-5 w-5" checked={wset.alarmOn ?? false} onChange={(e) => setWset({ ...wset, alarmOn: e.target.checked })} />
                  </span>
                </label>
                <button
                  className="btn-soft w-full !min-h-[44px] text-sm"
                  disabled={live.status !== 'connected' || busy === 'alarm'}
                  onClick={() => act('alarm', () => {
                    const [h, m] = String(wset.alarmTime ?? '07:00').split(':').map(Number);
                    return s.setAlarm({ on: wset.alarmOn ?? false, hour: h || 0, minute: m || 0 });
                  }, L('Alarm sent to the watch', 'أُرسل المنبه إلى الساعة'))}
                >
                  {L('Send alarm', 'أرسل المنبه')}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected' || busy === 'shake'} onClick={() => act('shake', () => s.setShakePhoto(true), L('Shake to take a photo is on', 'الاهتزاز للتصوير يعمل'))}>
                    {L('Shake for photo', 'اهتزاز للصورة')}
                  </button>
                  <button className="btn-soft !min-h-[44px] text-sm" disabled={live.status !== 'connected' || busy === 'shake'} onClick={() => act('shake', () => s.setShakePhoto(false), L('Shake for photo is off', 'أُوقف الاهتزاز للتصوير'))}>
                    {L('Shake photo off', 'إيقاف اهتزاز الصورة')}
                  </button>
                </div>
              </div>
            </Section>
          )}

          <Section title={L('Steps, last 7 days', 'الخطوات، آخر 7 أيام')}>
            <div className="card">
              <Bars color={THEME.color} data={week.map((d) => ({ label: date(fromKey(d.key), { weekday: 'short' }), value: d.steps, mark: d.steps >= goal }))} format={(v) => num(v)} />
              {day.updated && <p className="muted mt-2 text-xs">{L(`Last update ${time(new Date(day.updated))}`, `آخر تحديث ${time(new Date(day.updated))}`)}</p>}
            </div>
          </Section>

          <button
            className="btn-soft w-full text-sm"
            onClick={() => openUrl(logIssueUrl(`Watch log ${watch.name}`, [`${watch.name} ${watch.id} ${live.session?.protocol || ''} ${live.firmware || ''}`, `status ${live.status}`, live.error, ...live.log]))}
          >
            <Bot size={16} /> {L('Send log to Claude (GitHub)', 'أرسل السجل إلى Claude (GitHub)')}
          </button>
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
                resetLive();
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

// Today's heart readings as a small line, minute of day across.
function Spark({ points, color }) {
  const vals = points.map((p) => p[1]);
  const lo = Math.min(...vals) - 5;
  const hi = Math.max(...vals) + 5;
  const x = (m) => (m / 1440) * 300;
  const y = (b) => 50 - ((b - lo) / (hi - lo || 1)) * 46;
  return (
    <svg viewBox="0 0 300 54" className="h-14 w-full" role="img" aria-label="heart today">
      <line x1="0" x2="300" y1="52" y2="52" stroke="currentColor" opacity="0.15" />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={points.map(([m, b]) => `${x(m).toFixed(1)},${y(b).toFixed(1)}`).join(' ')} />
    </svg>
  );
}
