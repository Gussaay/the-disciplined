// The day's commitment: one number per goal (0-1) and the overall share.
import { dayKey } from './dates.js';
import { trainedOn, sessionsThisWeek } from './gym.js';
import { dailyTargets, dayScore, totals } from './nutrition.js';
import { daySummary } from './prayer.js';
import { socialScore } from './social.js';
import { dayProgress } from './english.js';
import { fromKey } from './dates.js';

/**
 * `data` holds the saved values by key. Gym counts fully on a day trained, and
 * also on a rest day once the week's target number of sessions is reached.
 */
export function commitment(data, today = dayKey()) {
  const profile = data.profile || {};
  const weeklyGoal = Number(profile.gymDays) || 3;
  const trained = trainedOn(data.gymSessions, today);
  const week = sessionsThisWeek(data.gymSessions, today);
  const gym = trained ? 1 : Math.min(0.9, week / weeklyGoal);

  const entries = data.foodLog?.[today] || [];
  const food = dayScore(dailyTargets(profile), totals(entries), entries.length > 0);

  const prayer = daySummary(data.prayerLog?.[today]).score;
  const social = socialScore(data.contacts, today);
  const english = dayProgress(data.english, data.english?.log, fromKey(today)).share;

  const parts = { gym, food, prayer, social, english };
  const active = Object.keys(parts).filter((k) => data.settings?.modules?.[k] !== false);
  const overall = active.length ? active.reduce((s, k) => s + parts[k], 0) / active.length : 0;
  return { ...parts, overall, active };
}
