// Sign in and registration. Shown when the app opens without an account; the
// person can also carry on without one and sign in later from Settings.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { authMessage, canGoogle, resetPassword, signIn, signInGoogle, signUp, useAuth } from '../hooks/useAuth';
import { Field, Segmented, Spinner, useToast } from '../components/ui';
import { asset } from '../lib/native';

const NONE = {};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function SignIn() {
  const { L, lang, setLang } = useLang();
  const toast = useToast();
  const navigate = useNavigate();
  const { user, loading, cloudEnabled } = useAuth();
  const [device, setDevice] = useStore('device', NONE);
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!cloudEnabled) return <Navigate to="/" replace />;
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;

  const registering = mode === 'signup';
  const mismatch = registering && confirm && confirm !== password;
  const ready = email.trim() && password.length >= 6 && (!registering || (name.trim() && confirm === password));

  const run = async (fn, done) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      if (done) done(result);
    } catch (e) {
      setError(authMessage(e, L));
    } finally {
      setBusy(false);
    }
  };

  const finish = (u) => {
    if (!u) return; // a redirect is on its way
    setDevice({ ...device, authSkipped: false });
    toast(registering ? L('Account created. Welcome!', 'أُنشئ الحساب. أهلاً بك!') : L('Welcome back', 'مرحباً بعودتك'));
    navigate('/', { replace: true });
  };

  return (
    <div className="pt-safe mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10">
      <div className="flex justify-end pt-3">
        <button className="btn-ghost !min-h-[40px] !px-3 text-sm" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>
      <div className="mt-4 flex flex-col items-center text-center">
        <img src={asset('icon-192.png')} alt="" className="h-20 w-20 rounded-3xl shadow-lg" />
        <h1 className="mt-4 text-2xl font-extrabold">{L('The Disciplined', 'الملتزم')}</h1>
        <p className="muted mt-1 text-sm">
          {L('Your training, food, prayer, people and English, backed up and on all your devices.', 'تمرينك وغذاؤك وصلاتك وصلتك ولغتك، محفوظة احتياطياً وعلى كل أجهزتك.')}
        </p>
      </div>

      <div className="card mt-6 space-y-3">
        <Segmented
          value={mode}
          onChange={(m) => { setMode(m); setError(''); }}
          options={[
            { value: 'signin', label: L('Sign in', 'تسجيل الدخول') },
            { value: 'signup', label: L('Create account', 'حساب جديد') },
          ]}
        />
        {registering && (
          <Field label={L('Your name', 'اسمك')}>
            <input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label={L('Email', 'البريد الإلكتروني')}>
          <input className="input" dir="ltr" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={L('Password', 'كلمة المرور')} hint={registering ? L('At least 6 characters', '6 أحرف على الأقل') : undefined}>
          <div className="relative">
            <input
              className="input !pe-12" dir="ltr" type={show ? 'text' : 'password'}
              autoComplete={registering ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button" className="muted absolute end-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center"
              aria-label={show ? L('Hide password', 'إخفاء كلمة المرور') : L('Show password', 'إظهار كلمة المرور')}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        {registering && (
          <Field label={L('Password again', 'أعد كتابة كلمة المرور')}>
            <input className="input" dir="ltr" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        )}
        {mismatch && <p className="text-sm text-red-600">{L('The two passwords are different', 'كلمتا المرور مختلفتان')}</p>}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300" role="alert">{error}</p>}

        <button
          className="btn-primary w-full"
          disabled={busy || !ready}
          onClick={() => run(() => (registering ? signUp(email, password, name) : signIn(email, password)), finish)}
        >
          {registering ? <UserPlus size={18} /> : <LogIn size={18} />}
          {busy ? L('Please wait…', 'لحظة من فضلك…') : registering ? L('Create my account', 'أنشئ حسابي') : L('Sign in', 'تسجيل الدخول')}
        </button>

        {!registering && (
          <button
            className="btn-ghost w-full text-sm"
            disabled={busy}
            onClick={() => {
              if (!email.trim()) {
                setError(L('Type your email first, then press this again.', 'اكتب بريدك أولاً ثم اضغط هنا مجدداً.'));
                return;
              }
              run(() => resetPassword(email), () => toast(L('A reset link was sent to your email', 'أُرسل رابط إعادة التعيين إلى بريدك')));
            }}
          >
            {L('Forgot the password?', 'نسيت كلمة المرور؟')}
          </button>
        )}

        {canGoogle && (
          <>
            <div className="muted flex items-center gap-3 text-xs">
              <span className="h-px flex-1 bg-brand-900/10 dark:bg-white/10" />{L('or', 'أو')}<span className="h-px flex-1 bg-brand-900/10 dark:bg-white/10" />
            </div>
            <button className="btn-soft w-full" disabled={busy} onClick={() => run(signInGoogle, finish)}>
              <GoogleMark /> {L('Continue with Google', 'المتابعة بحساب Google')}
            </button>
          </>
        )}
      </div>

      <button
        className="btn-ghost mt-4 w-full text-sm"
        onClick={() => {
          setDevice({ ...device, authSkipped: true });
          navigate('/', { replace: true });
        }}
      >
        {L('Continue without an account', 'المتابعة بدون حساب')}
      </button>
      <p className="muted px-2 text-center text-xs">
        {L(
          'Without an account everything stays on this phone. You can sign in any time from Settings; what you recorded is kept and backed up then.',
          'بدون حساب يبقى كل شيء على هذا الهاتف. يمكنك تسجيل الدخول في أي وقت من الإعدادات، ويُحفظ ما سجّلته ويُنسخ احتياطياً حينها.',
        )}
      </p>
    </div>
  );
}
