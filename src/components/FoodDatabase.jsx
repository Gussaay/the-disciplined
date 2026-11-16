// The nutrition database: browse by food group or search in Arabic or
// English, see every nutrient of a food, choose the grams (or a source
// portion, always shown with its grams) and add it. Also "My meals": several
// items saved together and logged in one tap.
import { useEffect, useMemo, useState } from 'react';
import { Check, Database, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import {
  DAILY_VALUE, NUTRIENT_NAMES, UNIT_NAMES, loadFoodDb, logEntry, mealTotals, nutrientsFor, searchFoods,
} from '../lib/foodDb';
import { uid } from '../lib/dates';
import { Field, NumberInput, Spinner } from './ui';

const EMPTY = [];

const PREP = {
  raw: ['raw', 'نيء'], hard_boiled: ['hard-boiled', 'مسلوق جامد'], fried: ['fried', 'مقلي'], omelet: ['omelette', 'أومليت'],
  poached: ['poached', 'مسلوق دون قشر'], scrambled: ['scrambled', 'مخفوق'], canned_oil_drained: ['canned in oil, drained', 'معلب بالزيت، مصفى'],
  canned_water_drained: ['canned in water, drained', 'معلب بالماء، مصفى'], cooked: ['cooked', 'مطبوخ'], boiled: ['boiled', 'مسلوق'],
  roasted: ['roasted', 'محمص'], as_listed: ['as named', 'كما في الاسم'],
};

/** Loads the database once and shares it. */
export function useFoodDb() {
  const [state, setState] = useState({ db: null, error: null });
  useEffect(() => {
    let live = true;
    loadFoodDb().then((db) => live && setState({ db, error: null }), (error) => live && setState({ db: null, error }));
    return () => { live = false; };
  }, []);
  return state;
}

export function formatAmount(value, unit, L) {
  if (value === null || value === undefined) return L('unknown', 'غير معروف');
  const v = value >= 100 ? Math.round(value) : value >= 10 ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;
  const u = UNIT_NAMES[unit] || [unit, unit];
  return `${v} ${L(u[0], u[1])}`;
}

/** The full nutrient table of a food for some grams. */
export function NutrientTable({ values, units }) {
  const { L } = useLang();
  return (
    <div className="divide-y divide-brand-900/10 text-sm dark:divide-white/10">
      {Object.keys(NUTRIENT_NAMES).filter((k) => k in values).map((key) => {
        const dv = DAILY_VALUE[key];
        const v = values[key];
        return (
          <div key={key} className="flex items-center justify-between gap-2 py-1.5">
            <span>{L(...NUTRIENT_NAMES[key])}</span>
            <span className={`tabular ${v === null ? 'muted' : 'font-semibold'}`}>
              {formatAmount(v, units[key], L)}
              {dv && v !== null ? <span className="muted font-normal"> · {Math.round((v / dv) * 100)}%</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FoodDetail({ db, food, onBack, onAdd, addLabel }) {
  const { L, lang } = useLang();
  // Start from an everyday portion (one large egg, a slice, a medium fruit)
  // when the source has one, otherwise from 100 g.
  const usual = food.portions.find((p) => /^1 large\b/i.test(p.label))
    || food.portions.find((p) => /^1 (medium|slice|piece|serving|fruit)\b/i.test(p.label));
  const [grams, setGrams] = useState(usual?.grams || 100);
  const [portion, setPortion] = useState(usual?.label || '');
  const values = nutrientsFor(food, Number(grams) || 0);
  const cat = db.categories[food.category];
  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <p className="text-lg font-extrabold leading-tight">{lang === 'ar' && food.hasArabic ? food.name.ar : food.name.en}</p>
        {lang === 'ar' && food.hasArabic && <p className="muted text-sm" dir="ltr">{food.name.en}</p>}
        <p className="muted text-xs">
          {cat ? L(cat[0], cat[1]) : ''}
          {food.prep && PREP[food.prep] ? ` · ${L(...PREP[food.prep])}` : ''}
          {' · '}{L('USDA SR Legacy 2018', 'بيانات وزارة الزراعة الأمريكية 2018')}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button className="btn-soft !px-3" aria-label={L('Less', 'أقل')} onClick={() => { setGrams(Math.max(0, Math.round(grams - 10))); setPortion(''); }}>
            <Minus size={18} />
          </button>
          <NumberInput className="text-center text-lg font-bold" value={grams} onChange={(v) => { setGrams(Number(v) || 0); setPortion(''); }} aria-label={L('Edible grams', 'الجرامات المأكولة')} />
          <span className="muted">{L('g', 'جم')}</span>
          <button className="btn-soft !px-3" aria-label={L('More', 'أكثر')} onClick={() => { setGrams(Math.round(grams + 10)); setPortion(''); }}>
            <Plus size={18} />
          </button>
        </div>
        {food.portions.length > 0 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {food.portions.map((p) => (
              <button
                key={p.label}
                className={`chip shrink-0 ${portion === p.label ? 'chip-on' : ''}`}
                onClick={() => { setGrams(p.grams); setPortion(p.label); }}
              >
                <span dir="ltr">{p.label}</span> = {p.grams} {L('g', 'جم')}
              </button>
            ))}
          </div>
        )}
        <p className="muted text-xs">
          {L(
            'Weigh the part you eat (no bones, peel or drained liquid). Portions are reference weights from the source.',
            'زِن الجزء الذي تأكله (بلا عظم أو قشر أو سائل مصفّى). الحصص أوزان مرجعية من المصدر.',
          )}
        </p>
      </div>
      <div className="card">
        <p className="mb-1 font-bold">{L(`Nutrients in ${grams} g`, `القيم في ${grams} جم`)}</p>
        <NutrientTable values={values} units={db.units} />
        <p className="muted mt-2 text-xs">{L('% of the reference daily value on food labels.', '٪ من القيمة اليومية المرجعية في ملصقات الأغذية.')}</p>
      </div>
      <div className="flex gap-2">
        <button className="btn-soft flex-1" onClick={onBack}>{L('Back', 'رجوع')}</button>
        {onAdd && (
          <button className="btn-primary flex-[2]" disabled={!grams} onClick={() => onAdd([logEntry(food, Number(grams), { portion, release: db.source.release })])}>
            <Check size={18} /> {addLabel || L('Add', 'إضافة')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Search and browse the database. `onAdd` receives log entries. */
export function FromDatabase({ onAdd, addLabel }) {
  const { L, lang } = useLang();
  const { db, error } = useFoodDb();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [chosen, setChosen] = useState(null);

  const list = useMemo(() => (db ? searchFoods(db, query, { category, limit: 60 }) : []), [db, query, category]);

  if (error) {
    return <p className="card muted text-center text-sm">{L('The food database could not be loaded. Check the connection and try again.', 'تعذّر تحميل قاعدة الأغذية. تحقق من الاتصال وحاول مجدداً.')}</p>;
  }
  if (!db) return <Spinner label={L('Loading the food database…', 'جارٍ تحميل قاعدة الأغذية…')} />;
  if (chosen) {
    return (
      <FoodDetail
        db={db} food={chosen} addLabel={addLabel} onBack={() => setChosen(null)}
        onAdd={onAdd && ((items) => { onAdd(items); setChosen(null); })}
      />
    );
  }

  const categories = Object.entries(db.categories).sort((a, b) => L(a[1][0], a[1][1]).localeCompare(L(b[1][0], b[1][1]), lang));
  return (
    <div className="space-y-3">
      <label className="relative block">
        <Search size={18} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
        <input
          className="input !ps-10"
          placeholder={L('Search 7,000 foods, e.g. “egg boiled” or “بيض مسلوق”', 'ابحث في 7000 صنف، مثل «بيض مسلوق» أو «egg boiled»')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={L('Food group', 'المجموعة الغذائية')}>
        <option value="all">{L('All food groups', 'كل المجموعات الغذائية')}</option>
        {categories.map(([id, name]) => <option key={id} value={id}>{L(name[0], name[1])}</option>)}
      </select>
      <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
        {list.map((f) => {
          const per = f.per100;
          return (
            <button key={f.id} className="flex w-full items-center justify-between gap-3 py-3 text-start" onClick={() => setChosen(f)}>
              <span className="min-w-0">
                {f.hasArabic && <span className="block truncate font-bold">{f.name.ar}</span>}
                <span className={`block text-sm ${f.hasArabic ? 'muted' : 'font-medium'}`} dir="ltr" style={{ textAlign: 'start' }}>{f.name.en}</span>
                <span className="muted tabular block text-xs">
                  {L(
                    `per 100 g · P ${per.protein_g} · C ${per.carbohydrate_g} · F ${per.fat_g}`,
                    `لكل 100 جم · بروتين ${per.protein_g} · كربوهيدرات ${per.carbohydrate_g} · دهون ${per.fat_g}`,
                  )}
                </span>
              </span>
              <span className="tabular shrink-0 text-sm font-bold">{Math.round(per.energy_kcal)} <span className="muted font-normal">{L('kcal', 'سعرة')}</span></span>
            </button>
          );
        })}
        {!list.length && (
          <p className="muted py-6 text-center text-sm">
            {L(
              'Not in the database. Local foods like kisra, fino or baladi bread are in the quick list, or use “Describe” or “Label”.',
              'غير موجود في القاعدة. الأطعمة المحلية مثل الكسرة والعيش الفينو والبلدي في القائمة السريعة، أو استخدم «وصف» أو «ملصق».',
            )}
          </p>
        )}
      </div>
      <p className="muted px-1 text-xs">
        <Database size={12} className="inline" />{' '}
        {L(
          `USDA FoodData Central, SR Legacy (final release, April 2018). ${db.foods.length.toLocaleString('en')} foods; values per 100 g in the state named. Most names are in English.`,
          `قاعدة بيانات وزارة الزراعة الأمريكية (الإصدار النهائي، أبريل 2018). ${db.foods.length.toLocaleString('en')} صنفاً، والقيم لكل 100 جم بالحالة المذكورة. معظم الأسماء بالإنجليزية.`,
        )}
      </p>
    </div>
  );
}

/** Saved meals: add one in a tap, or delete it. */
export function MyMeals({ onAdd }) {
  const { L, pick } = useLang();
  const [meals, setMeals] = useStore('foodMeals', EMPTY);
  if (!meals.length) {
    return (
      <p className="card muted text-center text-sm">
        {L(
          'No saved meals yet. On the food screen, “Save as a meal” under any meal keeps its items together for next time.',
          'لا توجد وجبات محفوظة بعد. في شاشة الغذاء، زر «احفظها كوجبة» تحت أي وجبة يحفظ أصنافها معاً للمرة القادمة.',
        )}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {meals.map((meal) => {
        const sum = mealTotals(meal.items);
        return (
          <div key={meal.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-extrabold">{meal.name}</p>
                <p className="muted text-sm">{meal.items.map((i) => pick(i.name)).join(L(', ', '، '))}</p>
              </div>
              <button
                className="muted flex h-10 w-10 shrink-0 items-center justify-center"
                aria-label={L('Delete meal', 'حذف الوجبة')}
                onClick={() => setMeals(meals.filter((m) => m.id !== meal.id))}
              >
                <Trash2 size={18} />
              </button>
            </div>
            <p className="tabular text-sm">
              {L(
                `${sum.kcal} kcal · P ${sum.protein} · C ${sum.carbs} · F ${sum.fat} · ${sum.grams} g`,
                `${sum.kcal} سعرة · بروتين ${sum.protein} · كربوهيدرات ${sum.carbs} · دهون ${sum.fat} · ${sum.grams} جم`,
              )}
            </p>
            <button className="btn-soft w-full" onClick={() => onAdd(meal.items.map((i) => ({ ...i, source: i.source || 'meal' })))}>
              <Plus size={16} /> {L('Add this meal', 'أضف هذه الوجبة')}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Saves log entries as a named meal. */
export function SaveMeal({ items, onDone }) {
  const { L } = useLang();
  const [meals, setMeals] = useStore('foodMeals', EMPTY);
  const [name, setName] = useState('');
  return (
    <div className="space-y-3">
      <Field label={L('Meal name', 'اسم الوجبة')}>
        <input className="input" value={name} placeholder={L('e.g. My usual breakfast', 'مثال: فطوري المعتاد')} onChange={(e) => setName(e.target.value)} />
      </Field>
      <button
        className="btn-primary w-full"
        disabled={!name.trim() || !items.length}
        onClick={() => {
          const clean = items.map(({ id, meal, ...rest }) => rest); // eslint-disable-line no-unused-vars
          setMeals([{ id: uid(), name: name.trim(), items: clean, created: Date.now() }, ...meals]);
          onDone?.();
        }}
      >
        <Check size={18} /> {L('Save meal', 'احفظ الوجبة')}
      </button>
    </div>
  );
}

