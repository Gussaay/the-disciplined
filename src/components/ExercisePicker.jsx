// Choosing what to train: by tapping a machine, by searching, or by taking a
// photo of the machine and letting the AI recognise it.
import { useMemo, useState } from 'react';
import { Camera, ChevronLeft, Plus, Search, Sparkles, X } from 'lucide-react';
import { useLang } from '../i18n';
import { EQUIPMENT, EXERCISES, MUSCLES, equipmentById } from '../data/equipment';
import { askAI, aiAvailable } from '../lib/ai';
import { equipmentPrompt, readEquipment } from '../lib/aiPrompts';
import { customExercise } from '../lib/gymSession';
import { AiSetupNote, PhotoButton, useAiError } from './Ai';
import { Sheet, useToast } from './ui';
import ExerciseGuide from './ExerciseGuide';
import ToolDashboard from './ToolDashboard';
import { PHOTOS, REGIONS, targetsOf } from '../data/exerciseGuide';
import { TOOL_PHOTOS } from '../data/toolPhotos';
import { useStore } from '../hooks/useStore';
import { shrinkImage } from '../lib/image';

const NONE = {};
const EMPTY = [];

/** The photo of a machine: the one taken at the gym, or the built-in one. */
export function useMachinePhotos() {
  const [own, setOwn] = useStore('gymPhotos', NONE);
  // The person's own photo of the machine wins, then the gym's photo, then
  // the standard catalogue photo every tool now has, then the label photo.
  const photoOf = (id) => own[id] || PHOTOS[id]?.photo || TOOL_PHOTOS[id] || PHOTOS[id]?.label || null;
  return { own, setOwn, photoOf };
}

export function ExerciseRow({ exercise, onAdd, addLabel }) {
  const { pick, L } = useLang();
  const [open, setOpen] = useState(false);
  const muscle = MUSCLES[exercise.muscle] ? pick(MUSCLES[exercise.muscle]) : exercise.muscle;
  return (
    <div className="card !p-3">
      <div className="flex items-center gap-2">
        <button className="min-w-0 flex-1 text-start" onClick={() => setOpen(!open)} aria-expanded={open}>
          <p className="font-bold">{exercise.custom ? exercise.name : pick(exercise.name)}</p>
          <p className="muted text-sm">
            {(() => {
              const t = targetsOf(exercise.id, exercise.muscle);
              return t.primary.length ? t.primary.map((r) => pick(REGIONS[r])).join(L(', ', '، ')) : muscle;
            })()}
          </p>
        </button>
        {onAdd && (
          <button className="btn-soft !min-h-[40px] !px-3" onClick={() => onAdd(exercise)}>
            <Plus size={16} />
            {addLabel || L('Add', 'إضافة')}
          </button>
        )}
      </div>
      {!open && <p className="muted mt-1 text-xs">{L('Tap the name to see the muscles and how to do it', 'اضغط الاسم لترى العضلات وطريقة الأداء')}</p>}
      {open && (
        <div className="mt-2 border-t border-brand-900/10 pt-2 dark:border-white/10">
          <ExerciseGuide exercise={exercise} />
        </div>
      )}
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
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [sessions] = useStore('gymSessions', EMPTY);
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
  const { own, setOwn, photoOf } = useMachinePhotos();
  const [zoom, setZoom] = useState(null);
  const ownPhoto = async (file) => {
    const { dataUrl } = await shrinkImage(file, 640, 0.7);
    setOwn({ ...own, [equipmentId]: dataUrl });
    toast(L('Photo saved for this machine', 'حُفظت صورة هذا الجهاز'));
  };

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
          {photoOf(equipment.id) && (
            <button className="block w-full overflow-hidden rounded-2xl bg-black/5" onClick={() => setZoom(photoOf(equipment.id))}>
              <img src={photoOf(equipment.id)} alt={pick(equipment.name)} className="max-h-72 w-full object-cover" />
            </button>
          )}
          <h3 className="text-lg font-extrabold"><span aria-hidden>{equipment.icon}</span> {pick(equipment.name)}</h3>
          <ToolDashboard equipment={equipment} sessions={sessions} />
          {PHOTOS[equipment.id]?.label && PHOTOS[equipment.id].label !== photoOf(equipment.id) && (
            <button className="flex w-full items-center gap-3 rounded-2xl bg-brand-50/70 p-2 text-start text-sm dark:bg-white/5" onClick={() => setZoom(PHOTOS[equipment.id].label)}>
              <img src={PHOTOS[equipment.id].label} alt="" className="h-14 w-20 rounded-lg object-cover" />
              <span>{L('The instruction label on this machine. Tap to enlarge.', 'ملصق التعليمات على هذا الجهاز. اضغط للتكبير.')}</span>
            </button>
          )}
          <label className="btn-ghost w-full cursor-pointer text-sm">
            <Camera size={16} />
            {own[equipment.id] ? L('Change my photo of this machine', 'غيّر صورتي لهذا الجهاز') : L('Add a photo of this machine at my gym', 'أضف صورة هذا الجهاز في ناديّ')}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) ownPhoto(file).catch(() => toast(L('Could not read the picture', 'تعذرت قراءة الصورة'), 'error'));
              }}
            />
          </label>
          {equipment.exercises.map((x) => (
            <ExerciseRow key={x.id} exercise={EXERCISES[x.id]} onAdd={onAdd} addLabel={addLabel} />
          ))}
        </>
      ) : (
        !found?.exercises?.length && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {['all', ...Object.keys(MUSCLES)].map((m) => (
                <button
                  key={m}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${muscleFilter === m ? 'bg-brand-600 text-white' : 'bg-brand-50/70 dark:bg-white/5'}`}
                  onClick={() => setMuscleFilter(m)}
                >
                  {m === 'all' ? L('All tools', 'كل الأجهزة') : pick(MUSCLES[m])}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EQUIPMENT.filter((e) => muscleFilter === 'all' || e.exercises.some((x) => x.muscle === muscleFilter)).map((e) => (
                <button key={e.id} className="card flex flex-col items-start gap-1 overflow-hidden !p-0 text-start active:scale-[0.98]" onClick={() => setEquipmentId(e.id)}>
                  {photoOf(e.id) ? (
                    <img src={photoOf(e.id)} alt="" loading="lazy" className="h-28 w-full object-cover" />
                  ) : (
                    <span className="flex h-28 w-full items-center justify-center bg-brand-50/70 text-5xl dark:bg-white/5" aria-hidden>{e.icon}</span>
                  )}
                  <span className="px-3 pt-1 font-bold leading-tight">{pick(e.name)}</span>
                  <span className="muted px-3 text-xs">
                    {[...new Set(e.exercises.map((x) => x.muscle))].slice(0, 3).map((m) => (MUSCLES[m] ? pick(MUSCLES[m]) : m)).join(L(' · ', ' · '))}
                  </span>
                  <span className="muted px-3 pb-3 text-xs">{L(`${e.exercises.length} exercises`, `${e.exercises.length} تمارين`)}</span>
                </button>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );

  const withZoom = (
    <>
      {body}
      {zoom && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)} role="dialog" aria-modal="true">
          <img src={zoom} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
          <button className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white" aria-label={L('Close', 'إغلاق')}>
            <X size={22} />
          </button>
        </div>
      )}
    </>
  );

  if (onClose === undefined) return withZoom;
  return (
    <Sheet open={open} onClose={onClose} title={L('Choose an exercise', 'اختر تمريناً')}>
      {withZoom}
    </Sheet>
  );
}
