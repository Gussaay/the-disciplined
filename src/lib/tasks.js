// Tasks: the person's own to-dos (typed, spoken, photographed or imported
// from a calendar) next to the app's daily goals. Pure functions only.

const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const PRIORITIES = ['high', 'normal', 'low'];
export const CATEGORIES = ['personal', 'work', 'family', 'health', 'study', 'religion', 'errand'];

/** Where a task belongs on the list: overdue, today, tomorrow, later, someday or done. */
export function bucket(task, today) {
  if (task.done) return 'done';
  if (!task.due) return 'someday';
  if (task.due < today) return 'overdue';
  if (task.due === today) return 'today';
  const t = new Date(`${today}T12:00:00`);
  t.setDate(t.getDate() + 1);
  return task.due === keyOf(t) ? 'tomorrow' : 'later';
}

const RANK = { high: 0, normal: 1, low: 2 };

/** Soonest first, then by time of day, then priority, then newest. */
export function sortTasks(list) {
  return [...list].sort((a, b) =>
    (a.due || '9999').localeCompare(b.due || '9999')
    || (a.time || '99').localeCompare(b.time || '99')
    || (RANK[a.priority] ?? 1) - (RANK[b.priority] ?? 1)
    || (b.created || 0) - (a.created || 0));
}

/** Cleans what the AI sends back into tasks the app can store. */
export function readTasks(json) {
  const raw = Array.isArray(json?.tasks) ? json.tasks : Array.isArray(json) ? json : json?.title ? [json] : [];
  return raw
    .filter((t) => t && String(t.title || '').trim())
    .slice(0, 15)
    .map((t) => ({
      title: String(t.title).trim().slice(0, 140),
      notes: t.notes ? String(t.notes).trim().slice(0, 1000) : '',
      due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : '',
      time: /^\d{2}:\d{2}$/.test(t.time || '') ? t.time : '',
      priority: PRIORITIES.includes(t.priority) ? t.priority : 'normal',
      category: CATEGORIES.includes(t.category) ? t.category : 'personal',
      steps: Array.isArray(t.steps) ? t.steps.map((s) => String(s).trim()).filter(Boolean).slice(0, 10) : [],
    }));
}

const SHAPE = '{"tasks": [{"title": "<short action, starts with a verb>", "notes": "<details, or empty>", "due": "<YYYY-MM-DD or empty>", "time": "<HH:MM 24h or empty>", "priority": "high|normal|low", "category": "personal|work|family|health|study|religion|errand", "steps": ["<optional sub-steps>"]}]}';

function context(today, lang) {
  const d = new Date(`${today}T12:00:00`);
  const weekday = d.toLocaleDateString('en', { weekday: 'long' });
  return [
    `Today is ${weekday} ${today}. Resolve words like "tomorrow", "Friday", "after Asr" or "next week" to a date (and a time when one is said; after Asr is about 16:00, after Maghrib about 18:30, after Isha about 20:00).`,
    `Write titles, notes and steps in ${lang === 'ar' ? 'Arabic' : 'English'}, unless the person wrote in the other language; then keep theirs.`,
    'One task per separate action. Keep the person\'s meaning; do not invent tasks.',
    `Reply as JSON: ${SHAPE}`,
  ].join('\n');
}

export function tasksFromTextPrompt(text, today, lang) {
  return {
    system: 'You turn notes, messages and spoken words into clear to-do tasks. Answer with JSON only.',
    prompt: `The person said or wrote:\n"""${text}"""\n\n${context(today, lang)}`,
  };
}

export function tasksFromPhotoPrompt(hint, today, lang) {
  return {
    system: 'You read photos of notes, whiteboards, letters, lists, invitations and screenshots, and turn what needs doing into clear to-do tasks. Answer with JSON only.',
    prompt: `List the tasks this photo asks for or implies.${hint ? ` The person adds: "${hint}".` : ''}\nIf there is nothing to do in it, reply {"tasks": []}.\n\n${context(today, lang)}`,
  };
}

// ---------------------------------------------------------------------------
// Calendar (.ics / iCal) import
// ---------------------------------------------------------------------------

function unfold(text) {
  return String(text).replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function unescape(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/** An iCal date or date-time as a local Date; `allDay` when it has no time. */
export function icsDate(value, params = '') {
  const m = String(value).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || /VALUE=DATE(?!-)/.test(params)) return { date: new Date(+y, +mo - 1, +d), allDay: true };
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0))), allDay: false };
  // A TZID time is read as the phone's local time, which is right for a
  // calendar in the person's own time zone.
  return { date: new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0)), allDay: false };
}

const DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** Start times of an event between `from` and `to`, following simple repeat rules. */
function occurrences(start, rule, from, to, exdates) {
  if (!rule) return start >= from && start < to ? [start] : [];
  const r = Object.fromEntries(rule.split(';').map((p) => p.split('=')));
  const interval = Number(r.INTERVAL) || 1;
  const until = r.UNTIL ? icsDate(r.UNTIL)?.date : null;
  const count = Number(r.COUNT) || Infinity;
  const byday = r.BYDAY ? r.BYDAY.split(',').map((d) => DAYS[d.slice(-2)]).filter((d) => d !== undefined) : null;
  const out = [];
  let n = 0;
  const cur = new Date(start);
  for (let guard = 0; guard < 2000 && cur < to; guard++) {
    const candidates = [];
    if (r.FREQ === 'WEEKLY' && byday) {
      const weekStart = new Date(cur);
      weekStart.setDate(cur.getDate() - cur.getDay());
      for (const wd of byday.sort()) {
        const c = new Date(weekStart);
        c.setDate(weekStart.getDate() + wd);
        c.setHours(start.getHours(), start.getMinutes(), start.getSeconds());
        if (c >= start) candidates.push(c);
      }
    } else {
      candidates.push(new Date(cur));
    }
    for (const c of candidates) {
      if (until && c > until) return out;
      if (n >= count) return out;
      n += 1;
      if (c >= from && c < to && !exdates.has(c.getTime())) out.push(c);
    }
    if (r.FREQ === 'DAILY') cur.setDate(cur.getDate() + interval);
    else if (r.FREQ === 'WEEKLY') cur.setDate(cur.getDate() + 7 * interval);
    else if (r.FREQ === 'MONTHLY') cur.setMonth(cur.getMonth() + interval);
    else if (r.FREQ === 'YEARLY') cur.setFullYear(cur.getFullYear() + interval);
    else break;
  }
  return out;
}

/**
 * Events from an .ics file between `from` and `to` (Dates), as tasks:
 * { calendarId, title, notes, due, time }. Cancelled events are skipped.
 */
export function parseIcs(text, { from, to }) {
  const lines = unfold(text).split('\n');
  const events = [];
  let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') ev = { exdates: new Set() };
    else if (line === 'END:VEVENT') {
      if (ev) events.push(ev);
      ev = null;
    } else if (ev) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const [name, ...params] = line.slice(0, i).split(';');
      const value = line.slice(i + 1);
      const p = params.join(';');
      if (name === 'SUMMARY') ev.title = unescape(value);
      else if (name === 'DESCRIPTION') ev.notes = unescape(value);
      else if (name === 'LOCATION') ev.location = unescape(value);
      else if (name === 'UID') ev.uid = value;
      else if (name === 'DTSTART') ev.start = icsDate(value, p);
      else if (name === 'RRULE') ev.rule = value;
      else if (name === 'STATUS') ev.status = value;
      else if (name === 'EXDATE') value.split(',').forEach((v) => { const d = icsDate(v, p); if (d) ev.exdates.add(d.date.getTime()); });
    }
  }
  const out = [];
  for (const e of events) {
    if (!e.start || !e.title || e.status === 'CANCELLED') continue;
    for (const at of occurrences(e.start.date, e.rule, from, to, e.exdates)) {
      out.push({
        calendarId: `${e.uid || e.title}@${keyOf(at)}`,
        title: e.title.trim(),
        notes: [e.location, e.notes].filter(Boolean).join('\n').trim().slice(0, 1000),
        due: keyOf(at),
        time: e.start.allDay ? '' : timeOf(at),
      });
    }
  }
  return out.sort((a, b) => (a.due + a.time).localeCompare(b.due + b.time));
}

/** Adds calendar events that are not in the list yet; returns the new list and how many were added. */
export function mergeCalendar(tasks, events, make) {
  const have = new Set(tasks.filter((t) => t.calendarId).map((t) => t.calendarId));
  const fresh = events.filter((e) => !have.has(e.calendarId)).map(make);
  return { tasks: [...tasks, ...fresh], added: fresh.length };
}

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

/** The task as a WhatsApp message. */
export function taskMessage(task, { L, date }) {
  const when = [task.due ? date(new Date(`${task.due}T12:00:00`), { weekday: 'long', day: 'numeric', month: 'long' }) : '', task.time].filter(Boolean).join(' ');
  return [
    `📌 ${task.title}`,
    when && `🗓️ ${when}`,
    task.notes && task.notes,
    ...(task.steps || []).map((s, i) => `${(task.stepsDone || [])[i] ? '✅' : '▫️'} ${s}`),
    L('— sent from The Disciplined', '— مرسلة من تطبيق الملتزم'),
  ].filter(Boolean).join('\n');
}

/** wa.me link: to a number when given, otherwise WhatsApp asks whom to send to. */
export function whatsappShare(text, phone = '') {
  const digits = String(phone).replace(/\D/g, '').replace(/^00/, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
