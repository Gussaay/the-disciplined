// The food database as its own screen: look anything up, and add it to
// today's log under the meal chosen at the top.
import { useState } from 'react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { Page, Segmented, useToast } from '../components/ui';
import { FromDatabase } from '../components/FoodDatabase';
import { MEALS } from '../data/foods';
import { dayKey, uid } from '../lib/dates';

const NONE = {};

function mealNow() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

export default function FoodDatabasePage() {
  const { L, pick } = useLang();
  const toast = useToast();
  const [log, setLog] = useStore('foodLog', NONE);
  const [meal, setMeal] = useState(mealNow());
  const name = pick(MEALS.find((m) => m.id === meal).name);
  return (
    <Page back="/food" title={L('Food database', 'قاعدة الأغذية')} subtitle={L('Calories, macronutrients and micronutrients', 'السعرات والعناصر الكبرى والصغرى')}>
      <Segmented
        value={meal}
        onChange={setMeal}
        options={MEALS.map((m) => ({ value: m.id, label: pick(m.name), icon: m.icon }))}
      />
      <FromDatabase
        addLabel={L(`Add to ${name}`, `أضف إلى ${name}`)}
        onAdd={(items) => {
          const key = dayKey();
          setLog({ ...log, [key]: [...(log[key] || []), ...items.map((i) => ({ ...i, id: uid(), meal }))] });
          toast(L(`Added to today’s ${name}`, `أضيف إلى ${name} اليوم`));
        }}
      />
    </Page>
  );
}
