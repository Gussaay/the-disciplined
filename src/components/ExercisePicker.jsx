// Choosing what to train: by tapping a machine, by searching, or by taking a
// photo of the machine and letting the AI recognise it.
import { useMemo, useState } from 'react';
import { ChevronLeft, Plus, Search, Sparkles } from 'lucide-react';
import { useLang } from '../i18n';
import { EQUIPMENT, EXERCISES, MUSCLES, equipmentById } from '../data/equipment';
import { askAI, aiAvailable } from '../lib/ai';
import { equipmentPrompt, readEquipment } from '../lib/aiPrompts';
import { customExercise } from '../lib/gymSession';
import { AiSetupNote, PhotoButton, useAiError } from './Ai';
import { Sheet, useToast } from './ui';

export function ExerciseRow({ exercise, onAdd, addLabel }) {
  const { pick, L } = useLang();
  const [open, setOpen] = useState(false);
  const muscle = MUSCLES[exercise.muscle] ? pick(MUSCLES[exercise.muscle]) : exercise.muscle;
  return (
    <div className="card !p-3">
      <div className="flex items-center gap-2">
        <button className="min-w-0 flex-1 text-start" onClick={() => setOpen(!open)} aria-expanded={open}>
          <p className="font-bold">{pick(exercise.name)}</p>
          <p className="muted text-sm">{muscle}</p>
        </button>
        {onAdd && (
          <button className="btn-soft !min-h-[40px] !px-3" onClick={() => onAdd(exercise)}>
            <Plus size={16} />
            {addLabel || L('Add', 'إضافة')}
          </button>
        )}
      </div>
      {open && <p className="mt-2 border-t border-brand-900/10 pt-2 text-sm leading-relaxed dark:border-white/10">{pick(exercise.how)}</p>}
    </div>
  );
}

/**
 * `onAdd(exercise)` receives a catalogue exercise or a custom one. When
 * `open`/`onClose` are given it renders as a sheet, otherwise inline.
 */
export default function ExercisePicker({ open, onClose, onAdd, addLabel }) {
  const { L, pick, lang } = useLang();
  const toast = useToast();
  const aiError = useAiError();
  const [equipmentId, setEquipmentId] = useState(null);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null); // AI answer for equipment not in the catalogue
  const [busy, setBusy] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(EXERCISES).filter((x) => `${x.name.en} ${x.name.ar} ${x.muscle}`.toLowerCase().includes(q)).slice(0, 20);
  }, [query]);

  const recognise = async (photo) => {
    if (!aiAvailable()) {
      aiError({ code: 'ai-setup' });
      return;
    }
    setBusy(true);
    try {
      const answer = readEquipment(await askAI({ ...equipmentPrompt(EQUIPMENT, lang), image: photo, json: true }));
      if (answer.id === 'none') {
        toast(L('No gym equipment was recognised in the photo', 'لم يُتعرَّف على جهاز رياضي في الصورة'), 'error');
      } else if (equipmentById(answer.id)) {
        setFound({ ...answer, exercises: [] });
        setEquipmentId(answer.id);
      } else {
        setFound(answer);
        setEquipmentId(null);
      }
    } catch (error) {
      aiError(error);
    } finally {
      setBusy(false);
    }
  };

  const equipment = equipmentId && equipmentById(equipmentId);

  const body = (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search size={18} className="muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            className="input !ps-10"
            placeholder={L('Search exercises', 'ابحث عن تمرين')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setEquipmentId(null);
              setFound(null);
            }}
          />
        </label>
        <PhotoButton onPhoto={recognise} busy={busy} className="btn-primary shrink-0">
          {L('Photo', 'صورة')}
        </PhotoButton>
      </div>
      {!aiAvailable() && <AiSetupNote />}

      {found && (
        <div className="rounded-2xl border border-gold-400/50 bg-gold-100/60 p-3 text-sm dark:border-gold-500/30 dark:bg-gold-500/10">
          <p className="flex items-center gap-2 font-bold">
            <Sparkles size={16} className="text-gold-600 dark:text-gold-300" />
            {equipment ? pick(equipment.name) : found.name}
            {found.confidence > 0 && <span className="muted font-normal">· {Math.round(found.confidence * 100)}%</span>}
          </p>
          {found.tip && <p className="mt-1">{found.tip}</p>}
        </div>
      )}

      {found && !equipment && found.exercises.map((x) => (
        <ExerciseRow
          key={x.name}
          exercise={{ ...customExercise(x.name, x.muscle, x.how) }}
          onAdd={onAdd}
          addLabel={addLabel}
        />
      ))}

      {query.trim() ? (
        results.length ? (
          results.map((x) => <ExerciseRow key={x.id} exercise={x} onAdd={onAdd} addLabel={addLabel} />)
        ) : (
          <div className="card text-center text-sm">
            <p className="muted">{L('No exercise matches. Add it as your own:', 'لا يوجد تمرين مطابق. أضفه كتمرين خاص:')}</p>
            <button className="btn-soft mt-2" onClick={() => onAdd(customExercise(query.trim()))}>
              <Plus size={16} /> {query.trim()}
            </button>
          </div>
        )
      ) : equipment ? (
        <>
          <button className="btn-ghost !px-2" onClick={() => { setEquipmentId(null); setFound(null); }}>
            <ChevronLeft size={16} className="flip-rtl" />
            {L('All equipment', 'كل الأجهزة')}
          </button>
          <h3 className="text-lg font-extrabold"><span aria-hidden>{equipment.icon}</span> {pick(equipment.name)}</h3>
          {equipment.exercises.map((x) => (
            <ExerciseRow key={x.id} exercise={EXERCISES[x.id]} onAdd={onAdd} addLabel={addLabel} />
          ))}
        </>
      ) : (
        !found?.exercises?.length && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EQUIPMENT.map((e) => (
              <button key={e.id} className="card flex flex-col items-start gap-1 !p-3 text-start active:scale-[0.98]" onClick={() => setEquipmentId(e.id)}>
                <span className="text-2xl" aria-hidden>{e.icon}</span>
                <span className="font-bold leading-tight">{pick(e.name)}</span>
                <span className="muted text-xs">{L(`${e.exercises.length} exercises`, `${e.exercises.length} تمارين`)}</span>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );

  if (onClose === undefined) return body;
  return (
    <Sheet open={open} onClose={onClose} title={L('Choose an exercise', 'اختر تمريناً')}>
      {body}
    </Sheet>
  );
}
