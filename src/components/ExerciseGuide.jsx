// Everything about doing one exercise: the muscles it works on a body map,
// an animated figure of the movement, setting the machine up and the steps.
import { useLang } from '../i18n';
import { goalById } from '../config';
import { EXERCISES } from '../data/equipment';
import { REGIONS, SETUP, stepsOf, targetsOf } from '../data/exerciseGuide';
import MuscleMap from './MuscleMap';
import ExerciseMotion from './ExerciseMotion';

const COLOR = goalById('gym')?.color || '#DC2626';

export default function ExerciseGuide({ exercise, showSetup = true }) {
  const { L, pick } = useLang();
  const id = exercise.exerciseId || exercise.id;
  const { primary, secondary, motion } = targetsOf(id, exercise.muscle);
  const how = exercise.how ? (typeof exercise.how === 'string' ? exercise.how : pick(exercise.how)) : pick(EXERCISES[id]?.how || { en: '', ar: '' });
  const steps = stepsOf(how);
  const equipment = exercise.equipment || EXERCISES[id]?.equipment;
  const setup = showSetup ? SETUP[equipment] || [] : [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {motion && (
          <div className="rounded-2xl bg-brand-50/70 p-2 dark:bg-white/5">
            <ExerciseMotion motion={motion} color={COLOR} className="aspect-square" />
            <p className="muted text-center text-[11px]">{L('Tap to pause', 'اضغط للإيقاف')}</p>
          </div>
        )}
        <div className={`rounded-2xl bg-brand-50/70 p-2 dark:bg-white/5 ${motion ? '' : 'col-span-2'}`}>
          <MuscleMap primary={primary} secondary={secondary} color={COLOR} className={motion ? 'aspect-square w-full' : 'mx-auto h-44'} />
        </div>
      </div>

      {(primary.length > 0 || secondary.length > 0) && (
        <div className="space-y-1 text-sm">
          {primary.length > 0 && (
            <p>
              <span className="me-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR }} />
              <span className="font-bold">{L('Main: ', 'الأساسية: ')}</span>
              {primary.map((r) => pick(REGIONS[r])).join(L(', ', '، '))}
            </p>
          )}
          {secondary.length > 0 && (
            <p>
              <span className="me-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR, opacity: 0.4 }} />
              <span className="font-bold">{L('Helping: ', 'المساعدة: ')}</span>
              {secondary.map((r) => pick(REGIONS[r])).join(L(', ', '، '))}
            </p>
          )}
        </div>
      )}

      {setup.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-bold">{L('Set up the machine', 'اضبط الجهاز')}</p>
          <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed">
            {setup.map(([en, ar]) => <li key={en}>{L(en, ar)}</li>)}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-bold">{L('How to do it', 'طريقة الأداء')}</p>
          <ol className="space-y-1.5 text-sm leading-relaxed">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: COLOR }}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
