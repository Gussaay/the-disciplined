import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, ExternalLink, KeyRound, LogOut, Upload } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { useTheme } from '../hooks/useTheme';
import { canGoogle, logout, resetPassword, signIn, signInGoogle, signUp, useAuth } from '../hooks/useAuth';
import { APP_VERSION, BUILD_VERSION, GOALS } from '../config';
import { Field, NumberInput, Page, Section, Segmented, useToast } from '../components/ui';
import ProfileForm from '../components/ProfileForm';
import { dailyTargets } from '../lib/nutrition';
import { exportAll, importAll } from '../lib/store';
import { downloadText, openUrl } from '../lib/native';
import { askAI } from '../lib/ai';
import { clearReminders, remindersSupported } from '../lib/notify';
import { dayKey } from '../lib/dates';

const NONE = {};

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="muted block text-xs">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-400 dark:bg-white/20 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:start-6" />
    </label>
  );
}

function Account() {
  const { L } = useLang();
  const toast = useToast();
  const { user, cloudEnabled } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled) {
    return (
      <p className="text-sm">
        {L(
          'Your data is kept on this device only. Use the backup file below to move it to another phone. Cloud backup across devices turns on once a Firebase project is connected (see the README).',
          'بياناتك محفوظة على هذا الجهاز فقط. استخدم ملف النسخة الاحتياطية بالأسفل لنقلها إلى هاتف آخر. تُفعَّل المزامنة السحابية بين الأجهزة عند ربط مشروع Firebase (راجع ملف README).',
        )}
      </p>
    );
  }

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
    } catch (error) {
      const code = error?.code || '';
      toast(
        /invalid-credential|wrong-password|user-not-found/.test(code) ? L('Wrong email or password', 'البريد أو كلمة المرور غير صحيحة')
          : /email-already-in-use/.test(code) ? L('This email already has an account. Sign in instead.', 'لهذا البريد حساب بالفعل. سجّل الدخول.')
            : /weak-password/.test(code) ? L('Use at least 6 characters', 'استخدم 6 أحرف على الأقل')
              : /invalid-email|missing-email/.test(code) ? L('Check the email address', 'تحقق من عنوان البريد')
                : /popup-closed/.test(code) ? L('Sign-in was cancelled', 'أُلغي تسجيل الدخول')
                  : error?.message || L('Could not sign in', 'تعذر تسجيل الدخول'),
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          {L('Signed in as ', 'مسجّل الدخول باسم ')}<b dir="ltr">{user.email}</b>.{' '}
          {L('Everything you record is backed up and follows you to your other devices.', 'كل ما تسجله يُحفظ احتياطياً وينتقل معك إلى أجهزتك الأخرى.')}
        </p>
        <button className="btn-soft w-full" onClick={() => run(logout)}>
          <LogOut size={18} /> {L('Sign out', 'تسجيل الخروج')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">{L('Sign in to back up your data and use it on several devices.', 'سجّل الدخول لحفظ بياناتك احتياطياً واستخدامها على عدة أجهزة.')}</p>
      <Field label={L('Email', 'البريد الإلكتروني')}>
        <input className="input" dir="ltr" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label={L('Password', 'كلمة المرور')}>
        <input className="input" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary" disabled={busy || !email || !password} onClick={() => run(() => signIn(email, password))}>{L('Sign in', 'تسجيل الدخول')}</button>
        <button className="btn-soft" disabled={busy || !email || !password} onClick={() => run(() => signUp(email, password))}>{L('Create account', 'إنشاء حساب')}</button>
      </div>
      {canGoogle && (
        <button className="btn-soft w-full" disabled={busy} onClick={() => run(signInGoogle)}>{L('Continue with Google', 'المتابعة بحساب Google')}</button>
      )}
      <button className="btn-ghost w-full text-sm" disabled={busy || !email} onClick={() => run(() => resetPassword(email), L('Reset link sent to your email', 'أُرسل رابط إعادة التعيين إلى بريدك'))}>
        {L('Forgot the password?', 'نسيت كلمة المرور؟')}
      </button>
    </div>
  );
}

export default function Settings() {
  const { L, pick, lang, setLang, num } = useLang();
  const toast = useToast();
  const location = useLocation();
  const [theme, setTheme] = useTheme();
  const [settings, setSettings] = useStore('settings', NONE);
  const [profile, setProfile] = useStore('profile', NONE);
  const [device, setDevice] = useStore('device', NONE);
  const [testing, setTesting] = useState(false);
  const file = useRef();
  const targets = dailyTargets(profile);
  const reminders = settings.reminders || NONE;

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  const setReminder = (patch) => {
    const next = { ...reminders, ...patch };
    setSettings({ ...settings, reminders: next });
    if (next.enabled === false) clearReminders().catch(() => {});
  };

  const testAi = async () => {
    setTesting(true);
    try {
      const reply = await askAI({ system: 'Reply with the single word: ready', prompt: 'Are you there?' });
      toast(reply ? L('AI is working', 'الذكاء الاصطناعي يعمل') : L('No answer', 'لا توجد إجابة'));
    } catch (error) {
      toast(error?.code === 'ai-setup' ? L('Paste a key first', 'الصق المفتاح أولاً') : error?.message || L('The key did not work', 'المفتاح لم يعمل'), 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Page title={L('Settings', 'الإعدادات')} back="/">
      <Section title={L('Language and appearance', 'اللغة والمظهر')}>
        <div className="card space-y-3">
          <Segmented value={lang} onChange={setLang} options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} />
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: L('Same as phone', 'مثل الهاتف') },
              { value: 'light', label: L('Light', 'فاتح') },
              { value: 'dark', label: L('Dark', 'داكن') },
            ]}
          />
        </div>
      </Section>

      <Section title={L('About you', 'بياناتك')}>
        <div className="card space-y-4">
          <ProfileForm value={profile} onChange={(next) => setProfile({ ...next, setup: true })} />
          <div className="rounded-xl bg-brand-50 p-3 text-sm dark:bg-white/5">
            <p className="font-bold">{L('Your daily targets', 'أهدافك اليومية')}</p>
            <p className="tabular mt-1">
              {L(
                `${num(targets.kcal)} kcal · protein ${targets.protein} g · carbs ${targets.carbs} g · fat ${targets.fat} g · sugar under ${targets.sugar} g · water ${num(targets.water)} ml`,
                `${num(targets.kcal)} سعرة · بروتين ${targets.protein} جم · كربوهيدرات ${targets.carbs} جم · دهون ${targets.fat} جم · سكر أقل من ${targets.sugar} جم · ماء ${num(targets.water)} مل`,
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={L('My own calories', 'سعراتي الخاصة')} hint={L('Leave empty to use the calculated value', 'اتركه فارغاً لاستخدام القيمة المحسوبة')}>
              <NumberInput
                value={profile.targets?.kcal ?? ''}
                onChange={(v) => {
                  const t = { ...(profile.targets || {}) };
                  if (v) t.kcal = v; else delete t.kcal;
                  setProfile({ ...profile, targets: t });
                }}
              />
            </Field>
            <Field label={L('My own protein, g', 'البروتين الخاص بي، جم')}>
              <NumberInput
                value={profile.targets?.protein ?? ''}
                onChange={(v) => {
                  const t = { ...(profile.targets || {}) };
                  if (v) t.protein = v; else delete t.protein;
                  setProfile({ ...profile, targets: t });
                }}
              />
            </Field>
          </div>
          <Field label={L('Foods you like or have at home', 'أطعمة تحبها أو متوفرة لديك')} hint={L('Used by the AI meal ideas.', 'تستخدمها اقتراحات الوجبات بالذكاء الاصطناعي.')}>
            <input className="input" value={profile.foodLikes || ''} onChange={(e) => setProfile({ ...profile, foodLikes: e.target.value })} />
          </Field>
        </div>
      </Section>

      <Section title={L('Goals counted in your day', 'الأهداف المحسوبة في يومك')}>
        <div className="card divide-y divide-brand-900/10 !py-1 dark:divide-white/10">
          {GOALS.map((g) => (
            <Toggle
              key={g.id}
              label={`${g.icon} ${pick(g.name)}`}
              checked={settings.modules?.[g.id] !== false}
              onChange={(on) => setSettings({ ...settings, modules: { ...(settings.modules || {}), [g.id]: on } })}
            />
          ))}
        </div>
      </Section>

      <div id="ai" className="scroll-mt-20">
        <Section title={L('AI', 'الذكاء الاصطناعي')}>
          <div className="card space-y-3">
            <p className="text-sm">
              {L(
                'AI recognises gym machines and food from photos, suggests meals, writes a training programme and tutors your English. It needs a Gemini key, which Google gives for free. The key is kept on this device only.',
                'يتعرف الذكاء الاصطناعي على أجهزة النادي والطعام من الصور، ويقترح الوجبات، ويكتب برنامج التمرين، ويعلّمك الإنجليزية. يحتاج إلى مفتاح Gemini تقدمه Google مجاناً، ويُحفظ على هذا الجهاز فقط.',
              )}
            </p>
            <button className="btn-soft w-full" onClick={() => openUrl('https://aistudio.google.com/apikey')}>
              <KeyRound size={18} /> {L('Get a free key from Google AI Studio', 'احصل على مفتاح مجاني من Google AI Studio')} <ExternalLink size={14} />
            </button>
            <Field label={L('Gemini API key', 'مفتاح Gemini API')}>
              <input
                className="input" dir="ltr" type="password" autoComplete="off" placeholder="AIza…"
                value={device.geminiKey || ''}
                onChange={(e) => setDevice({ ...device, geminiKey: e.target.value.trim() })}
              />
            </Field>
            <button className="btn-primary w-full" onClick={testAi} disabled={testing}>
              {testing ? L('Testing…', 'جارٍ الاختبار…') : L('Test the AI', 'اختبر الذكاء الاصطناعي')}
            </button>
          </div>
        </Section>
      </div>

      {remindersSupported && (
        <Section title={L('Reminders', 'التذكيرات')}>
          <div className="card divide-y divide-brand-900/10 !py-1 dark:divide-white/10">
            <Toggle label={L('Reminders on this phone', 'التذكيرات على هذا الهاتف')} checked={reminders.enabled === true} onChange={(enabled) => setReminder({ enabled })} />
            {reminders.enabled === true && (
              <>
                <Toggle label={L('Prayer times', 'مواقيت الصلاة')} checked={reminders.prayer !== false} onChange={(prayer) => setReminder({ prayer })} />
                <Toggle label={L('People who are due a call', 'من حان موعد التواصل معهم')} hint={L('Once a day at 6 pm', 'مرة يومياً الساعة 6 مساءً')} checked={reminders.social !== false} onChange={(social) => setReminder({ social })} />
                <Toggle label={L('English study', 'دراسة الإنجليزية')} hint={L('Once a day at 8 pm', 'مرة يومياً الساعة 8 مساءً')} checked={reminders.english !== false} onChange={(english) => setReminder({ english })} />
              </>
            )}
          </div>
        </Section>
      )}

      <Section title={L('Account and backup', 'الحساب والنسخ الاحتياطي')}>
        <div className="card space-y-4">
          <Account />
          <div className="grid grid-cols-2 gap-2 border-t border-brand-900/10 pt-4 dark:border-white/10">
            <button className="btn-soft" onClick={() => downloadText(`the-disciplined-${dayKey()}.json`, JSON.stringify(exportAll()))}>
              <Download size={18} /> {L('Save a backup', 'حفظ نسخة')}
            </button>
            <button className="btn-soft" onClick={() => file.current?.click()}>
              <Upload size={18} /> {L('Restore', 'استعادة')}
            </button>
            <input
              ref={file} type="file" accept="application/json,.json" className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  importAll(JSON.parse(await f.text()));
                  toast(L('Backup restored', 'تمت استعادة النسخة'));
                } catch {
                  toast(L('This is not a backup file of this app', 'هذا ليس ملف نسخة احتياطية لهذا التطبيق'), 'error');
                }
              }}
            />
          </div>
        </div>
      </Section>

      <p className="muted pb-4 text-center text-xs">
        {L('The Disciplined', 'الملتزم')} · {L(`version ${APP_VERSION}`, `الإصدار ${APP_VERSION}`)} ({BUILD_VERSION})
        <br />
        {L(
          'Nutrition values and calorie targets are estimates, not medical advice.',
          'القيم الغذائية وأهداف السعرات تقديرية وليست نصيحة طبية.',
        )}
      </p>
    </Page>
  );
}
