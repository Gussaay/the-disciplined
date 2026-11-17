// Adding food to a meal, four ways: from the list, from a photo, from a
// description in words, or by typing the numbers from a label.
import { useEffect, useMemo, useState } from 'react';
import { Check, Database, History, ImageIcon, Minus, Plus, Search, Sparkles, Video } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { FOODS, FOOD_CATEGORIES } from '../data/foods';
import { portion, totals } from '../lib/nutrition';
import { dayKey, fromKey, uid } from '../lib/dates';
import { logEntry, searchFoods } from '../lib/foodDb';
import { foodKey, historySuggestions, knownNames, lastMeal, remember, rescale, tableMatch } from '../lib/foodHistory';
import { LiveCamera, TableMatch } from './FoodTools';
import { askAI, aiAvailable } from '../lib/ai';
import { foodPhotoPrompt, foodTextPrompt, readFoods } from '../lib/aiPrompts';
import { AiSetupNote, PhotoButton, useAiError } from './Ai';
import { Field, NumberInput, Segmented, Sheet } from './ui';
import { FromDatabase, MyMeals, useFoodDb } from './FoodDatabase';

const EMPTY = [];
const NONE = {};

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

/** What the person usually eats at this meal, one tap each. */
function ForYou({ meal, onAdd, current }) {
  const { L, pick, date } = useLang();
  const [log] = useStore('foodLog', NONE);
  const [added, setAdded] = useState({});
  const today = dayKey();
  const list = useMemo(() => historySuggestions(log, meal, { today, skip: current }), [log, meal, today, current]);
  const last = useMemo(() => lastMeal(log, meal, today), [log, meal, today]);
  if (!list.length && !last) {
    return (
      <p className="card muted text-center text-sm">
        {L(
          'Nothing to suggest yet. As you log food, the things you eat most at this meal show up here for one-tap adding.',
          'لا توجد اقتراحات بعد. كلما سجّلت طعامك ستظهر هنا الأصناف التي تأكلها كثيراً في هذه الوجبة لإضافتها بضغطة.',
        )}
      </p>
    );
  }
  const clean = (e, source) => {
    const { id, meal: _m, ...rest } = e;
    return { ...rest, source };
  };
  const lastSum = last ? totals(last.items) : null;
  return (
    <div className="space-y-3">
      {last && (
        <div className="card space-y-2">
          <div className="flex items-center gap-2">
            <History size={18} className="shrink-0" style={{ color: 'var(--accent, #1D6059)' }} />
            <p className="min-w-0 flex-1 font-bold">
              {L('Same as last time', 'مثل آخر مرة')}
              <span className="muted text-sm font-normal"> · {date(fromKey(last.day), { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </p>
          </div>
          <p className="text-sm">{last.items.map((i) => `${pick(i.name)} ${Math.round(i.grams)} ${L('g', 'جم')}`).join(L(', ', '، '))}</p>
          <MacroLine item={lastSum} />
          <button className="btn-soft w-full" disabled={added.__last} onClick={() => { onAdd(last.items.map((e) => clean(e, 'history'))); setAdded({ ...added, __last: true }); }}>
            {added.__last ? <Check size={16} /> : <Plus size={16} />} {added.__last ? L('Added', 'أضيفت') : L('Add all of it', 'أضفها كلها')}
          </button>
        </div>
      )}
      {list.length > 0 && (
        <>
          <p className="eyebrow px-1">{L('You often have', 'تتناول عادةً')}</p>
          <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
            {list.map(({ entry, times }) => {
              const key = foodKey(entry);
              return (
                <div key={key} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {pick(entry.name)} <span className="muted tabular text-sm font-normal">· {Math.round(entry.grams)} {L('g', 'جم')}</span>
                    </p>
                    <span className="muted text-xs">{L(`${times}× in your log`, `${times} مرات في سجلك`)} · </span>
                    <MacroLine item={entry} />
                  </div>
                  <button
                    className={`${added[key] ? 'btn-soft' : 'btn-primary'} !min-h-[40px] !px-3`}
                    aria-label={L('Add', 'إضافة')}
                    disabled={added[key]}
                    onClick={() => { onAdd([clean(entry, 'history')]); setAdded({ ...added, [key]: true }); }}
                  >
                    {added[key] ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="muted px-1 text-xs">{L('From your last weeks of logging, with the amount you usually take. Tap a food on the main screen later to change it.', 'من سجلك في الأسابيع الماضية بالكمية المعتادة. اضغط على أي صنف في الشاشة الرئيسية لتعديله لاحقاً.')}</p>
        </>
      )}
    </div>
  );
}

function FromAi({ mode, onAdd }) {
  const { L, pick, lang } = useLang();
  const aiError = useAiError();
  const [log] = useStore('foodLog', NONE);
  const [memory, setMemory] = useStore('foodMemory', NONE);
  const { db } = useFoodDb();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [off, setOff] = useState({});
  const [table, setTable] = useState({});
  const [picking, setPicking] = useState(null);
  const [preview, setPreview] = useState('');
  const [live, setLive] = useState(false);
  const known = useMemo(() => knownNames(log, memory), [log, memory]);

  // Each recognised food is linked to the nutrition table: the food it was
  // linked to before (saved memory), else the closest table name.
  useEffect(() => {
    if (!result || !db) return;
    const next = {};
    result.items.forEach((item, i) => {
      const m = tableMatch(db, item, memory, searchFoods);
      if (m) next[i] = { food: m.food, remembered: m.remembered };
    });
    setTable(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.at, db]);

  const run = async (request, source) => {
    if (!aiAvailable()) {
      aiError({ code: 'ai-setup' });
      return;
    }
    setBusy(true);
    setResult(null);
    setOff({});
    setTable({});
    setPicking(null);
    try {
      const answer = readFoods(await askAI({ ...request, json: true }));
      setResult({ ...answer, source, at: Date.now() });
    } catch (error) {
      aiError(error);
    } finally {
      setBusy(false);
    }
  };
  const fromPhoto = (photo) => {
    setLive(false);
    setPreview(photo.dataUrl);
    return run({ ...foodPhotoPrompt(lang, text.trim(), known), image: photo }, 'photo');
  };

  const finalItem = (item, i) => {
    const t = table[i];
    if (!t) return { ...item, source: result.source };
    return { ...logEntry(t.food, item.grams || 100), aiName: item.name, source: result.source };
  };

  return (
    <div className="space-y-3">
      {!aiAvailable() && <AiSetupNote />}
      {mode === 'photo' ? (
        <>
          <p className="text-sm">
            {L(
              'Photograph your plate. The AI lists what it sees with the amounts, then each food is matched to the nutrition table and to the foods you logged before. Correct anything before adding.',
              'صوّر طبقك. يسرد الذكاء الاصطناعي ما يراه بالكميات، ثم يُطابَق كل صنف مع جدول التغذية ومع الأطعمة التي سجلتها من قبل. صحّح أي شيء قبل الإضافة.',
            )}
          </p>
          <input className="input" placeholder={L('Optional note, e.g. “cooked with ghee”', 'ملاحظة اختيارية، مثل «مطبوخ بالسمن»')} value={text} onChange={(e) => setText(e.target.value)} />
          {live ? (
            <LiveCamera onCapture={fromPhoto} onClose={() => setLive(false)} />
          ) : (
            <>
              {preview && <img src={preview} alt="" className="max-h-56 w-full rounded-2xl object-cover" />}
              <button className="btn-primary w-full" disabled={busy} onClick={() => setLive(true)}>
                {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Video size={18} />}
                {busy ? L('Looking at your plate…', 'جارٍ تحليل طبقك…') : L('Live camera', 'الكاميرا المباشرة')}
              </button>
              <div className="flex gap-2">
                <PhotoButton className="btn-soft flex-1" busy={busy} onPhoto={fromPhoto}>{L('Take a photo', 'التقط صورة')}</PhotoButton>
                <PhotoButton className="btn-soft flex-1" busy={busy} gallery icon={<ImageIcon size={18} />} onPhoto={fromPhoto}>{L('From gallery', 'من المعرض')}</PhotoButton>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <textarea
            className="input min-h-[96px]"
            placeholder={L('e.g. two eggs, a loaf of bread, ful with oil, tea with two sugars', 'مثال: بيضتان، رغيف خبز، فول بالزيت، شاي بملعقتي سكر')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary w-full" disabled={busy || !text.trim()} onClick={() => run(foodTextPrompt(text.trim(), lang, known), 'text')}>
            <Sparkles size={18} /> {busy ? L('Working it out…', 'جارٍ الحساب…') : L('Work out the nutrients', 'احسب القيم الغذائية')}
          </button>
        </>
      )}

      {result && (
        result.items.length ? (
          <>
            <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
              {result.items.map((item, i) => {
                const t = table[i];
                const shown = finalItem(item, i);
                return (
                  <div key={i} className="space-y-2 py-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-brand-700"
                        checked={!off[i]}
                        onChange={() => setOff({ ...off, [i]: !off[i] })}
                        aria-label={item.name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <MacroLine item={shown} />
                      </div>
                      <label className="flex shrink-0 items-center gap-1">
                        <NumberInput
                          className="!min-h-[40px] w-20 text-center"
                          value={item.grams}
                          aria-label={L('Grams', 'الجرامات')}
                          onChange={(v) => {
                            const grams = Number(v) || 0;
                            if (grams) setResult({ ...result, items: result.items.map((x, j) => (j === i ? rescale(item, grams) : x)) });
                          }}
                        />
                        <span className="muted text-sm">{L('g', 'جم')}</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 ps-8 text-xs">
                      {t ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 font-bold text-brand-800 dark:bg-white/10 dark:text-brand-100">
                            <Database size={12} /> {t.remembered ? L('Your saved match', 'مطابقتك المحفوظة') : L('Nutrition table', 'جدول التغذية')}: {pick(t.food.name)}
                          </span>
                          <button className="font-bold underline" onClick={() => setPicking(picking === i ? null : i)}>{L('Change', 'تغيير')}</button>
                          <button className="muted underline" onClick={() => setTable({ ...table, [i]: null })}>{L('Use AI estimate', 'استخدم تقدير الذكاء')}</button>
                        </>
                      ) : (
                        <button className="font-bold underline" onClick={() => setPicking(picking === i ? null : i)}>
                          {L('AI estimate · match to the nutrition table', 'تقدير الذكاء · طابقه مع جدول التغذية')}
                        </button>
                      )}
                    </div>
                    {picking === i && (
                      <div className="ms-8 rounded-2xl bg-brand-50/60 p-3 dark:bg-white/5">
                        <TableMatch
                          name={item.search || item.name}
                          grams={item.grams}
                          current={t?.food.id}
                          onPick={(food) => {
                            setTable({ ...table, [i]: { food, remembered: true } });
                            setMemory(remember(memory, item.name, food, item.grams));
                            setPicking(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {result.note && <p className="muted text-sm">{result.note}</p>}
            <p className="muted text-xs">
              {L(
                'Amounts are the AI’s estimate; adjust the grams if you know better. Foods matched to the nutrition table use its exact values, vitamins and minerals included, and your matches are remembered for next time.',
                'الكميات تقدير من الذكاء الاصطناعي، عدّل الجرامات إن كنت أدرى. الأصناف المطابقة لجدول التغذية تأخذ قيمه الدقيقة بما فيها الفيتامينات والمعادن، وتُحفظ مطابقاتك للمرة القادمة.',
              )}
            </p>
            <button
              className="btn-primary w-full"
              onClick={() => {
                let mem = memory;
                result.items.forEach((item, i) => {
                  if (!off[i] && table[i]) mem = remember(mem, item.name, table[i].food, item.grams);
                });
                if (mem !== memory) setMemory(mem);
                onAdd(result.items.map(finalItem).filter((_, i) => !off[i]));
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

export default function AddFood({ open, onClose, onAdd, title, meal, current }) {
  const { L } = useLang();
  const [log] = useStore('foodLog', NONE);
  const hasHistory = Object.keys(log).some((k) => (log[k] || []).length);
  const [tab, setTab] = useState(null);
  const shown = tab || (hasHistory && meal ? 'you' : 'list');
  useEffect(() => {
    if (!open) setTab(null);
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <Segmented
        value={shown}
        onChange={setTab}
        options={[
          ...(meal ? [{ value: 'you', label: L('For you', 'لك'), icon: '⭐' }] : []),
          { value: 'photo', label: L('Photo', 'صورة'), icon: '📷' },
          { value: 'list', label: L('Quick list', 'القائمة السريعة'), icon: '📋' },
          { value: 'db', label: L('Database', 'قاعدة الأغذية'), icon: '🔎' },
          { value: 'meals', label: L('My meals', 'وجباتي'), icon: '🍱' },
          { value: 'text', label: L('Describe', 'وصف'), icon: '✍️' },
          { value: 'label', label: L('Label', 'ملصق'), icon: '🏷️' },
        ]}
      />
      {shown === 'you' && <ForYou meal={meal} onAdd={onAdd} current={current || EMPTY} />}
      {shown === 'list' && <FromList onAdd={onAdd} />}
      {shown === 'db' && <FromDatabase onAdd={onAdd} />}
      {shown === 'meals' && <MyMeals onAdd={onAdd} />}
      {shown === 'photo' && <FromAi key="photo" mode="photo" onAdd={onAdd} />}
      {shown === 'text' && <FromAi key="text" mode="text" onAdd={onAdd} />}
      {shown === 'label' && <FromLabel onAdd={onAdd} />}
    </Sheet>
  );
}
