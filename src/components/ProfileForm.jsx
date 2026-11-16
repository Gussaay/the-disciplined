// The few facts the targets are calculated from. Used on first launch and in Settings.
import { useLang } from '../i18n';
import { Field, NumberInput, Segmented } from './ui';

export default function ProfileForm({ value, onChange }) {
  const { L } = useLang();
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <Field label={L('Your name', 'اسمك')}>
        <input className="input" value={value.name || ''} onChange={(e) => set({ name: e.target.value })} autoComplete="given-name" />
      </Field>
      <Field label={L('Sex', 'الجنس')}>
        <Segmented
          value={value.sex || 'male'}
          onChange={(sex) => set({ sex })}
          options={[{ value: 'male', label: L('Male', 'ذكر') }, { value: 'female', label: L('Female', 'أنثى') }]}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label={L('Age', 'العمر')}>
          <NumberInput value={value.age ?? ''} onChange={(age) => set({ age })} placeholder="30" />
        </Field>
        <Field label={L('Weight, kg', 'الوزن، كجم')}>
          <NumberInput value={value.weight ?? ''} onChange={(weight) => set({ weight })} placeholder="70" />
        </Field>
        <Field label={L('Height, cm', 'الطول، سم')}>
          <NumberInput value={value.height ?? ''} onChange={(height) => set({ height })} placeholder="170" />
        </Field>
      </div>
      <Field label={L('Goal', 'الهدف')}>
        <Segmented
          value={value.goal || 'maintain'}
          onChange={(goal) => set({ goal })}
          options={[
            { value: 'lose', label: L('Lose weight', 'إنقاص الوزن') },
            { value: 'maintain', label: L('Stay fit', 'المحافظة على اللياقة') },
            { value: 'gain', label: L('Build muscle', 'بناء العضلات') },
          ]}
        />
      </Field>
      <Field label={L('Daily activity', 'النشاط اليومي')}>
        <Segmented
          value={value.activity || 'light'}
          onChange={(activity) => set({ activity })}
          options={[
            { value: 'sedentary', label: L('Mostly sitting', 'جلوس أغلب اليوم') },
            { value: 'light', label: L('Light', 'خفيف') },
            { value: 'moderate', label: L('Moderate', 'متوسط') },
            { value: 'active', label: L('Very active', 'نشيط جداً') },
          ]}
        />
      </Field>
      <Field label={L('Training days a week', 'أيام التمرين في الأسبوع')}>
        <Segmented
          value={Number(value.gymDays) || 3}
          onChange={(gymDays) => set({ gymDays })}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        />
      </Field>
    </div>
  );
}
