import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Download, ExternalLink, Eye, EyeOff, KeyRound, Lock, LogIn, LogOut, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { biometricAvailable, forgetLogin, hasSavedLogin, verify } from '../lib/biometric';
import UpdateBanner, { useUpdates } from '../components/UpdateBanner';
import { checkForUpdates } from '../lib/liveUpdate';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { useTheme } from '../hooks/useTheme';
import { authMessage, logout, resendVerification, useAuth } from '../hooks/useAuth';
import { APK_LATEST_URL, APP_VERSION, BUILD_VERSION, GOALS } from '../config';
import { Field, NumberInput, Page, Section, Segmented, useToast } from '../components/ui';
import ProfileForm from '../components/ProfileForm';
import { dailyTargets } from '../lib/nutrition';
import { exportAll, importAll } from '../lib/store';
import { downloadText, isNative, openUrl } from '../lib/native';
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
  const navigate = useNavigate();
  const { user, cloudEnabled } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!cloudEnabled) {
    return (
      <p className="text-sm">
        {L(
          'Your data is kept on this device only. Use the backup file below to move it to another phone.',
          'بياناتك محفوظة على هذا الجهاز فقط. استخدم ملف النسخة الاحتياطية بالأسفل لنقلها إلى هاتف آخر.',
        )}
      </p>
    );
  }

  if (user) {
    const password = user.providerData?.some((p) => p.providerId === 'password');
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-extrabold text-white">
            {(user.displayName || user.email || '?').trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            {user.displayName && <p className="truncate font-bold">{user.displayName}</p>}
            <p className="muted truncate text-sm" dir="ltr" style={{ textAlign: 'start' }}>{user.email}</p>
          </div>
        </div>
        <p className="text-sm">{L('Everything you record is backed up and follows you to your other devices.', 'كل ما تسجله يُحفظ احتياطياً وينتقل معك إلى أجهزتك الأخرى.')}</p>
        {password && !user.emailVerified && (
          <button
            className="btn-ghost w-full text-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await resendVerification();
                toast(L('Verification email sent', 'أُرسلت رسالة التحقق'));
              } catch (e) {
                toast(authMessage(e, L), 'error');
              } finally {
                setBusy(false);
              }
            }}
          >
            {L('Email not verified yet. Send the link again', 'البريد غير مؤكد بعد. أرسل الرابط مجدداً')}
          </button>
        )}
        <button className="btn-soft w-full" onClick={() => logout().catch(() => {})}>
          <LogOut size={18} /> {L('Sign out', 'تسجيل الخروج')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">{L('Sign in or create an account to back up your data and use it on several devices.', 'سجّل الدخول أو أنشئ حساباً لحفظ بياناتك احتياطياً واستخدامها على عدة أجهزة.')}</p>
      <button className="btn-primary w-full" onClick={() => navigate('/signin')}>
        <LogIn size={18} /> {L('Sign in or create an account', 'سجّل الدخول أو أنشئ حساباً')}
      </button>
    </div>
  );
}

/** "AIza••••••••Xk3Q": enough to recognise a key without showing it. */
const maskKey = (key) => (key.length > 10 ? `${key.slice(0, 4)}${'•'.repeat(8)}${key.slice(-4)}` : '•'.repeat(8));

/**
 * An API key field. Once saved it is shown masked and cannot be changed by a
 * stray tap: "Edit" opens it again, and Save or Cancel closes it.
 */
function KeyField({ label, placeholder, value, onSave, getUrl, getLabel }) {
  const { L } = useLang();
  const toast = useToast();
  const [editing, setEditing] = useState(!value);
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);

  if (!editing && value) {
    return (
      <div className="rounded-2xl border border-brand-900/10 p-3 dark:border-white/10">
        <p className="text-sm font-medium">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <Lock size={16} className="shrink-0 text-brand-600" />
          <span className="tabular min-w-0 flex-1 truncate font-mono text-sm" dir="ltr" style={{ textAlign: 'start' }}>{maskKey(value)}</span>
          <button className="btn-soft !min-h-[36px] !px-3 text-sm" onClick={() => { setDraft(value); setEditing(true); }}>
            <Pencil size={14} /> {L('Edit', 'تعديل')}
          </button>
        </div>
        <p className="muted mt-1 text-xs">{L('Saved on this device. Press Edit to change or remove it.', 'محفوظ على هذا الجهاز. اضغط «تعديل» لتغييره أو حذفه.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-brand-900/10 p-3 dark:border-white/10">
      <Field label={label}>
        <div className="relative">
          <input
            className="input !pe-12" dir="ltr" type={show ? 'text' : 'password'} autoComplete="off" placeholder={placeholder}
            value={draft} onChange={(e) => setDraft(e.target.value.trim())}
          />
          <button
            type="button" className="muted absolute end-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center"
            aria-label={show ? L('Hide key', 'إخفاء المفتاح') : L('Show key', 'إظهار المفتاح')} onClick={() => setShow(!show)}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn-primary flex-1"
          disabled={!draft || draft === value}
          onClick={() => {
            onSave(draft);
            setEditing(false);
            setShow(false);
            toast(L('Key saved', 'حُفظ المفتاح'));
          }}
        >
          <Check size={18} /> {L('Save', 'حفظ')}
        </button>
        {value && (
          <>
            <button className="btn-soft" onClick={() => { setEditing(false); setDraft(''); setShow(false); }}>{L('Cancel', 'إلغاء')}</button>
            <button
              className="btn-ghost text-red-600"
              onClick={() => {
                onSave('');
                setDraft('');
                toast(L('Key removed', 'حُذف المفتاح'));
              }}
            >
              <Trash2 size={16} /> {L('Remove', 'حذف')}
            </button>
          </>
        )}
      </div>
      {getUrl && (
        <button className="btn-ghost w-full text-sm" onClick={() => openUrl(getUrl)}>
          <KeyRound size={16} /> {getLabel} <ExternalLink size={14} />
        </button>
      )}
    </div>
  );
}

/** Fingerprint: the app lock and fingerprint sign-in (Android app only). */
function Security() {
  const { L } = useLang();
  const toast = useToast();
  const [device, setDevice] = useStore('device', NONE);
  const [state, setState] = useState({ available: null, saved: false });
  useEffect(() => {
    Promise.all([biometricAvailable(), hasSavedLogin()]).then(([available, saved]) => setState({ available, saved }));
  }, []);
  if (state.available === null) return null;
  if (!state.available) {
    return (
      <p className="card muted text-sm">
        {L('Set up a fingerprint in the phone settings to lock the app and sign in with it.', 'سجّل بصمة في إعدادات الهاتف لتقفل بها التطبيق وتسجّل الدخول.')}
      </p>
    );
  }
  return (
    <div className="card divide-y divide-brand-900/10 !py-1 dark:divide-white/10">
      <Toggle
        label={L('Lock the app with my fingerprint', 'اقفل التطبيق ببصمتي')}
        hint={L('Asked when the app opens and after a minute away', 'تُطلب عند فتح التطبيق وبعد الابتعاد دقيقة')}
        checked={device.biometricLock === true}
        onChange={async (on) => {
          try {
            await verify(L('Confirm it is you', 'تأكيد أنك أنت'), L('Fingerprint', 'البصمة'));
            setDevice({ ...device, biometricLock: on });
          } catch {
            toast(L('Fingerprint not confirmed', 'لم تُؤكَّد البصمة'), 'error');
          }
        }}
      />
      <div className="flex min-h-[44px] items-center gap-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{L('Sign in with fingerprint', 'الدخول بالبصمة')}</span>
          <span className="muted block text-xs">
            {state.saved
              ? L('On. Your email sign-in is kept in the phone’s secure storage.', 'مفعّل. بيانات دخولك محفوظة في التخزين الآمن للهاتف.')
              : L('Turns on when you sign in with email and tick “Sign in with my fingerprint next time”.', 'يُفعَّل عند الدخول بالبريد مع اختيار «الدخول ببصمتي في المرة القادمة».')}
          </span>
        </span>
        {state.saved && (
          <button
            className="btn-soft !min-h-[36px] !px-3 text-sm"
            onClick={async () => {
              await forgetLogin();
              setState({ ...state, saved: false });
              toast(L('Fingerprint sign-in turned off', 'أُوقف الدخول بالبصمة'));
            }}
          >
            {L('Turn off', 'إيقاف')}
          </button>
        )}
      </div>
    </div>
  );
}

function AppUpdates() {
  const { L } = useLang();
  const u = useUpdates();
  if (!isNative) {
    return (
      <div className="card text-sm">
        {L(
          'The website updates itself: a new version is fetched in the background and used the next time you open it. For the phone app, install the APK; it then updates itself too.',
          'الموقع يحدّث نفسه: يُجلب الإصدار الجديد في الخلفية ويُستخدم عند فتحه مرة أخرى. لتطبيق الهاتف ثبّت ملف APK، وبعدها يحدّث نفسه أيضاً.',
        )}
        <button className="btn-soft mt-3 w-full" onClick={() => openUrl(APK_LATEST_URL)}>
          <Download size={18} /> {L('Download the Android app', 'نزّل تطبيق أندرويد')}
        </button>
      </div>
    );
  }
  return (
    <div className="card space-y-3">
      <UpdateBanner />
      <p className="text-sm">
        {L(
          'Most updates arrive over the air: the app downloads them in the background and uses them the next time it opens. When the phone part of the app changes, you are asked to install a new APK.',
          'تصل معظم التحديثات عبر الإنترنت: ينزّلها التطبيق في الخلفية ويستخدمها عند فتحه مرة أخرى. وعندما يتغير الجزء الخاص بالهاتف يُطلب منك تثبيت ملف APK جديد.',
        )}
      </p>
      <p className="muted tabular text-xs" dir="ltr" style={{ textAlign: 'start' }}>
        app {u.native?.version || '…'} (build {u.native?.build || '…'}) · web {u.bundle || '…'}
      </p>
      <button className="btn-primary w-full" disabled={u.checking} onClick={checkForUpdates}>
        <RefreshCw size={18} className={u.checking ? 'animate-spin' : ''} />
        {u.checking ? L('Checking…', 'جارٍ التحقق…') : u.downloading ? L('Downloading…', 'جارٍ التنزيل…') : L('Check for updates', 'تحقق من التحديثات')}
      </button>
      {!u.checking && u.upToDate && <p className="text-center text-sm">{L('You have the latest version.', 'لديك أحدث إصدار.')}</p>}
      {!u.checking && u.error && (
        <p className="muted text-center text-sm">
          {u.error === 'offline' ? L('No connection. Try again when online.', 'لا يوجد اتصال. حاول مجدداً عند الاتصال.') : L(`Could not check right now (${u.error}). Try again later.`, `تعذّر التحقق الآن (${u.error}). حاول لاحقاً.`)}
        </p>
      )}
      {!u.checking && u.needsApk && (
        <p className="rounded-xl bg-gold-100 p-3 text-sm dark:bg-gold-500/10">
          {L(
            'New features changed the phone part of the app, so updates over the air wait until you install the new APK once (Download above, then open the file). After that they arrive by themselves again.',
            'غيّرت الميزات الجديدة الجزء الخاص بالهاتف، لذلك تنتظر التحديثات عبر الإنترنت حتى تثبّت ملف APK الجديد مرة واحدة (تنزيل بالأعلى ثم افتح الملف). بعدها تصل تلقائياً من جديد.',
          )}
        </p>
      )}
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
                'AI recognises gym machines and food from photos, suggests meals, writes a training programme and tutors your English. It needs a Gemini key (free from Google) or a Groq key (free from Groq), or both: Groq then takes over when Gemini is busy or out of its daily allowance. Keys are kept on this device only.',
                'يتعرف الذكاء الاصطناعي على أجهزة النادي والطعام من الصور، ويقترح الوجبات، ويكتب برنامج التمرين، ويعلّمك الإنجليزية. يحتاج إلى مفتاح Gemini (مجاني من Google) أو مفتاح Groq (مجاني من Groq) أو كليهما، فيتولى Groq الطلبات حين يكون Gemini مشغولاً أو نفدت حصته اليومية. تُحفظ المفاتيح على هذا الجهاز فقط.',
              )}
            </p>
            <KeyField
              label={L('Gemini API key', 'مفتاح Gemini API')}
              placeholder="AIza…"
              value={device.geminiKey || ''}
              getUrl="https://aistudio.google.com/apikey"
              getLabel={L('Get a free key from Google AI Studio', 'احصل على مفتاح مجاني من Google AI Studio')}
              onSave={(geminiKey) => setDevice({ ...device, geminiKey })}
            />
            <KeyField
              label={L('Groq API key (backup)', 'مفتاح Groq API (احتياطي)')}
              placeholder="gsk_…"
              value={device.groqKey || ''}
              getUrl="https://console.groq.com/keys"
              getLabel={L('Get a free key from Groq', 'احصل على مفتاح مجاني من Groq')}
              onSave={(groqKey) => setDevice({ ...device, groqKey })}
            />
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

      {isNative && (
        <Section title={L('Security', 'الأمان')}>
          <Security />
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

      <Section title={L('App updates', 'تحديثات التطبيق')}>
        <AppUpdates />
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
