// Editing a logged food, matching it to the nutrition table, and the live
// camera for meal photos.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Database, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { MEALS } from '../data/foods';
import { logEntry, searchFoods } from '../lib/foodDb';
import { nameText, remember, rescale } from '../lib/foodHistory';
import { NumberInput, Segmented, Sheet, useConfirm } from './ui';
import { MacroLine } from './AddFood';
import { useFoodDb } from './FoodDatabase';

const NONE = {};

/** Nutrition-table foods for a name; tap one to use its values. */
export function TableMatch({ name, grams, onPick, current }) {
  const { L, pick } = useLang();
  const { db, error } = useFoodDb();
  const [query, setQuery] = useState(name || '');
  const hits = useMemo(() => (db && query.trim() ? searchFoods(db, query, { limit: 6 }) : []), [db, query]);
  return (
    <div className="space-y-2">
      <label className="relative block">
        <Search size={18} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
        <input className="input !ps-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Search the nutrition table', 'ابحث في جدول التغذية')} />
      </label>
      {!db && !error && <p className="muted text-sm">{L('Loading the nutrition table…', 'جارٍ تحميل جدول التغذية…')}</p>}
      {error && <p className="text-sm text-red-600">{L('The nutrition table could not load. Check the connection.', 'تعذر تحميل جدول التغذية. تحقق من الاتصال.')}</p>}
      {db && query.trim() && !hits.length && <p className="muted text-sm">{L('No match. Try a simpler English or Arabic name.', 'لا يوجد تطابق. جرّب اسماً أبسط بالعربية أو الإنجليزية.')}</p>}
      <div className="divide-y divide-brand-900/10 dark:divide-white/10">
        {hits.map((food) => {
          const e = logEntry(food, grams || 100);
          return (
            <button key={food.id} className="flex w-full items-center gap-2 py-2.5 text-start" onClick={() => onPick(food)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{pick(food.name)}</span>
                <MacroLine item={e} />
              </span>
              {current === food.id ? <Check size={18} className="shrink-0 text-brand-700" /> : <Database size={16} className="muted shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Change the grams, the meal or the food of a logged item, or delete it. */
export function EditEntry({ entry, onSave, onDelete, onClose }) {
  const { L, pick } = useLang();
  const confirm = useConfirm();
  const [memory, setMemory] = useStore('foodMemory', NONE);
  const [draft, setDraft] = useState(entry);
  const [matching, setMatching] = useState(false);
  useEffect(() => {
    setDraft(entry);
    setMatching(false);
  }, [entry]);
  if (!entry || !draft) return null;
  const fromTable = String(draft.foodId || '').startsWith('usda:');
  return (
    <Sheet
      open
      onClose={onClose}
      title={L('Edit food', 'تعديل الطعام')}
      footer={
        <div className="flex gap-2 pb-3">
          <button
            className="btn-soft !px-3 text-red-600"
            aria-label={L('Delete', 'حذف')}
            onClick={async () => {
              if (await confirm({ title: L(`Delete ${pick(entry.name)}?`, `حذف ${pick(entry.name)}؟`), body: L('It comes off this meal and today’s totals.', 'سيُحذف من هذه الوجبة ومن مجموع اليوم.') })) onDelete(entry);
            }}
          >
            <Trash2 size={18} />
          </button>
          <button className="btn-primary flex-1" disabled={!(Number(draft.grams) > 0)} onClick={() => onSave(draft)}>
            <Check size={18} /> {L('Save changes', 'حفظ التعديلات')}
          </button>
        </div>
      }
    >
      <div className="card space-y-3">
        <p className="text-lg font-extrabold leading-snug">{pick(draft.name)}</p>
        <MacroLine item={draft} />
        <label className="flex items-center gap-2">
          <span className="text-sm font-bold">{L('Amount', 'الكمية')}</span>
          <NumberInput
            className="w-28 text-center text-lg font-bold"
            value={draft.grams}
            aria-label={L('Grams', 'الجرامات')}
            onChange={(v) => Number(v) > 0 && setDraft(rescale(draft, Number(v)))}
          />
          <span className="muted">{L('g', 'جم')}</span>
        </label>
        {draft.meal && (
          <Segmented
            value={draft.meal}
            onChange={(meal) => setDraft({ ...draft, meal })}
            options={MEALS.map((m) => ({ value: m.id, label: pick(m.name), icon: m.icon }))}
          />
        )}
        <p className="muted text-xs">
          {fromTable
            ? L('Values from the nutrition table (USDA), with vitamins and minerals.', 'القيم من جدول التغذية (USDA) مع الفيتامينات والمعادن.')
            : L('Values are an estimate. Match it to the nutrition table for exact numbers and vitamins.', 'القيم تقديرية. طابقه مع جدول التغذية للأرقام الدقيقة والفيتامينات.')}
        </p>
      </div>
      {matching ? (
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">{L('Nutrition table', 'جدول التغذية')}</p>
            <button className="btn-ghost !min-h-[36px] !px-2" aria-label={L('Close', 'إغلاق')} onClick={() => setMatching(false)}><X size={18} /></button>
          </div>
          <TableMatch
            name={nameText(entry.aiName || entry.name)}
            grams={draft.grams}
            current={draft.foodId}
            onPick={(food) => {
              setMemory(remember(memory, entry.aiName || entry.name, food, draft.grams));
              setDraft({ ...logEntry(food, draft.grams), id: draft.id, meal: draft.meal, aiName: entry.aiName || (fromTable ? undefined : nameText(entry.name)) });
              setMatching(false);
            }}
          />
        </div>
      ) : (
        <button className="btn-soft w-full" onClick={() => setMatching(true)}>
          <RefreshCw size={16} /> {fromTable ? L('Change the table food', 'غيّر صنف الجدول') : L('Update from the nutrition table', 'حدّث من جدول التغذية')}
        </button>
      )}
    </Sheet>
  );
}

/** A live camera view inside the app; the shutter hands back a small JPEG. */
export function LiveCamera({ onCapture, onClose }) {
  const { L } = useLang();
  const video = useRef();
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let stream;
    let live = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (!live) return;
        video.current.srcObject = stream;
        await video.current.play();
        setReady(true);
      } catch (e) {
        if (live) {
          setError(
            e?.name === 'NotAllowedError'
              ? L('Camera permission was refused. Allow it in the phone settings, or use “From gallery”.', 'رُفض إذن الكاميرا. اسمح به من إعدادات الهاتف أو استخدم «من المعرض».')
              : L('The live camera is not available here. Use “Take a photo” instead.', 'الكاميرا المباشرة غير متاحة هنا. استخدم «التقط صورة» بدلاً منها.'),
          );
        }
      }
    })();
    return () => {
      live = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shoot = () => {
    const v = video.current;
    const max = 1024;
    const scale = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    onCapture({ dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} playsInline muted className="aspect-[4/3] w-full object-cover" />
        {!ready && !error && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">{L('Opening the camera…', 'جارٍ فتح الكاميرا…')}</p>}
        {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button className="btn-soft flex-1" onClick={onClose}>{L('Cancel', 'إلغاء')}</button>
        <button className="btn-primary flex-[2]" disabled={!ready} onClick={shoot}>
          <Camera size={18} /> {L('Capture my meal', 'التقط وجبتي')}
        </button>
      </div>
    </div>
  );
}
