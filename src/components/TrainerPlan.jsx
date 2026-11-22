// The trainer's diet table on the Food page: four meals a day, one option
// chosen from each, and a tick when the meal is eaten. Choices and ticks
// are kept per day on this device (store key `trainerPlan`).
import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { TRAINER_PLAN } from '../data/trainerPlan';
import { dayKey } from '../lib/dates';

const NONE = {};

export default function TrainerPlan() {
  const { L, pick, num } = useLang();
  const [days, setDays] = useStore('trainerPlan', NONE);
  const today = dayKey();
  const day = days[today] || {};
  const picks = day.picks || {};
  const done = day.done || {};
  const [openMeal, setOpenMeal] = useState(() => (TRAINER_PLAN.meals.find((m) => picks[m.id] === undefined) || {}).id ?? null);

  const save = (next) => setDays({ ...days, [today]: next });
  const choose = (mealId, i) => {
    save({ ...day, picks: { ...picks, [mealId]: i } });
    setOpenMeal(null);
  };
  const toggleDone = (mealId) => save({ ...day, done: { ...done, [mealId]: !done[mealId] } });
  const doneCount = TRAINER_PLAN.meals.filter((m) => done[m.id]).length;

  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-extrabold">{L("Your trainer's plan", 'جدول مدربك')}</p>
        <p className="muted tabular text-sm">
          {num(TRAINER_PLAN.kcal)} {L('kcal', 'سعرة')} · {doneCount}/{TRAINER_PLAN.meals.length} {L('meals eaten', 'وجبات تمت')}
        </p>
      </div>
      <p className="muted -mt-1 text-sm">
        {L('Gain weight as muscle: four home meals a day. Choose one option from each meal and tick it when eaten.', 'زيادة الوزن بالكتلة العضلية: 4 وجبات منزلية يومياً. اختر وجبة واحدة من كل قسم وعلّم عليها بعد الأكل.')}
      </p>

      {TRAINER_PLAN.meals.map((meal) => {
        const chosen = picks[meal.id];
        const isOpen = openMeal === meal.id;
        return (
          <div key={meal.id} className="rounded-2xl border border-brand-900/10 dark:border-white/10">
            <div className="flex items-center gap-2 p-2">
              <button className="flex min-w-0 flex-1 items-center gap-2 text-start" onClick={() => setOpenMeal(isOpen ? null : meal.id)} aria-expanded={isOpen}>
                <span className="text-2xl" aria-hidden>{meal.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-tight">{pick(meal.name)}</span>
                  <span className={`block truncate text-xs ${chosen === undefined ? 'muted' : ''}`}>
                    {chosen === undefined ? L('Choose one option', 'اختر وجبة واحدة') : pick(meal.options[chosen])}
                  </span>
                </span>
                <ChevronDown size={18} className={`muted shrink-0 transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => toggleDone(meal.id)}
                aria-pressed={Boolean(done[meal.id])}
                aria-label={L(`${pick(meal.name)} eaten`, `تم أكل ${pick(meal.name)}`)}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${done[meal.id] ? 'border-transparent bg-emerald-600 text-white' : 'border-brand-900/20 text-slate-400 dark:border-white/20'}`}
              >
                <Check size={20} />
              </button>
            </div>
            {isOpen && (
              <div className="space-y-1 border-t border-brand-900/10 p-2 dark:border-white/10">
                {meal.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => choose(meal.id, i)}
                    aria-pressed={chosen === i}
                    className={`flex w-full items-start gap-2 rounded-xl px-2 py-2 text-start text-sm ${chosen === i ? 'bg-brand-50 font-bold dark:bg-white/10' : 'active:bg-black/5 dark:active:bg-white/5'}`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${chosen === i ? 'border-transparent bg-brand-600 text-white' : 'border-brand-900/25 dark:border-white/25'}`}>
                      {chosen === i && <Check size={13} />}
                    </span>
                    <span className="min-w-0 flex-1">{pick(option)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="border-t border-brand-900/10 pt-2 dark:border-white/10">
        <p className="mb-1 text-sm font-bold">💧 {L('Daily rules', 'تعليمات يومية')}</p>
        <ul className="muted list-inside list-disc space-y-0.5 text-sm">
          {TRAINER_PLAN.rules.map((rule, i) => (
            <li key={i}>{pick(rule)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
