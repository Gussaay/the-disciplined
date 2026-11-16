// Prayer times (computed on the device with the adhan library, so they work
// offline), the Qibla direction, and the scoring of the prayer log.
//
// prayerLog[day] = { fajr: { s: 'ontime' | 'late' | 'missed', m: true when prayed in the mosque }, ... }
import { CalculationMethod, Coordinates, Madhab, PrayerTimes, Qibla } from 'adhan';
import { dayKey, lastDays, streak } from './dates.js';

export const PRAYERS = [
  { id: 'fajr', name: { en: 'Fajr', ar: 'الفجر' } },
  { id: 'dhuhr', name: { en: 'Dhuhr', ar: 'الظهر' } },
  { id: 'asr', name: { en: 'Asr', ar: 'العصر' } },
  { id: 'maghrib', name: { en: 'Maghrib', ar: 'المغرب' } },
  { id: 'isha', name: { en: 'Isha', ar: 'العشاء' } },
];

export const METHODS = [
  { id: 'UmmAlQura', name: { en: 'Umm al-Qura (Makkah)', ar: 'أم القرى (مكة)' } },
  { id: 'Egyptian', name: { en: 'Egyptian General Authority', ar: 'الهيئة المصرية العامة للمساحة' } },
  { id: 'MuslimWorldLeague', name: { en: 'Muslim World League', ar: 'رابطة العالم الإسلامي' } },
  { id: 'Dubai', name: { en: 'Dubai', ar: 'دبي' } },
  { id: 'Qatar', name: { en: 'Qatar', ar: 'قطر' } },
  { id: 'Kuwait', name: { en: 'Kuwait', ar: 'الكويت' } },
  { id: 'Karachi', name: { en: 'Karachi', ar: 'كراتشي' } },
  { id: 'Turkey', name: { en: 'Turkey (Diyanet)', ar: 'تركيا (ديانت)' } },
  { id: 'NorthAmerica', name: { en: 'North America (ISNA)', ar: 'أمريكا الشمالية (إسنا)' } },
  { id: 'MoonsightingCommittee', name: { en: 'Moonsighting Committee', ar: 'لجنة رؤية الهلال' } },
];

// For choosing a place by hand when the device location is not available.
export const CITIES = [
  ['Khartoum', 'الخرطوم', 15.5007, 32.5599, 'Egyptian'],
  ['Omdurman', 'أم درمان', 15.6445, 32.4777, 'Egyptian'],
  ['Port Sudan', 'بورتسودان', 19.6158, 37.2164, 'Egyptian'],
  ['Wad Madani', 'ود مدني', 14.4012, 33.5199, 'Egyptian'],
  ['Atbara', 'عطبرة', 17.7022, 33.9864, 'Egyptian'],
  ['Kassala', 'كسلا', 15.4510, 36.4000, 'Egyptian'],
  ['El Obeid', 'الأبيض', 13.1842, 30.2167, 'Egyptian'],
  ['Makkah', 'مكة المكرمة', 21.4225, 39.8262, 'UmmAlQura'],
  ['Madinah', 'المدينة المنورة', 24.4672, 39.6112, 'UmmAlQura'],
  ['Riyadh', 'الرياض', 24.7136, 46.6753, 'UmmAlQura'],
  ['Jeddah', 'جدة', 21.4858, 39.1925, 'UmmAlQura'],
  ['Dammam', 'الدمام', 26.4207, 50.0888, 'UmmAlQura'],
  ['Dubai', 'دبي', 25.2048, 55.2708, 'Dubai'],
  ['Abu Dhabi', 'أبوظبي', 24.4539, 54.3773, 'Dubai'],
  ['Sharjah', 'الشارقة', 25.3463, 55.4209, 'Dubai'],
  ['Doha', 'الدوحة', 25.2854, 51.5310, 'Qatar'],
  ['Kuwait City', 'مدينة الكويت', 29.3759, 47.9774, 'Kuwait'],
  ['Muscat', 'مسقط', 23.5880, 58.3829, 'UmmAlQura'],
  ['Manama', 'المنامة', 26.2285, 50.5860, 'UmmAlQura'],
  ['Cairo', 'القاهرة', 30.0444, 31.2357, 'Egyptian'],
  ['Alexandria', 'الإسكندرية', 31.2001, 29.9187, 'Egyptian'],
  ['Amman', 'عمّان', 31.9454, 35.9284, 'MuslimWorldLeague'],
  ['Baghdad', 'بغداد', 33.3152, 44.3661, 'MuslimWorldLeague'],
  ['Istanbul', 'إسطنبول', 41.0082, 28.9784, 'Turkey'],
  ['Juba', 'جوبا', 4.8594, 31.5713, 'Egyptian'],
  ['Addis Ababa', 'أديس أبابا', 9.0054, 38.7636, 'Egyptian'],
  ['Nairobi', 'نيروبي', -1.2921, 36.8219, 'Egyptian'],
  ['Kampala', 'كمبالا', 0.3476, 32.5825, 'Egyptian'],
  ['London', 'لندن', 51.5074, -0.1278, 'MoonsightingCommittee'],
  ['New York', 'نيويورك', 40.7128, -74.0060, 'NorthAmerica'],
].map(([en, ar, lat, lng, method]) => ({ name: { en, ar }, lat, lng, method }));

export const DEFAULT_PLACE = CITIES[0];

function params(settings = {}) {
  const make = CalculationMethod[settings.method] || CalculationMethod.Egyptian;
  const p = make();
  p.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

/** The five prayer times (and sunrise) of a day, as Date objects. */
export function prayerTimes(settings = {}, date = new Date()) {
  const lat = Number(settings.lat ?? DEFAULT_PLACE.lat);
  const lng = Number(settings.lng ?? DEFAULT_PLACE.lng);
  const t = new PrayerTimes(new Coordinates(lat, lng), date, params(settings));
  const adjust = settings.adjust || {};
  const shift = (d, id) => new Date(d.getTime() + (Number(adjust[id]) || 0) * 60000);
  return {
    fajr: shift(t.fajr, 'fajr'),
    sunrise: t.sunrise,
    dhuhr: shift(t.dhuhr, 'dhuhr'),
    asr: shift(t.asr, 'asr'),
    maghrib: shift(t.maghrib, 'maghrib'),
    isha: shift(t.isha, 'isha'),
  };
}

/** Degrees clockwise from north towards the Kaaba. */
export function qiblaDirection(settings = {}) {
  return Qibla(new Coordinates(Number(settings.lat ?? DEFAULT_PLACE.lat), Number(settings.lng ?? DEFAULT_PLACE.lng)));
}

/**
 * Where the day stands at `now`: the prayer whose time is current (its time
 * has come and the next has not), and the next one with the time left.
 */
export function prayerNow(times, now = new Date(), tomorrowFajr) {
  const order = PRAYERS.map((p) => p.id);
  let current = null;
  let next = null;
  for (const id of order) {
    if (times[id] <= now) current = id;
    else if (!next) next = { id, at: times[id] };
  }
  if (!next && tomorrowFajr) next = { id: 'fajr', at: tomorrowFajr };
  // After sunrise Fajr's own time is over; nothing is "current" until Dhuhr.
  if (current === 'fajr' && times.sunrise <= now) current = null;
  return { current, next, msLeft: next ? next.at - now : 0 };
}

const STATUS_POINTS = { ontime: 1, late: 0.5, missed: 0 };

export function daySummary(day = {}) {
  let prayed = 0;
  let ontime = 0;
  let mosque = 0;
  let points = 0;
  for (const { id } of PRAYERS) {
    const entry = day[id];
    if (!entry) continue;
    if (entry.s === 'ontime' || entry.s === 'late') prayed += 1;
    if (entry.s === 'ontime') ontime += 1;
    if (entry.m && entry.s !== 'missed') mosque += 1;
    points += STATUS_POINTS[entry.s] || 0;
  }
  return { prayed, ontime, mosque, score: points / PRAYERS.length };
}

/** Days in a row with all five prayed. */
export const prayerStreak = (log, today = dayKey()) =>
  streak((key) => daySummary(log?.[key]).prayed === PRAYERS.length, today);

export function weekSummary(log, days = 7, today = dayKey()) {
  const keys = lastDays(days, today);
  const rows = keys.map((key) => ({ key, ...daySummary(log?.[key]) }));
  const total = days * PRAYERS.length;
  return {
    rows,
    prayed: rows.reduce((s, r) => s + r.prayed, 0),
    ontime: rows.reduce((s, r) => s + r.ontime, 0),
    mosque: rows.reduce((s, r) => s + r.mosque, 0),
    total,
  };
}

/** "2h 05m" / "12m" until a time. */
export function countdown(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, '0')}` : `${m}`;
}
