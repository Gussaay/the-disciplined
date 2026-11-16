// Keeping in touch. A contact is
//   { id, name, group: 'family' | 'relatives' | 'friends' | 'others', phone, every: days, last: 'YYYY-MM-DD', notes, history: [{ date, type }] }
import { dayKey, daysBetween } from './dates.js';

export const GROUPS = [
  { id: 'family', name: { en: 'Family', ar: 'الأسرة' }, icon: '🏠' },
  { id: 'relatives', name: { en: 'Relatives', ar: 'الأرحام' }, icon: '🌳' },
  { id: 'friends', name: { en: 'Friends', ar: 'الأصدقاء' }, icon: '🤝' },
  { id: 'others', name: { en: 'Neighbours and others', ar: 'الجيران وآخرون' }, icon: '👋' },
];

export const FREQUENCIES = [
  { days: 1, name: { en: 'Every day', ar: 'كل يوم' } },
  { days: 3, name: { en: 'Every 3 days', ar: 'كل 3 أيام' } },
  { days: 7, name: { en: 'Every week', ar: 'كل أسبوع' } },
  { days: 14, name: { en: 'Every 2 weeks', ar: 'كل أسبوعين' } },
  { days: 30, name: { en: 'Every month', ar: 'كل شهر' } },
  { days: 90, name: { en: 'Every 3 months', ar: 'كل 3 أشهر' } },
];

export const CONTACT_TYPES = [
  { id: 'call', name: { en: 'Call', ar: 'اتصال' }, icon: '📞' },
  { id: 'visit', name: { en: 'Visit', ar: 'زيارة' }, icon: '🚪' },
  { id: 'message', name: { en: 'Message', ar: 'رسالة' }, icon: '💬' },
];

/**
 * Where a contact stands today.
 *   never    not contacted yet (counts as due)
 *   overdue  the interval has passed
 *   due      due today
 *   soon     due within a fifth of the interval (at least one day)
 *   ok       otherwise
 */
export function dueInfo(contact, today = dayKey()) {
  const every = Math.max(1, Number(contact.every) || 7);
  if (!contact.last) return { status: 'never', since: null, left: 0, every };
  const since = Math.max(0, daysBetween(contact.last, today));
  const left = every - since;
  const status = left < 0 ? 'overdue' : left === 0 ? 'due' : left <= Math.max(1, Math.round(every / 5)) ? 'soon' : 'ok';
  return { status, since, left, every };
}

const ORDER = { overdue: 0, never: 1, due: 2, soon: 3, ok: 4 };

/** Most urgent first: the longest overdue relative to their interval leads. */
export function sortByDue(contacts, today = dayKey()) {
  return [...(contacts || [])]
    .map((c) => ({ contact: c, info: dueInfo(c, today) }))
    .sort((a, b) => ORDER[a.info.status] - ORDER[b.info.status] || a.info.left / a.info.every - b.info.left / b.info.every);
}

export const needsContact = (info) => ['overdue', 'never', 'due'].includes(info.status);

/** Records a contact today (or on `date`) and keeps the last 50 in the history. */
export function logContact(contact, type = 'call', date = dayKey(), note = '') {
  const history = [{ date, type, ...(note ? { note } : {}) }, ...(contact.history || [])].slice(0, 50);
  const last = !contact.last || date > contact.last ? date : contact.last;
  return { ...contact, last, history };
}

/** Share of contacts that are within their interval, 0-1 (1 when there are none). */
export function socialScore(contacts, today = dayKey()) {
  const list = contacts || [];
  if (!list.length) return 1;
  const good = list.filter((c) => !['overdue', 'never'].includes(dueInfo(c, today).status)).length;
  return good / list.length;
}

/** Digits only, for wa.me links. A leading 00 becomes nothing; + is dropped. */
export function whatsappLink(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '').replace(/^00/, '');
  return digits ? `https://wa.me/${digits}` : '';
}
