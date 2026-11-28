import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, CalendarDays, Camera, Check, ChevronRight, Circle, CircleCheck, FileUp, Mic, Plus, RefreshCw, Send, Sparkles, Square, Trash2,
} from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Field, Page, Section, Segmented, Sheet, useConfirm, useToast } from '../components/ui';
import { PhotoButton, useAiError } from '../components/Ai';
import QuickAddButton from '../components/QuickAdd';
import { askAI, aiAvailable, transcribe } from '../lib/ai';
import { recordingSupported, startRecording } from '../lib/voice';
import {
  CATEGORIES, PRIORITIES, bucket, keyOf, mergeCalendar, parseIcs, readTasks, sortTasks, taskMessage, tasksFromPhotoPrompt, tasksFromTextPrompt, whatsappShare,
} from '../lib/tasks';
import { dayKey, fromKey, uid } from '../lib/dates';
import { isNative, openUrl } from '../lib/native';
import { TASK_RANGE, setReminders } from '../lib/notify';
import { sessionsThisWeek, trainedOn } from '../lib/gym';
import { PRAYERS } from '../lib/prayer';
import { dayProgress } from '../lib/english';
import { needsContact, sortByDue } from '../lib/social';

const EMPTY = [];
const NONE = {};
const THEME = goalById('tasks');
const PRIORITY_COLOR = { high: '#DC2626', normal: THEME.color, low: '#94A3B8' };

function useNames() {
  const { L } = useLang();
  return {
    priority: { high: L('High', 'عالية'), normal: L('Normal', 'عادية'), low: L('Low', 'منخفضة') },
    category: {
      personal: L('Personal', 'شخصي'), work: L('Work', 'عمل'), family: L('Family', 'عائلة'), health: L('Health', 'صحة'),
      study: L('Study', 'دراسة'), religion: L('Religion', 'دين'), errand: L('Errand', 'مشوار'),
    },
    bucket: {
      overdue: L('Overdue', 'متأخرة'), today: L('Today', 'اليوم'), tomorrow: L('Tomorrow', 'غداً'), later: L('Later', 'لاحقاً'),
      someday: L('No date', 'بلا موعد'), done: L('Done', 'منجزة'),
    },
  };
}

/** The app's own goals for today, as tasks that tick themselves. */
function useAppTasks(today) {
  const { L, pick } = useLang();
  const [profile] = useStore('profile', NONE);
  const [gymSessions] = useStore('gymSessions', EMPTY);
  const [foodLog] = useStore('foodLog', NONE);
  const [prayerLog] = useStore('prayerLog', NONE);
  const [english] = useStore('english', NONE);
  const [contacts] = useStore('contacts', EMPTY);
  const [weightLog] = useStore('weightLog', EMPTY);
  return useMemo(() => {
    const out = [];
    const day = prayerLog[today] || {};
    for (const p of PRAYERS) {
      const s = day[p.id]?.s;
      out.push({ id: `prayer:${p.id}`, title: L(`Pray ${pick(p.name)}`, `صلاة ${pick(p.name)}`), done: s === 'ontime' || s === 'late', to: '/prayer', icon: '🕌' });
    }
    const goal = Number(profile.gymDays) || 3;
    const trained = trainedOn(gymSessions, today);
    if (trained || sessionsThisWeek(gymSessions, today) < goal) {
      out.push({ id: 'gym', title: L('Training session', 'حصة التمرين'), done: trained, to: '/gym', icon: '🏋️' });
    }
    const meals = new Set((foodLog[today] || EMPTY).map((e) => e.meal));
    out.push({ id: 'food', title: L('Log breakfast, lunch and dinner', 'سجّل الفطور والغداء والعشاء'), done: ['breakfast', 'lunch', 'dinner'].every((m) => meals.has(m)), to: '/food', icon: '🥗' });
    const study = dayProgress(english, english.log, fromKey(today));
    out.push({ id: 'english', title: L(`English practice (${study.done}/${study.total})`, `تدريب الإنجليزية (${study.done}/${study.total})`), done: study.done >= study.total, to: '/english', icon: '📘' });
    for (const { contact } of sortByDue(contacts, today).filter((x) => needsContact(x.info)).slice(0, 3)) {
      out.push({ id: `social:${contact.id}`, title: L(`Call ${contact.name}`, `تواصل مع ${contact.name}`), done: contact.last === today, to: '/social', icon: '🤝' });
    }
    const last = weightLog.reduce((a, b) => Math.max(a, b.at || 0), 0);
    const weighedToday = last && keyOf(new Date(last)) === today;
    if (weighedToday || Date.now() - last > 6 * 86400000) {
      out.push({ id: 'weight', title: L('Weekly weigh-in', 'الوزن الأسبوعي'), done: Boolean(weighedToday), to: '/weight', icon: '⚖️' });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, profile, gymSessions, foodLog, prayerLog, english, contacts, weightLog, L]);
}

export default function Tasks() {
  const { L, lang } = useLang();
  const toast = useToast();
  const aiError = useAiError();
  const names = useNames();
  const [tasks, setTasks] = useStore('tasks', EMPTY);
  const [view, setView] = useState('today');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(null);
  const [calendar, setCalendar] = useState(false);
  const [recording, setRecording] = useState(null);
  const today = dayKey();
  const appTasks = useAppTasks(today);

  // Reminders on the phone for tasks with a time.
  useEffect(() => {
    if (!isNative) return;
    const items = tasks
      .filter((t) => !t.done && t.remind && t.due && t.time)
      .map((t, i) => ({ id: i, title: t.title, body: L('Task reminder', 'تذكير بمهمة'), at: new Date(`${t.due}T${t.time}:00`) }));
    setReminders(items, TASK_RANGE).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const make = (t, source) => ({ id: uid(), created: Date.now(), done: false, source, steps: [], stepsDone: [], priority: 'normal', category: 'personal', notes: '', due: '', time: '', ...t });
  const addAll = (list, source) => {
    setTasks([...tasks, ...list.map((t) => make(t, source))]);
    toast(list.length === 1 ? L('Task added', 'أضيفت المهمة') : L(`${list.length} tasks added`, `أضيفت ${list.length} مهام`));
  };

  const formulate = async (request, source) => {
    setBusy(source);
    try {
      const list = readTasks(await askAI({ ...request, json: true }));
      if (!list.length) throw new Error(L('No task found in it. Try again in other words.', 'لم أجد مهمة فيه. حاول بكلمات أخرى.'));
      setDraft({ list, source, off: {} });
    } catch (e) {
      aiError(e);
    } finally {
      setBusy('');
    }
  };

  const quickAdd = () => {
    const t = text.trim();
    if (!t) return;
    addAll([{ title: t, due: view === 'someday' ? '' : today }], 'text');
    setText('');
  };
  const aiAdd = () => {
    const t = text.trim();
    if (!t) return;
    if (!aiAvailable()) {
      quickAdd();
      return;
    }
    formulate(tasksFromTextPrompt(t, today, lang), 'text').then(() => setText(''));
  };

  const toggleVoice = async () => {
    if (recording) {
      const rec = recording;
      setRecording(null);
      setBusy('voice');
      try {
        const audio = await rec.stop();
        if (audio.seconds < 0.8) throw new Error(L('That was too short. Hold on and speak, then tap again.', 'كان قصيراً جداً. تحدث ثم اضغط مجدداً.'));
        const words = await transcribe(audio, lang);
        if (!words) throw new Error(L('Nothing was heard', 'لم يُسمع شيء'));
        await formulate(tasksFromTextPrompt(words, today, lang), 'voice');
      } catch (e) {
        aiError(e);
      } finally {
        setBusy('');
      }
      return;
    }
    if (!aiAvailable()) {
      aiError({ code: 'ai-setup' });
      return;
    }
    try {
      setRecording(await startRecording());
    } catch {
      toast(L('The microphone is not available. Allow it for the app and try again.', 'الميكروفون غير متاح. اسمح به للتطبيق وحاول مجدداً.'), 'error');
    }
  };

  const sorted = useMemo(() => sortTasks(tasks), [tasks]);
  const groups = useMemo(() => {
    const g = { overdue: [], today: [], tomorrow: [], later: [], someday: [], done: [] };
    for (const t of sorted) g[bucket(t, today)].push(t);
    g.done.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    return g;
  }, [sorted, today]);
  const shownBuckets = {
    today: ['overdue', 'today'],
    upcoming: ['tomorrow', 'later'],
    someday: ['someday'],
    done: ['done'],
  }[view];

  const toggle = (t) => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done, doneAt: x.done ? undefined : Date.now() } : x)));
  const appDone = appTasks.filter((t) => t.done).length;
  const mineToday = groups.overdue.length + groups.today.length;

  return (
    <Page
      goal="tasks"
      title={L('Tasks', 'المهام')}
      subtitle={L(`${appDone} of ${appTasks.length} goals · ${mineToday} of your tasks today`, `${appDone} من ${appTasks.length} أهداف · ${mineToday} من مهامك اليوم`)}
      action={
        <div className="flex items-center gap-2">
          <QuickAddButton />
          <button className="btn-soft !min-h-[40px] !px-3 text-sm" onClick={() => setCalendar(true)}>
            <CalendarDays size={16} /> {L('Calendar', 'التقويم')}
          </button>
        </div>
      }
    >
      <div className="card space-y-2">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={text}
            placeholder={L('What needs doing? e.g. call the bank tomorrow at 10', 'ماذا عليك أن تفعل؟ مثل: اتصل بالبنك غداً الساعة 10')}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
          />
          <button className="btn-primary !px-3" aria-label={L('Add', 'إضافة')} disabled={!text.trim()} onClick={quickAdd}>
            <Plus size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          <button className="btn-soft flex-1 !min-h-[40px] text-sm" disabled={!text.trim() || Boolean(busy)} onClick={aiAdd}>
            {busy === 'text' ? <Spin /> : <Sparkles size={16} />} {L('Tidy with AI', 'رتّبها بالذكاء')}
          </button>
          {recordingSupported() && (
            <button className={`${recording ? 'btn bg-red-600 text-white' : 'btn-soft'} flex-1 !min-h-[40px] text-sm`} disabled={Boolean(busy) && busy !== 'voice'} onClick={toggleVoice}>
              {busy === 'voice' ? <Spin /> : recording ? <Square size={16} /> : <Mic size={16} />} {recording ? L('Stop', 'إيقاف') : L('Speak', 'تحدث')}
            </button>
          )}
          <PhotoButton
            className="btn-soft flex-1 !min-h-[40px] text-sm"
            busy={busy === 'photo'}
            onPhoto={(photo) => (aiAvailable() ? formulate({ ...tasksFromPhotoPrompt(text.trim(), today, lang), image: photo }, 'photo') : aiError({ code: 'ai-setup' }))}
          >
            {L('Photo', 'صورة')}
          </PhotoButton>
        </div>
        {recording && <p className="text-center text-sm font-bold text-red-600">{L('Listening… tap Stop when you finish', 'جارٍ الاستماع… اضغط إيقاف عند الانتهاء')}</p>}
      </div>

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'today', label: L('Today', 'اليوم') },
          { value: 'upcoming', label: L('Upcoming', 'القادمة') },
          { value: 'someday', label: L('No date', 'بلا موعد') },
          { value: 'done', label: L('Done', 'المنجزة') },
        ]}
      />

      {view === 'today' && (
        <Section title={L('From your goals', 'من أهدافك')}>
          <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
            {appTasks.map((t) => (
              <Link key={t.id} to={t.to} className="flex items-center gap-3 py-2.5">
                {t.done ? <CircleCheck className="shrink-0" style={{ color: THEME.color }} /> : <Circle className="muted shrink-0" />}
                <span className="text-lg" aria-hidden>{t.icon}</span>
                <span className={`min-w-0 flex-1 truncate ${t.done ? 'muted line-through' : 'font-medium'}`}>{t.title}</span>
                <ChevronRight size={16} className="muted flip-rtl shrink-0" />
              </Link>
            ))}
          </div>
          <p className="muted px-1 text-xs">{L('These tick themselves when you do them in their part of the app.', 'تُعلَّم تلقائياً عندما تنجزها في قسمها من التطبيق.')}</p>
        </Section>
      )}

      {shownBuckets.map((b) => groups[b].length > 0 && (
        <Section key={b} title={`${names.bucket[b]} · ${groups[b].length}`}>
          <div className="card divide-y divide-brand-900/10 !py-0 dark:divide-white/10">
            {groups[b].slice(0, b === 'done' ? 40 : 200).map((t) => (
              <TaskRow key={t.id} task={t} overdue={b === 'overdue'} onToggle={() => toggle(t)} onOpen={() => setEditing(t)} />
            ))}
          </div>
        </Section>
      ))}
      {shownBuckets.every((b) => !groups[b].length) && (
        <p className="card muted text-center text-sm">
          {view === 'done' ? L('Nothing finished yet.', 'لا شيء منجز بعد.') : L('No tasks here. Type, speak or photograph one above, or bring them in from your calendar.', 'لا مهام هنا. اكتب أو تحدث أو صوّر مهمة بالأعلى، أو استوردها من تقويمك.')}
        </p>
      )}

      <Sheet open={Boolean(draft)} onClose={() => setDraft(null)} title={L('Check your tasks', 'راجع مهامك')}>
        {draft && (
          <>
            {draft.list.map((t, i) => (
              <div key={i} className="card space-y-2 !p-3">
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-700" checked={!draft.off[i]} onChange={() => setDraft({ ...draft, off: { ...draft.off, [i]: !draft.off[i] } })} />
                  <input className="input flex-1 !min-h-[40px] font-bold" value={t.title} onChange={(e) => setDraft({ ...draft, list: draft.list.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                </label>
                <div className="flex gap-2 ps-8">
                  <input type="date" className="input !min-h-[40px] flex-1" value={t.due} onChange={(e) => setDraft({ ...draft, list: draft.list.map((x, j) => (j === i ? { ...x, due: e.target.value } : x)) })} />
                  <input type="time" className="input !min-h-[40px] w-28" value={t.time} onChange={(e) => setDraft({ ...draft, list: draft.list.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })} />
                </div>
                <p className="muted ps-8 text-xs">{names.priority[t.priority]} · {names.category[t.category]}{t.steps.length ? ` · ${L(`${t.steps.length} steps`, `${t.steps.length} خطوات`)}` : ''}</p>
                {t.notes && <p className="muted ps-8 text-sm">{t.notes}</p>}
              </div>
            ))}
            <button
              className="btn-primary w-full"
              disabled={draft.list.every((_, i) => draft.off[i])}
              onClick={() => {
                addAll(draft.list.filter((_, i) => !draft.off[i]).map((t) => ({ ...t, remind: Boolean(t.time) })), draft.source);
                setDraft(null);
              }}
            >
              <Check size={18} /> {L('Add these', 'أضف هذه')}
            </button>
          </>
        )}
      </Sheet>

      {editing && (
        <EditTask
          task={editing}
          onClose={() => setEditing(null)}
          onSave={(t) => { setTasks(tasks.map((x) => (x.id === t.id ? t : x))); setEditing(null); }}
          onDelete={(t) => { setTasks(tasks.filter((x) => x.id !== t.id)); setEditing(null); toast(L('Deleted', 'حُذفت')); }}
        />
      )}

      {calendar && <CalendarSheet onClose={() => setCalendar(false)} tasks={tasks} setTasks={setTasks} make={make} />}
    </Page>
  );
}

function Spin() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function TaskRow({ task, overdue, onToggle, onOpen }) {
  const { L, date } = useLang();
  const steps = task.steps?.length || 0;
  const stepsDone = (task.stepsDone || []).filter(Boolean).length;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <button className="flex h-10 w-10 shrink-0 items-center justify-center" aria-label={task.done ? L('Mark not done', 'إلغاء الإنجاز') : L('Mark done', 'تم الإنجاز')} onClick={onToggle}>
        {task.done ? <CircleCheck style={{ color: THEME.color }} /> : <Circle style={{ color: PRIORITY_COLOR[task.priority] || THEME.color }} />}
      </button>
      <button className="min-w-0 flex-1 py-1 text-start" onClick={onOpen}>
        <p className={`truncate ${task.done ? 'muted line-through' : 'font-medium'}`}>{task.title}</p>
        <p className={`truncate text-xs ${overdue ? 'font-bold text-red-600' : 'muted'}`}>
          {[
            task.due && date(new Date(`${task.due}T12:00:00`), { weekday: 'short', day: 'numeric', month: 'short' }),
            task.time,
            steps ? `${stepsDone}/${steps}` : '',
            task.source === 'calendar' ? '📅' : task.source === 'voice' ? '🎙️' : task.source === 'photo' ? '📷' : '',
            task.remind && task.time ? '🔔' : '',
          ].filter(Boolean).join(' · ')}
        </p>
      </button>
    </div>
  );
}

function EditTask({ task, onClose, onSave, onDelete }) {
  const { L, date } = useLang();
  const names = useNames();
  const confirm = useConfirm();
  const [contacts] = useStore('contacts', EMPTY);
  const [t, setT] = useState(task);
  const [newStep, setNewStep] = useState('');
  const set = (patch) => setT({ ...t, ...patch });
  const send = (phone) => openUrl(whatsappShare(taskMessage(t, { L, date }), phone));
  const withPhone = contacts.filter((c) => c.phone);
  return (
    <Sheet
      open
      onClose={onClose}
      title={L('Task', 'المهمة')}
      footer={
        <div className="flex gap-2 pb-3">
          <button
            className="btn-soft !px-3 text-red-600"
            aria-label={L('Delete', 'حذف')}
            onClick={async () => {
              if (await confirm({ title: L('Delete this task?', 'حذف هذه المهمة؟'), body: t.title })) onDelete(t);
            }}
          >
            <Trash2 size={18} />
          </button>
          <button className="btn-primary flex-1" disabled={!t.title.trim()} onClick={() => onSave({ ...t, title: t.title.trim() })}>
            <Check size={18} /> {L('Save', 'حفظ')}
          </button>
        </div>
      }
    >
      <Field label={L('Task', 'المهمة')}>
        <input className="input font-bold" value={t.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="flex gap-2">
        <Field label={L('Date', 'التاريخ')}>
          <input type="date" className="input" value={t.due || ''} onChange={(e) => set({ due: e.target.value })} />
        </Field>
        <Field label={L('Time', 'الوقت')}>
          <input type="time" className="input" value={t.time || ''} onChange={(e) => set({ time: e.target.value })} />
        </Field>
      </div>
      {isNative && t.time && t.due && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={Boolean(t.remind)} onChange={() => set({ remind: !t.remind })} />
          <Bell size={16} /> {L('Remind me at that time', 'ذكّرني في ذلك الوقت')}
        </label>
      )}
      <Segmented value={t.priority || 'normal'} onChange={(priority) => set({ priority })} options={PRIORITIES.map((p) => ({ value: p, label: names.priority[p] }))} />
      <Segmented value={t.category || 'personal'} onChange={(category) => set({ category })} options={CATEGORIES.map((c) => ({ value: c, label: names.category[c] }))} />
      <Field label={L('Notes', 'ملاحظات')}>
        <textarea className="input min-h-[72px]" value={t.notes || ''} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
      <div className="card space-y-1 !p-3">
        <p className="text-sm font-bold">{L('Steps', 'الخطوات')}</p>
        {(t.steps || []).map((s, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-700"
              checked={Boolean((t.stepsDone || [])[i])}
              onChange={() => {
                const done = [...(t.stepsDone || [])];
                done[i] = !done[i];
                set({ stepsDone: done });
              }}
            />
            <span className={`flex-1 ${(t.stepsDone || [])[i] ? 'muted line-through' : ''}`}>{s}</span>
            <button className="muted px-2" aria-label={L('Remove step', 'حذف الخطوة')} onClick={() => set({ steps: t.steps.filter((_, j) => j !== i), stepsDone: (t.stepsDone || []).filter((_, j) => j !== i) })}>×</button>
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <input className="input !min-h-[40px] flex-1" value={newStep} placeholder={L('Add a step', 'أضف خطوة')} onChange={(e) => setNewStep(e.target.value)} />
          <button className="btn-soft !min-h-[40px] !px-3" disabled={!newStep.trim()} onClick={() => { set({ steps: [...(t.steps || []), newStep.trim()] }); setNewStep(''); }}>
            <Plus size={16} />
          </button>
        </div>
      </div>
      <div className="card space-y-2 !p-3">
        <p className="text-sm font-bold">{L('Send by WhatsApp', 'أرسل عبر واتساب')}</p>
        <button className="btn-soft w-full" onClick={() => send('')}>
          <Send size={16} /> {L('Choose the chat in WhatsApp', 'اختر المحادثة في واتساب')}
        </button>
        {withPhone.length > 0 && (
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            {withPhone.slice(0, 20).map((c) => (
              <button key={c.id} className="chip shrink-0" onClick={() => send(c.phone)}>{c.name}</button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Bring in events from Google Calendar (or any calendar) as tasks. */
function CalendarSheet({ onClose, tasks, setTasks, make }) {
  const { L } = useLang();
  const toast = useToast();
  const [settings, setSettings] = useStore('taskSettings', NONE);
  const [url, setUrl] = useState(settings.icsUrl || '');
  const [busy, setBusy] = useState(false);
  const file = useRef();
  const range = () => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    return { from, to };
  };
  const bring = (text) => {
    const events = parseIcs(text, range());
    const { tasks: next, added } = mergeCalendar(tasks, events, (e) => make({ ...e, remind: Boolean(e.time) }, 'calendar'));
    setTasks(next);
    toast(added ? L(`${added} events added as tasks`, `أضيف ${added} موعداً كمهام`) : L('Nothing new in the next two weeks', 'لا جديد في الأسبوعين القادمين'));
  };
  const sync = async () => {
    const link = url.trim().replace(/^webcal:/i, 'https:');
    if (!/^https:\/\//i.test(link)) {
      toast(L('Paste the calendar’s iCal address (starts with https)', 'الصق عنوان iCal للتقويم (يبدأ بـ https)'), 'error');
      return;
    }
    setBusy(true);
    try {
      let text;
      if (isNative) {
        const { CapacitorHttp } = await import('@capacitor/core');
        const res = await CapacitorHttp.get({ url: link, responseType: 'text' });
        if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
        text = typeof res.data === 'string' ? res.data : String(res.data);
      } else {
        const res = await fetch(link);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        text = await res.text();
      }
      if (!/BEGIN:VCALENDAR/.test(text)) throw new Error(L('That address did not return a calendar', 'هذا العنوان لم يُرجع تقويماً'));
      setSettings({ ...settings, icsUrl: link, synced: Date.now() });
      bring(text);
    } catch (e) {
      toast(isNative ? e.message : L('The browser blocked this. Use the Android app, or import an .ics file.', 'منع المتصفح ذلك. استخدم تطبيق أندرويد أو استورد ملف ‎.ics‎.'), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open onClose={onClose} title={L('From my calendar', 'من تقويمي')}>
      <p className="text-sm">
        {L(
          'Events of the next two weeks come in as tasks, once each. In Google Calendar on a computer: Settings → your calendar → “Secret address in iCal format”. Copy it and paste it here.',
          'تدخل مواعيد الأسبوعين القادمين كمهام، مرة واحدة لكل موعد. في تقويم Google على الكمبيوتر: الإعدادات ← تقويمك ← «العنوان السري بتنسيق iCal». انسخه والصقه هنا.',
        )}
      </p>
      <Field label={L('iCal address', 'عنوان iCal')}>
        <input className="input" dir="ltr" value={url} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" onChange={(e) => setUrl(e.target.value)} />
      </Field>
      <button className="btn-primary w-full" disabled={busy || !url.trim()} onClick={sync}>
        {busy ? <Spin /> : <RefreshCw size={18} />} {L('Bring in my events', 'استورد مواعيدي')}
      </button>
      {settings.synced && <p className="muted text-xs">{L('The address is saved; open this again any time to bring in new events.', 'العنوان محفوظ؛ افتح هذا متى شئت لاستيراد المواعيد الجديدة.')}</p>}
      <div className="flex items-center gap-2 py-1">
        <div className="h-px flex-1 bg-brand-900/10 dark:bg-white/10" />
        <span className="muted text-xs">{L('or', 'أو')}</span>
        <div className="h-px flex-1 bg-brand-900/10 dark:bg-white/10" />
      </div>
      <input
        ref={file}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) bring(await f.text());
        }}
      />
      <button className="btn-soft w-full" onClick={() => file.current?.click()}>
        <FileUp size={18} /> {L('Import an .ics file', 'استورد ملف ‎.ics‎')}
      </button>
      <p className="muted flex items-center gap-1 text-xs"><Camera size={12} /> {L('Tip: a photo of an invitation or a poster also works from the Photo button.', 'نصيحة: صورة دعوة أو إعلان تعمل أيضاً من زر الصورة.')}</p>
    </Sheet>
  );
}
