// Adding food to a meal, four ways: from the list, from a photo, from a
// description in words, or by typing the numbers from a label.
import { useMemo, useState } from 'react';
import { Check, Minus, Plus, Search, Sparkles } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { FOODS, FOOD_CATEGORIES } from '../data/foods';
import { portion } from '../lib/nutrition';
import { uid } from '../lib/dates';
import { askAI, aiAvailable } from '../lib/ai';
import { foodPhotoPrompt, foodTextPrompt, readFoods } from '../lib/aiPrompts';
import { AiSetupNote, PhotoButton, useAiError } from './Ai';
import { Field, NumberInput, Segmented, Sheet } from './ui';
import { FromDatabase, MyMeals } from './FoodDatabase';

const EMPTY = [];

export function MacroLine({ item }) {
  const { L } = useLang();
  return (
    <span className="muted tabular text-sm">
      {L(
        `${Math.round(item.kcal)} kcal · P ${item.protein} · C ${item.carbs} · F ${item.fat}`,
        `${Math.round(item.kcal)} سعرة · بروتين ${item.protein} · كربوهيدرات ${item.carbs} · دهون ${item.fat}`,
      )}
    </span>
  );
}

function FromList({ onAdd }) {
  const { L, pick } = useLang();
  const [custom] = useStore('foodCustom', EMPTY);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [chosen, setChosen] = useState(null);
  const [grams, setGrams] = useState(100);

  const all = useMemo(() => [...custom.map((f) => ({ ...f, category: 'custom' })), ...FOODS], [custom]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((f) => {
      const name = typeof f.name === 'string' ? f.name : `${f.name.en} ${f.name.ar}`;
      return (category === 'all' || f.category === category) && (!q || name.toLowerCase().includes(q));
    });
  }, [all, query, category]);

  if (chosen) {
    const p = portion(chosen, grams);
    const serving = chosen.serving || 100;
    return (
      <div className="space-y-3">
        <div className="card">
          <p className="text-lg font-extrabold">{pick(chosen.name)}</p>
          <p className="muted text-sm">
            {L(`${pick(chosen.servingLabel) || '1 serving'} = ${serving} g`, `${pick(chosen.servingLabel) || 'حصة'} = ${serving} جم`)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button className="btn-soft !px-3" aria-label={L('Less', 'أقل')} onClick={() => setGrams(Math.max(0, Math.round(grams - serving / 2)))}>
              <Minus size={18} />
            </button>
            <NumberInput className="text-center text-lg font-bold" value={grams} onChange={(v) => setGrams(Number(v) || 0)} aria-label={L('Grams', 'الجرامات')} />
            <span className="muted">{L('g', 'جم')}</span>
            <button className="btn-soft !px-3" aria-label={L('More', 'أكثر')} onClick={() => setGrams(Math.round(grams + serving / 2))}>
              <Plus size={18} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              [p.kcal, L('kcal', 'سعرة')], [p.protein, L('protein', 'بروتين')], [p.carbs, L('carbs', 'كربوهيدرات')],
              [p.fat, L('fat', 'دهون')], [p.sugar, L('sugar', 'سكر')], [p.fiber, L('fibre', 'ألياف')],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-brand-50 py-2 dark:bg-white/5">
                <p className="tabular font-extrabold">{value}</p>
                <p className="muted text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft flex-1" onClick={() => setChosen(null)}>{L('Back', 'رجوع')}</button>
          <button
            className="btn-primary flex-[2]"
            disabled={!grams}
            onClick={() => {
              onAdd([{ name: chosen.name, foodId: chosen.id, ...p, source: 'list' }]);
              setChosen(null);
            }}
          >
            <Check size={18} /> {L('Add', 'إضافة')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="relative block">
        <Search size={18} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
        <input className="input !ps-10" placeholder={L('Search food', 'ابحث عن طعام')} value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <Segmented
        value={category}
        onChange={setCategory}
        options={[
          { value: 'all', label: L('All', 'الكل') },
          ...Object.entries(FOOD_CATEGORIES)
            .filter(([id]) => id !== 'custom' || custom.length)
            .map(([id, name]) => ({ value: id, label: pick(name) })),
        ]}
      />
      <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
        {list.slice(0, 60).map((f) => (
          <button
            key={f.id}
            className="flex w-full items-center justify-between gap-3 py-3 text-start"
            onClick={() => {
              setChosen(f);
              setGrams(f.serving || 100);
            }}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{pick(f.name)}</span>
              <span className="muted block text-xs">{pick(f.servingLabel)} · {f.serving || 100} {L('g', 'جم')}</span>
            </span>
            <span className="muted tabular shrink-0 text-sm">
              {portion(f, f.serving || 100).kcal} {L('kcal', 'سعرة')}
            </span>
          </button>
        ))}
        {!list.length && <p className="muted py-6 text-center text-sm">{L('Not in the list. Try “Describe” or “Label”.', 'غير موجود في القائمة. جرّب «وصف» أو «ملصق».')}</p>}
      </div>
    </div>
  );
}

function FromAi({ mode, onAdd }) {
  const { L, lang } = useLang();
  const aiError = useAiError();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [off, setOff] = useState({});
  const [preview, setPreview] = useState('');

  const run = async (request, source) => {
    if (!aiAvailable()) {
      aiError({ code: 'ai-setup' });
      return;
    }
    setBusy(true);
    setResult(null);
    setOff({});
    try {
      const answer = readFoods(await askAI({ ...request, json: true }));
      setResult({ ...answer, source });
    } catch (error) {
      aiError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {!aiAvailable() && <AiSetupNote />}
      {mode === 'photo' ? (
        <>
          <p className="text-sm">
            {L(
              'Take a photo of your plate. The AI lists what it sees with an estimate of the amounts; you can correct the grams before adding.',
              'التقط صورة لطبقك. يسرد الذكاء الاصطناعي ما يراه مع تقدير للكميات، ويمكنك تصحيح الجرامات قبل الإضافة.',
            )}
          </p>
          <input className="input" placeholder={L('Optional note, e.g. “cooked with ghee”', 'ملاحظة اختيارية، مثل «مطبوخ بالسمن»')} value={text} onChange={(e) => setText(e.target.value)} />
          {preview && <img src={preview} alt="" className="max-h-56 w-full rounded-2xl object-cover" />}
          <PhotoButton
            className="btn-primary w-full"
            busy={busy}
            onPhoto={(photo) => {
              setPreview(photo.dataUrl);
              return run({ ...foodPhotoPrompt(lang, text.trim()), image: photo }, 'photo');
            }}
          >
            {busy ? L('Looking at your plate…', 'جارٍ تحليل طبقك…') : preview ? L('Take another photo', 'التقط صورة أخرى') : L('Take a photo', 'التقط صورة')}
          </PhotoButton>
        </>
      ) : (
        <>
          <textarea
            className="input min-h-[96px]"
            placeholder={L('e.g. two eggs, a loaf of bread, ful with oil, tea with two sugars', 'مثال: بيضتان، رغيف خبز، فول بالزيت، شاي بملعقتي سكر')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary w-full" disabled={busy || !text.trim()} onClick={() => run(foodTextPrompt(text.trim(), lang), 'text')}>
            <Sparkles size={18} /> {busy ? L('Working it out…', 'جارٍ الحساب…') : L('Work out the nutrients', 'احسب القيم الغذائية')}
          </button>
        </>
      )}

      {result && (
        result.items.length ? (
          <>
            <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
              {result.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-brand-700"
                    checked={!off[i]}
                    onChange={() => setOff({ ...off, [i]: !off[i] })}
                    aria-label={item.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <MacroLine item={item} />
                  </div>
                  <label className="flex shrink-0 items-center gap-1">
                    <NumberInput
                      className="!min-h-[40px] w-20 text-center"
                      value={item.grams}
                      aria-label={L('Grams', 'الجرامات')}
                      onChange={(v) => {
                        // Changing the grams rescales every nutrient of the item.
                        const grams = Number(v) || 0;
                        const f = item.grams ? grams / item.grams : 1;
                        const scaled = { ...item, grams };
                        for (const k of ['kcal', 'protein', 'carbs', 'fat', 'sugar', 'fiber']) {
                          scaled[k] = k === 'kcal' ? Math.round(item[k] * f) : Math.round(item[k] * f * 10) / 10;
                        }
                        if (grams) setResult({ ...result, items: result.items.map((x, j) => (j === i ? scaled : x)) });
                      }}
                    />
                    <span className="muted text-sm">{L('g', 'جم')}</span>
                  </label>
                </div>
              ))}
            </div>
            {result.note && <p className="muted text-sm">{result.note}</p>}
            <p className="muted text-xs">{L('AI estimates can be off; adjust the grams if you know better.', 'تقديرات الذكاء الاصطناعي قد تخطئ، عدّل الجرامات إن كنت أدرى.')}</p>
            <button
              className="btn-primary w-full"
              onClick={() => {
                onAdd(result.items.filter((_, i) => !off[i]).map((item) => ({ ...item, source: result.source })));
                setResult(null);
                setText('');
                setPreview('');
              }}
            >
              <Check size={18} /> {L('Add selected', 'إضافة المحدد')}
            </button>
          </>
        ) : (
          <p className="card muted text-center text-sm">{L('No food was recognised. Try again or describe it in words.', 'لم يُتعرَّف على طعام. حاول مجدداً أو صِفه بالكلمات.')}</p>
        )
      )}
    </div>
  );
}

function FromLabel({ onAdd }) {
  const { L } = useLang();
  const [custom, setCustom] = useStore('foodCustom', EMPTY);
  const [form, setForm] = useState({ name: '', serving: 100 });
  const [keep, setKeep] = useState(true);
  const set = (patch) => setForm({ ...form, ...patch });
  const fields = [
    ['kcal', L('Calories', 'السعرات')], ['protein', L('Protein, g', 'بروتين، جم')], ['carbs', L('Carbs, g', 'كربوهيدرات، جم')],
    ['fat', L('Fat, g', 'دهون، جم')], ['sugar', L('Sugar, g', 'سكر، جم')], ['fiber', L('Fibre, g', 'ألياف، جم')],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm">{L('Type the values from the packet, per 100 g.', 'اكتب القيم من ملصق العبوة، لكل 100 جم.')}</p>
      <Field label={L('Food name', 'اسم الطعام')}>
        <input className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            <NumberInput value={form[key] ?? ''} onChange={(v) => set({ [key]: v })} />
          </Field>
        ))}
      </div>
      <Field label={L('How much did you eat, g', 'الكمية التي أكلتها، جم')}>
        <NumberInput value={form.serving} onChange={(v) => set({ serving: v })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={keep} onChange={() => setKeep(!keep)} />
        {L('Keep it in “My foods” for next time', 'احفظه في «أطعمتي» للمرة القادمة')}
      </label>
      <button
        className="btn-primary w-full"
        disabled={!form.name.trim() || !Number(form.kcal) || !Number(form.serving)}
        onClick={() => {
          const food = {
            id: `my:${uid()}`, name: form.name.trim(), serving: Number(form.serving), servingLabel: '',
            ...Object.fromEntries(fields.map(([k]) => [k, Number(form[k]) || 0])),
          };
          if (keep) setCustom([food, ...custom]);
          onAdd([{ name: food.name, foodId: food.id, ...portion(food, food.serving), source: 'label' }]);
          setForm({ name: '', serving: 100 });
        }}
      >
        <Check size={18} /> {L('Add', 'إضافة')}
      </button>
    </div>
  );
}

export default function AddFood({ open, onClose, onAdd, title }) {
  const { L } = useLang();
  const [tab, setTab] = useState('list');
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'list', label: L('Quick list', 'القائمة السريعة'), icon: '📋' },
          { value: 'db', label: L('Database', 'قاعدة الأغذية'), icon: '🔎' },
          { value: 'meals', label: L('My meals', 'وجباتي'), icon: '🍱' },
          { value: 'photo', label: L('Photo', 'صورة'), icon: '📷' },
          { value: 'text', label: L('Describe', 'وصف'), icon: '✍️' },
          { value: 'label', label: L('Label', 'ملصق'), icon: '🏷️' },
        ]}
      />
      {tab === 'list' && <FromList onAdd={onAdd} />}
      {tab === 'db' && <FromDatabase onAdd={onAdd} />}
      {tab === 'meals' && <MyMeals onAdd={onAdd} />}
      {tab === 'photo' && <FromAi key="photo" mode="photo" onAdd={onAdd} />}
      {tab === 'text' && <FromAi key="text" mode="text" onAdd={onAdd} />}
      {tab === 'label' && <FromLabel onAdd={onAdd} />}
    </Sheet>
  );
}
