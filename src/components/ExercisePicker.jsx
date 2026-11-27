// Choosing what to train: by tapping a machine, by searching, or by taking a
// photo of the machine and letting the AI recognise it.
import { useMemo, useState } from 'react';
import { Camera, ChevronLeft, Play, Plus, Search, Sparkles, X } from 'lucide-react';
import { useLang } from '../i18n';
import { EQUIPMENT, EXERCISES, MUSCLES, equipmentById } from '../data/equipment';
import { askAI, aiAvailable } from '../lib/ai';
import { equipmentPrompt, readEquipment } from '../lib/aiPrompts';
import { customExercise } from '../lib/gymSession';
import { toolStats } from '../lib/gym';
import { toolMatches } from '../lib/gymTools';
import KeywordsEditor from './KeywordsEditor';
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
  const [keywords, setKeywords] = useStore('gymKeywords', NONE);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null); // AI answer for equipment not in the catalogue
  const [busy, setBusy] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // An exercise also matches when its machine carries one of the person's
    // own keywords for it.
    const byKeyword = new Set(
      EQUIPMENT.filter((e) => toolMatches(e, EXERCISES, keywords, query, MUSCLES)).flatMap((e) => e.exercises.map((x) => x.id)),
    );
    return Object.values(EXERCISES)
      .filter((x) => `${x.name.en} ${x.name.ar} ${x.muscle}`.toLowerCase().includes(q) || byKeyword.has(x.id))
      .slice(0, 20);
  }, [query, keywords]);

  const toolResults = useMemo(() => {
    if (!query.trim()) return [];
    return EQUIPMENT.filter((e) => toolMatches(e, EXERCISES, keywords, query, MUSCLES)).slice(0, 5);
  }, [query, keywords]);

  // What this person actually trains on, from their saved sessions: their
  // usual tools come first so the machine they want is one tap away, not a
  // scroll through the whole catalogue.
  const usage = useMemo(() => {
    const map = {};
    for (const e of EQUIPMENT) {
      const stats = toolStats(sessions, e.exercises.map((x) => x.id));
      if (stats.sessions > 0) map[e.id] = stats;
    }
    return map;
  }, [sessions]);

  const usual = useMemo(
    () =>
      EQUIPMENT.filter((e) => usage[e.id])
        .sort((a, b) => (usage[b.id].lastDate || '').localeCompare(usage[a.id].lastDate || '') || usage[b.id].sessions - usage[a.id].sessions)
        .slice(0, 6),
    [usage],
  );

  const orderedTools = useMemo(() => {
    const filtered = EQUIPMENT.filter((e) => muscleFilter === 'all' || e.exercises.some((x) => x.muscle === muscleFilter));
    if (muscleFilter !== 'all') return filtered;
    return [...filtered].sort((a, b) => {
      const ua = usage[a.id];
      const ub = usage[b.id];
      if (ua && ub) return (ub.lastDate || '').localeCompare(ua.lastDate || '') || ub.sessions - ua.sessions;
      if (ua) return -1;
      if (ub) return 1;
      return 0;
    });
  }, [muscleFilter, usage]);

  // The exercise a one-tap start begins with: the one most trained on this
  // tool, or its first exercise when it has never been used.
  const quickExercise = (e) => {
    const per = usage[e.id]?.perExercise || {};
    const trained = e.exercises.filter((x) => per[x.id]);
    const best = trained.sort((a, b) => (per[b.id].sets || 0) - (per[a.id].sets || 0) || (per[b.id].lastDate || '').localeCompare(per[a.id].lastDate || ''))[0];
    return EXERCISES[(best || e.exercises[0]).id];
  };

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
        toolResults.length || results.length ? (
          <>
            {toolResults.map((e) => (
              <button
                key={e.id}
                className="card flex w-full items-center gap-3 !p-2 text-start"
                onClick={() => { setEquipmentId(e.id); setQuery(''); }}
              >
                {photoOf(e.id)
                  ? <img src={photoOf(e.id)} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  : <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-50/70 text-2xl dark:bg-white/5" aria-hidden>{e.icon}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-tight">{pick(e.name)}</span>
                  <span className="muted block text-xs">{L(`${e.exercises.length} exercises`, `${e.exercises.length} تمارين`)}</span>
                </span>
                <ChevronLeft size={18} className="muted flip-rtl shrink-0" />
              </button>
            ))}
            {results.map((x) => <ExerciseRow key={x.id} exercise={x} onAdd={onAdd} addLabel={addLabel} />)}
          </>
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
          <KeywordsEditor toolId={equipment.id} keywords={keywords} onChange={setKeywords} />
          {PHOTOS[equipment.id]?.label && PHOTOS[equipment.id].label !== photoOf(equipment.id) && (
            <button className="flex w-full items-center gap-3 rounded-2xl bg-brand-50/70 p-2 text-start text-sm dark:bg-white/5" onClick={() => setZoom(PHOTOS[equipment.id].label)}>
              <img src={PHOTOS[equipment.id].label} alt="" className="h-14 w-20 rounded-lg object-cover" />
              <span>{L('The instruction label on this machine. Tap to enlarge.', 'ملصق التعليمات على هذا الجهاز. اضغط للتكبير.')}</span>
            </button>
          )}
          {PHOTOS[equipment.id]?.gym && PHOTOS[equipment.id].gym !== photoOf(equipment.id) && (
            <button className="flex w-full items-center gap-3 rounded-2xl bg-brand-50/70 p-2 text-start text-sm dark:bg-white/5" onClick={() => setZoom(PHOTOS[equipment.id].gym)}>
              <img src={PHOTOS[equipment.id].gym} alt="" className="h-14 w-20 rounded-lg object-cover" />
              <span>{L('This machine at your gym. Tap to enlarge.', 'هذا الجهاز في ناديك. اضغط للتكبير.')}</span>
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
            {muscleFilter === 'all' && usual.length > 0 && (
              <div>
                <p className="eyebrow px-1 pb-1.5">{L('Your usual tools', 'أجهزتك المعتادة')}</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {usual.map((e) => (
                    <button key={e.id} className="w-28 shrink-0 overflow-hidden rounded-2xl bg-brand-50/70 text-start active:scale-[0.98] dark:bg-white/5" onClick={() => setEquipmentId(e.id)}>
                      {photoOf(e.id)
                        ? <img src={photoOf(e.id)} alt="" loading="lazy" className="h-16 w-full object-cover" />
                        : <span className="flex h-16 w-full items-center justify-center text-3xl" aria-hidden>{e.icon}</span>}
                      <span className="block truncate px-2 pt-1 text-xs font-bold leading-tight">{pick(e.name)}</span>
                      <span className="muted block px-2 pb-2 text-[11px]">{L(`${usage[e.id].sessions} sessions`, `${usage[e.id].sessions} حصص`)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              {orderedTools.map((e) => (
                <div key={e.id} className="card flex flex-col overflow-hidden !p-0">
                  <button className="flex flex-1 flex-col items-start gap-1 text-start active:scale-[0.98]" onClick={() => setEquipmentId(e.id)}>
                    {photoOf(e.id) ? (
                      <img src={photoOf(e.id)} alt="" loading="lazy" className="h-28 w-full object-cover" />
                    ) : (
                      <span className="flex h-28 w-full items-center justify-center bg-brand-50/70 text-5xl dark:bg-white/5" aria-hidden>{e.icon}</span>
                    )}
                    <span className="px-3 pt-1 font-bold leading-tight">{pick(e.name)}</span>
                    <span className="muted px-3 text-xs">
                      {[...new Set(e.exercises.map((x) => x.muscle))].slice(0, 3).map((m) => (MUSCLES[m] ? pick(MUSCLES[m]) : m)).join(L(' · ', ' · '))}
                    </span>
                    <span className="muted px-3 pb-2 text-xs">
                      {L(`${e.exercises.length} exercises`, `${e.exercises.length} تمارين`)}
                      {usage[e.id] ? L(` · ${usage[e.id].sessions} sessions`, ` · ${usage[e.id].sessions} حصص`) : ''}
                    </span>
                  </button>
                  {onAdd && (
                    <button
                      className="flex items-center justify-center gap-1.5 border-t border-brand-900/10 py-2 text-xs font-bold text-brand-700 dark:border-white/10 dark:text-brand-200"
                      onClick={() => onAdd(quickExercise(e))}
                    >
                      <Play size={13} />
                      {addLabel || L('Start', 'ابدأ')}: {pick(quickExercise(e).name)}
                    </button>
                  )}
                </div>
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
