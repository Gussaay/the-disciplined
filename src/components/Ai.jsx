// Shared AI pieces: the camera button and the message shown when AI is not
// set up yet.
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Sparkles } from 'lucide-react';
import { useLang } from '../i18n';
import { shrinkImage } from '../lib/image';
import { useToast } from './ui';

/** Turns any AI failure into words for the person. */
export function useAiError() {
  const { L } = useLang();
  const toast = useToast();
  return (error) => {
    if (error?.code === 'ai-setup') {
      toast(L('Turn on AI in Settings first', 'فعّل الذكاء الاصطناعي من الإعدادات أولاً'), 'error');
    } else if (error?.code === 'functions/resource-exhausted') {
      toast(L('Today’s AI allowance is used up', 'انتهى رصيد الذكاء الاصطناعي لليوم'), 'error');
    } else {
      toast(error?.message || L('The AI could not answer', 'تعذر على الذكاء الاصطناعي الإجابة'), 'error');
    }
  };
}

/** Opens the camera (or the gallery) and hands back a small JPEG. */
export function PhotoButton({ onPhoto, children, className = 'btn-soft', busy, gallery = false, icon }) {
  const input = useRef();
  const [working, setWorking] = useState(false);
  const { L } = useLang();
  const toast = useToast();
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture={gallery ? undefined : 'environment'}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setWorking(true);
          try {
            await onPhoto(await shrinkImage(file));
          } catch (error) {
            toast(error?.message || L('Could not read the picture', 'تعذرت قراءة الصورة'), 'error');
          } finally {
            setWorking(false);
          }
        }}
      />
      <button className={className} disabled={working || busy} onClick={() => input.current?.click()}>
        {working || busy ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon || <Camera size={18} />
        )}
        {children}
      </button>
    </>
  );
}

export function AiSetupNote() {
  const { L } = useLang();
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gold-400/50 bg-gold-100/60 p-3 text-sm dark:border-gold-500/30 dark:bg-gold-500/10">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-300" />
      <p>
        {L(
          'Photo recognition and AI suggestions need a free Gemini or Groq key. Everything else works without it.',
          'التعرف على الصور واقتراحات الذكاء الاصطناعي تحتاج إلى مفتاح Gemini أو Groq مجاني. كل ما عداها يعمل بدونه.',
        )}{' '}
        <Link to="/settings#ai" className="font-bold underline">
          {L('Set it up', 'إعداده')}
        </Link>
      </p>
    </div>
  );
}
