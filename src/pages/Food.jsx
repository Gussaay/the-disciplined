import { useMemo, useState } from 'react';
import { BookmarkPlus, ChevronLeft, ChevronRight, ClipboardCopy, Database, Droplets, Minus, Plus, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Bars, Meter, Page, Ring, Section, Segmented, Sheet, useToast } from '../components/ui';
import AddFood, { MacroLine } from '../components/AddFood';
import { SaveMeal, formatAmount } from '../components/FoodDatabase';
import { DAILY_VALUE, MICRO_GROUPS, NUTRIENT_NAMES, microTotals } from '../lib/foodDb';
import { useAiError } from '../components/Ai';
import { FOODS, MEALS } from '../data/foods';
import { bmi, dailyTargets, remaining, suggest, totals } from '../lib/nutrition';
import { addDays, dayKey, fromKey, lastDays, uid } from '../lib/dates';
import { askAI, aiAvailable } from '../lib/ai';
import { mealIdeasPrompt, readMealIdeas } from '../lib/aiPrompts';

const NONE = {};
const EMPTY = [];
const COLOR = goalById('food').color;
const GLASS = 250;

function mealNow() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

export default function Food() {
  const { L, pick, date, num, lang } = useLang();
  const toast = useToast();
  const aiError = useAiError();
  const [profile] = useStore('profile', NONE);
  const [log, setLog] = useStore('foodLog', NONE);
  const [plan, setPlan] = useStore('foodPlan', EMPTY);
  const [custom] = useStore('foodCustom', EMPTY);
  const [water, setWater] = useStore('water', NONE);
  const [view, setView] = useState('log');
  const [day, setDay] = useState(dayKey());
  const [addTo, setAddTo] = useState(null);
  const [ideas, setIdeas] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(null);

  const today = dayKey();
  const planning = view === 'plan';
  const entries = planning ? plan : log[day] || EMPTY;
  const save = (next) => (planning ? setPlan(next) : setLog({ ...log, [day]: next }));

  const targets = useMemo(() => dailyTargets(profile), [profile]);
  const eaten = totals(entries);
  const left = remaining(targets, eaten);
  const body = bmi(profile.weight, profile.height);
  const drunk = Number(water[day]) || 0;

  const add = (meal, items) => {
    save([...entries, ...items.map((item) => ({ ...item, id: uid(), meal }))]);
    toast(L(`Added to ${pick(MEALS.find((m) => m.id === meal).name)}`, `أضيف إلى ${pick(MEALS.find((m) => m.id === meal).name)}`));
  };

  const suggestions = useMemo(
    () => suggest([...custom, ...FOODS], left, { targets, mealShare: MEALS.find((m) => m.id === mealNow()).share + 0.1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eaten.kcal, eaten.protein, targets.kcal, custom],
  );

  const askIdeas = async () => {
    setBusy(true);
    try {
      const meal = MEALS.find((m) => m.id === mealNow());
      const json = await askAI({ ...mealIdeasPrompt({ left, targets, meal: meal.name.en, likes: profile.foodLikes, lang }), json: true });
      const list = readMealIdeas(json);
      if (!list.length) throw new Error(L('No ideas came back, try again', 'لم تصل اقتراحات، حاول مجدداً'));
      setIdeas(list);
    } catch (error) {
      aiError(error);
    } finally {
      setBusy(false);
    }
  };

  const week = lastDays(7, today).map((key) => ({ key, kcal: totals(log[key] || EMPTY).kcal }));

  return (
    <Page
      goal="food"
      action={
        <Link to="/food/database" className="btn-soft !min-h-[40px] !px-3 text-sm">
          <Database size={16} /> {L('Foods', 'الأغذية')}
        </Link>
      }
      title={L('Healthy food', 'الغذاء الصحي')}
      subtitle={planning ? L('Your template day', 'يومك النموذجي') : day === today ? L('Today', 'اليوم') : date(fromKey(day))}
    >
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'log', label: L('What I ate', 'ما أكلته'), icon: '🍽️' },
          { value: 'plan', label: L('My plan', 'خطتي'), icon: '🗓️' },
        ]}
      />

      {!planning && (
        <div className="flex items-center justify-between">
          <button className="btn-ghost !px-3" aria-label={L('Previous day', 'اليوم السابق')} onClick={() => setDay(addDays(day, -1))}>
            <ChevronLeft className="flip-rtl" />
          </button>
          <button className="font-bold" onClick={() => setDay(today)}>
            {day === today ? L('Today', 'اليوم') : date(fromKey(day), { weekday: 'short', day: 'numeric', month: 'short' })}
          </button>
          <button className="btn-ghost !px-3" aria-label={L('Next day', 'اليوم التالي')} disabled={day >= today} onClick={() => setDay(addDays(day, 1))}>
            <ChevronRight className="flip-rtl" />
          </button>
        </div>
      )}

      {planning && (
        <div className="card space-y-3">
          <p className="text-sm">
            {L(
              'Build the day you intend to eat. On any day, one tap copies it into your log, and you only change what was different.',
              'ابنِ اليوم الذي تنوي أن تأكله. وفي أي يوم تنسخه إلى سجلك بضغطة واحدة ثم تعدّل ما اختلف فقط.',
            )}
          </p>
          <button
            className="btn-primary w-full"
            disabled={!plan.length}
            onClick={() => {
              setLog({ ...log, [today]: [...(log[today] || EMPTY), ...plan.map((e) => ({ ...e, id: uid(), source: 'plan' }))] });
              setDay(today);
              setView('log');
              toast(L('Plan copied to today', 'نُسخت الخطة إلى اليوم'));
            }}
          >
            <ClipboardCopy size={18} /> {L('Log this plan for today', 'سجّل هذه الخطة لليوم')}
          </button>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-4">
          <Ring value={eaten.kcal / targets.kcal} size={112} stroke={11} color={eaten.kcal > targets.kcal * 1.1 ? '#DC2626' : COLOR} label={L(`${eaten.kcal} of ${targets.kcal} kcal`, `${eaten.kcal} من ${targets.kcal} سعرة`)}>
            <span className="tabular text-2xl font-extrabold">{num(Math.abs(left.kcal))}</span>
            <span className="muted text-xs">{left.kcal >= 0 ? L('kcal left', 'سعرة متبقية') : L('kcal over', 'سعرة زائدة')}</span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-2">
            <Meter label={L('Protein', 'البروتين')} value={eaten.protein} target={targets.protein} unit={L('g', 'جم')} color="#B8436B" />
            <Meter label={L('Carbs', 'الكربوهيدرات')} value={eaten.carbs} target={targets.carbs} unit={L('g', 'جم')} color="#C99A22" />
            <Meter label={L('Fat', 'الدهون')} value={eaten.fat} target={targets.fat} unit={L('g', 'جم')} color="#4B5FC4" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-brand-900/10 pt-3 dark:border-white/10">
          <Meter label={L('Sugar', 'السكر')} value={eaten.sugar} target={targets.sugar} unit={L('g', 'جم')} color="#D9622B" warnOver />
          <Meter label={L('Fibre', 'الألياف')} value={eaten.fiber} target={targets.fiber} unit={L('g', 'جم')} color={COLOR} />
        </div>
        {eaten.unknown?.some((k) => k === 'sugar' || k === 'fiber') && (
          <p className="muted mt-2 text-xs">
            {L(
              `Some foods today do not report their ${eaten.unknown.filter((k) => k === 'sugar' || k === 'fiber').map((k) => (k === 'sugar' ? 'sugar' : 'fibre')).join(' or ')}, so that total is at least the amount shown.`,
              `بعض أطعمة اليوم لا تذكر ${eaten.unknown.filter((k) => k === 'sugar' || k === 'fiber').map((k) => (k === 'sugar' ? 'السكر' : 'الألياف')).join(' أو ')}، لذا فالمجموع لا يقل عن الرقم المعروض.`,
            )}
          </p>
        )}
        <p className="muted mt-3 text-xs">
          {L(
            `Target ${num(targets.kcal)} kcal from your weight, height, age, activity and goal`,
            `الهدف ${num(targets.kcal)} سعرة محسوب من وزنك وطولك وعمرك ونشاطك وهدفك`,
          )}
          {body && L(` · BMI ${body.value}`, ` · مؤشر كتلة الجسم ${body.value}`)}
        </p>
      </div>

      {!planning && (
        <div className="card flex items-center gap-3">
          <Droplets className="shrink-0 text-sky-500" />
          <div className="min-w-0 flex-1">
            <Meter label={L('Water', 'الماء')} value={drunk} target={targets.water} unit={L('ml', 'مل')} color="#0EA5E9" />
          </div>
          <button className="btn-soft !px-3" aria-label={L('One glass less', 'كوب أقل')} onClick={() => setWater({ ...water, [day]: Math.max(0, drunk - GLASS) })}>
            <Minus size={18} />
          </button>
          <button className="btn-soft !px-3" aria-label={L('One glass more', 'كوب إضافي')} onClick={() => setWater({ ...water, [day]: drunk + GLASS })}>
            <Plus size={18} />
          </button>
        </div>
      )}

      {entries.length > 0 && <MicroPanel entries={entries} />}

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal.id);
        const sum = totals(items);
        return (
          <Section
            key={meal.id}
            title={`${meal.icon} ${pick(meal.name)}${sum.kcal ? ` · ${num(sum.kcal)} ${L('kcal', 'سعرة')}` : ''}`}
            action={
              <div className="flex gap-1">
                {items.length > 0 && (
                  <button className="btn-ghost !min-h-[36px] !px-2 text-sm" aria-label={L('Save as a meal', 'احفظها كوجبة')} title={L('Save as a meal', 'احفظها كوجبة')} onClick={() => setSaving(items)}>
                    <BookmarkPlus size={16} />
                  </button>
                )}
                <button className="btn-soft !min-h-[36px] !px-3 text-sm" onClick={() => setAddTo(meal.id)}>
                  <Plus size={16} /> {L('Add', 'إضافة')}
                </button>
              </div>
            }
          >
            {items.length > 0 && (
              <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
                {items.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {pick(e.name)} <span className="muted tabular text-sm font-normal">· {Math.round(e.grams)} {L('g', 'جم')}</span>
                      </p>
                      <MacroLine item={e} />
                    </div>
                    <button className="muted flex h-10 w-10 shrink-0 items-center justify-center" aria-label={L('Remove', 'حذف')} onClick={() => save(entries.filter((x) => x.id !== e.id))}>
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        );
      })}

      {!planning && day === today && (
        <Section
          title={L('What to eat next', 'ماذا تأكل الآن')}
          action={
            <button className="btn-ghost !min-h-[36px] !px-2 text-sm" disabled={busy || !aiAvailable()} onClick={askIdeas}>
              <Sparkles size={16} /> {busy ? L('Thinking…', 'جارٍ التفكير…') : L('AI meal ideas', 'أفكار وجبات بالذكاء الاصطناعي')}
            </button>
          }
        >
          {suggestions.length ? (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {suggestions.map(({ food, portion: p }) => (
                <button
                  key={food.id}
                  className="card w-40 shrink-0 !p-3 text-start active:scale-[0.98]"
                  onClick={() => add(mealNow(), [{ name: food.name, foodId: food.id, ...p, source: 'suggestion' }])}
                >
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight">{pick(food.name)}</p>
                  <p className="muted mt-1 text-xs">{pick(food.servingLabel)} · {p.grams} {L('g', 'جم')}</p>
                  <p className="tabular mt-2 text-sm">
                    <b>{p.kcal}</b> {L('kcal', 'سعرة')} · <b style={{ color: '#B8436B' }}>{p.protein}</b> {L('g protein', 'جم بروتين')}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold" style={{ color: COLOR }}>
                    <Plus size={14} /> {L('Add', 'إضافة')}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="card muted text-center text-sm">
              {L('You have reached today’s calories. Water and vegetables are always fine.', 'بلغت سعرات اليوم. الماء والخضروات مناسبة دائماً.')}
            </p>
          )}
          <p className="muted px-1 text-xs">
            {L('Chosen to fit the calories you have left and to close your protein gap.', 'مختارة لتناسب السعرات المتبقية لك وتكمل حاجتك من البروتين.')}
          </p>
        </Section>
      )}

      {!planning && (
        <div className="card">
          <p className="mb-3 font-bold">{L('Calories, last 7 days', 'السعرات، آخر 7 أيام')}</p>
          <Bars
            color={COLOR}
            data={week.map((d) => ({ label: date(fromKey(d.key), { weekday: 'short' }), value: d.kcal, mark: d.kcal <= targets.kcal * 1.1 }))}
            format={(v) => num(v)}
          />
        </div>
      )}

      <AddFood
        open={Boolean(addTo)}
        onClose={() => setAddTo(null)}
        title={addTo ? L(`Add to ${pick(MEALS.find((m) => m.id === addTo).name)}`, `إضافة إلى ${pick(MEALS.find((m) => m.id === addTo).name)}`) : ''}
        onAdd={(items) => add(addTo, items)}
      />

      <Sheet open={Boolean(saving)} onClose={() => setSaving(null)} title={L('Save as a meal', 'احفظها كوجبة')}>
        {saving && (
          <>
            <p className="muted text-sm">{saving.map((i) => `${pick(i.name)} ${Math.round(i.grams)} ${L('g', 'جم')}`).join(L(', ', '، '))}</p>
            <SaveMeal
              items={saving}
              onDone={() => {
                setSaving(null);
                toast(L('Saved. Find it under “My meals” when adding food.', 'حُفظت. تجدها في «وجباتي» عند إضافة طعام.'));
              }}
            />
          </>
        )}
      </Sheet>

      <Sheet open={Boolean(ideas)} onClose={() => setIdeas(null)} title={L('Meal ideas', 'أفكار وجبات')}>
        {(ideas || []).map((idea) => {
          const sum = totals(idea.items);
          return (
            <div key={idea.title} className="card space-y-2">
              <p className="font-extrabold">{idea.title}</p>
              {idea.why && <p className="muted text-sm">{idea.why}</p>}
              <p className="text-sm">{idea.items.map((i) => `${i.name} ${Math.round(i.grams)} ${L('g', 'جم')}`).join(L(', ', '، '))}</p>
              <MacroLine item={sum} />
              <button
                className="btn-soft w-full"
                onClick={() => {
                  add(mealNow(), idea.items.map((i) => ({ ...i, source: 'ai' })));
                  setIdeas(null);
                }}
              >
                <Plus size={16} /> {L('I ate this', 'أكلت هذا')}
              </button>
            </div>
          );
        })}
      </Sheet>
    </Page>
  );
}

const UNITS = { g: 'g', mg: 'mg', ug: 'ug' };
const unitOf = (key) => UNITS[key.split('_').pop()] || 'g';

/** Vitamins, minerals and fat types for the day, from database foods. */
function MicroPanel({ entries }) {
  const { L } = useLang();
  const keys = MICRO_GROUPS.flatMap((g) => g.keys);
  const sums = microTotals(entries, keys);
  const fromDb = entries.filter((e) => e.micro).length;
  return (
    <details className="card group">
      <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
        {L('Vitamins, minerals and fats', 'الفيتامينات والمعادن والدهون')}
        <span className="muted text-sm font-normal">{L(`${fromDb} of ${entries.length} items with full data`, `${fromDb} من ${entries.length} أصناف ببيانات كاملة`)}</span>
      </summary>
      <div className="mt-3 space-y-4">
        {MICRO_GROUPS.map((group) => (
          <div key={group.id}>
            <p className="eyebrow mb-1">{L(...group.name)}</p>
            {group.keys.map((key) => {
              const { value, missing } = sums[key];
              const dv = DAILY_VALUE[key];
              const share = dv ? value / dv : 0;
              return (
                <div key={key} className="py-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{L(...NUTRIENT_NAMES[key])}</span>
                    <span className="tabular">
                      {missing ? '≥ ' : ''}{formatAmount(value, unitOf(key), L)}
                      {dv ? <span className="muted"> · {Math.round(share * 100)}%</span> : null}
                    </span>
                  </div>
                  {dv && (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-900/10 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, share * 100)}%`, background: key === 'sodium_mg' || key === 'saturated_fat_g' || key === 'cholesterol_mg' ? (share > 1 ? '#DC2626' : '#D9622B') : COLOR }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <p className="muted text-xs">
          {L(
            '“≥” means some items have no value for it (foods added from the quick list, a photo or a description carry only the main numbers). % is of the reference daily value on food labels, for scale, not a personal target.',
            '«≥» تعني أن بعض الأصناف ليس لها قيمة لهذا العنصر (الأطعمة المضافة من القائمة السريعة أو الصورة أو الوصف تحمل القيم الرئيسية فقط). النسبة من القيمة اليومية المرجعية في ملصقات الأغذية للمقارنة، وليست هدفاً شخصياً.',
          )}
        </p>
      </div>
    </details>
  );
}
