// The AI coach: reads the person's own numbers — today's food against the
// trainer's 2,800 kcal plan, the week's calories, the water, and which gym
// machines the recent workouts used — and asks the AI for an honest,
// practical analysis: adherence to the plan, calories and protein, the
// best tips for gaining muscle, and how to get more from the machines.
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { askAI, aiAvailable } from '../lib/ai';
import { AiSetupNote, useAiError } from './Ai';
import { totals } from '../lib/nutrition';
import { dayKey, lastDays } from '../lib/dates';
import { TRAINER_PLAN } from '../data/trainerPlan';
import { toolStats } from '../lib/gym';
import { EQUIPMENT } from '../data/equipment';

const NONE = {};
const EMPTY = [];

export default function AiCoach() {
  const { L, pick, lang } = useLang();
  const aiError = useAiError();
  const [profile] = useStore('profile', NONE);
  const [log] = useStore('foodLog', NONE);
  const [planDays] = useStore('trainerPlan', NONE);
  const [water] = useStore('water', NONE);
  const [sessions] = useStore('gymSessions', EMPTY);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const analyse = async () => {
    if (!aiAvailable()) {
      aiError({ code: 'ai-setup' });
      return;
    }
    setBusy(true);
    try {
      const today = dayKey();
      const eaten = totals(log[today] || EMPTY);
      const plan = planDays[today] || {};
      const chosen = TRAINER_PLAN.meals.filter((m) => (plan.picks || {})[m.id] !== undefined).map((m) => m.name.en);
      const ticked = TRAINER_PLAN.meals.filter((m) => (plan.done || {})[m.id]).length;
      const week = lastDays(7, today).map((key) => `${key}: ${totals(log[key] || EMPTY).kcal} kcal`).join('; ');
      const since = lastDays(14, today)[0];
      const recent = (sessions || []).filter((s) => s.date >= since);
      const usedLines = [];
      const unused = [];
      for (const tool of EQUIPMENT) {
        const stats = toolStats(recent, tool.exercises.map((x) => x.id));
        if (stats.sessions > 0) usedLines.push(`${tool.name.en}: ${stats.sessions} sessions, ${stats.sets} sets, last ${stats.lastDate}`);
        else unused.push(tool.name.en);
      }
      const facts = [
        `Goal: gain weight as muscle mass. The trainer's plan: ${TRAINER_PLAN.kcal} kcal a day, 4 home meals (one option chosen per meal), 3 litres of water.`,
        profile.weight ? `Current weight: ${profile.weight} kg.` : '',
        `Today so far: ${eaten.kcal} kcal, protein ${eaten.protein} g, carbs ${eaten.carbs} g, fat ${eaten.fat} g.`,
        `Trainer plan today: ${chosen.length} of 4 meals chosen (${chosen.join(', ') || 'none yet'}), ${ticked} ticked as eaten. Water: ${Number(water[today]) || 0} ml of 3000 ml.`,
        `Calories, last 7 days: ${week}.`,
        `Workouts in the last 14 days: ${recent.length}. Machines used — ${usedLines.join('; ') || 'none recorded'}.`,
        `Machines not used in the last 14 days: ${unused.slice(0, 12).join(', ') || 'none'}.`,
      ].filter(Boolean).join('\n');
      const text = await askAI({
        system:
          'You are a supportive, straight-talking nutrition and gym coach. You judge adherence to the trainer\'s plan honestly but kindly, and your advice is practical for home food and a normal gym. Never give medical diagnoses; if something looks like a health concern, suggest seeing a doctor briefly.',
        prompt: [
          `Answer in ${lang === 'ar' ? 'Arabic' : 'English'}.`,
          'Analyse this person\'s nutrition and training from these facts:',
          facts,
          'Write four short sections with these headings: 1) Adherence to the trainer\'s plan. 2) Calories and protein versus the target. 3) Best tips to gain muscle (food, protein timing, sleep). 4) Machine use: what is trained well, what is neglected, and the best method or technique advice for the machines used most. Keep each section to a few short lines, with concrete numbers where the facts allow.',
        ].join('\n'),
      });
      setAnswer(String(text || '').trim());
    } catch (error) {
      aiError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-2">
      <p className="flex items-center gap-2 font-extrabold">
        <Sparkles size={18} className="text-gold-600 dark:text-gold-300" />
        {L('AI coach analysis', 'تحليل المدرب الذكي')}
      </p>
      <p className="muted text-sm">
        {L('Reads your food log against the trainer\'s plan, your calories and water, and the machines you trained on — then tells you how you are doing and what to improve.', 'يقرأ سجل غذائك مقابل جدول المدرب وسعراتك وماءك والأجهزة التي تمرنت عليها، ثم يخبرك بمستوى التزامك وما تحسّنه.')}
      </p>
      {!aiAvailable() && <AiSetupNote />}
      <button className="btn-primary w-full" onClick={analyse} disabled={busy || !aiAvailable()}>
        <Sparkles size={18} />
        {busy ? L('Analysing…', 'جارٍ التحليل…') : L('Analyse my nutrition and training', 'حلّل غذائي وتدريبي')}
      </button>
      {answer && <div className="whitespace-pre-line border-t border-brand-900/10 pt-2 text-sm leading-relaxed dark:border-white/10">{answer}</div>}
    </div>
  );
}
