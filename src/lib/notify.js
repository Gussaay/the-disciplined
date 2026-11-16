// Reminders on the phone (Android app): prayer times and a daily nudge for
// the people who are due a call. Scheduled on the device, so they arrive with
// no connection. The web app has no background reminders.
import { isNative } from './native';

export const remindersSupported = isNative;
const RANGE = { from: 1000, to: 1999 };

/**
 * Replaces every reminder of the app with `items` = [{ id, title, body, at: Date }].
 * Past times are skipped. Returns how many were set, or -1 when refused.
 */
export async function setReminders(items) {
  if (!isNative) return 0;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return -1;
  const pending = await LocalNotifications.getPending();
  const mine = pending.notifications.filter((n) => n.id >= RANGE.from && n.id <= RANGE.to);
  if (mine.length) await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) });
  const now = Date.now();
  const notifications = items
    .filter((n) => n.at.getTime() > now + 5000)
    .slice(0, 60)
    .map((n) => ({
      id: RANGE.from + n.id,
      title: n.title,
      body: n.body,
      schedule: { at: n.at, allowWhileIdle: true },
    }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return notifications.length;
}

export async function clearReminders() {
  return setReminders([]);
}
