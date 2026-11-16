// Keeps the phone's reminders in step with the data: prayer times for today
// and tomorrow, and one evening nudge when someone is due a call. Runs when
// the app opens and whenever the settings or the contacts change.
import { useEffect } from 'react';
import { useStore } from './useStore';
import { useLang } from '../i18n';
import { PRAYERS, prayerTimes } from '../lib/prayer';
import { needsContact, sortByDue } from '../lib/social';
import { remindersSupported, setReminders } from '../lib/notify';

const NONE = {};
const EMPTY = [];

export function buildReminders({ prayerSettings, contacts, settings, L, pick, now = new Date() }) {
  const items = [];
  const remind = settings.reminders || {};
  if (remind.prayer !== false) {
    [0, 1].forEach((offset) => {
      const date = new Date(now);
      date.setDate(date.getDate() + offset);
      const times = prayerTimes(prayerSettings, date);
      PRAYERS.forEach((p, i) => {
        items.push({
          id: offset * 10 + i,
          title: L(`Time for ${p.name.en}`, `حان وقت صلاة ${p.name.ar}`),
          body: L('Prayer is better than what you are busy with.', 'حيّ على الصلاة، حيّ على الفلاح.'),
          at: times[p.id],
        });
      });
    });
  }
  if (remind.social !== false) {
    const due = sortByDue(contacts, undefined).filter((x) => needsContact(x.info));
    if (due.length) {
      const at = new Date(now);
      at.setHours(18, 0, 0, 0);
      if (at <= now) at.setDate(at.getDate() + 1);
      const names = due.slice(0, 3).map((x) => x.contact.name).join(L(', ', '، '));
      items.push({
        id: 100,
        title: L('Someone is waiting to hear from you', 'هناك من ينتظر اتصالك'),
        body: due.length > 3 ? L(`${names} and ${due.length - 3} more`, `${names} و${due.length - 3} آخرون`) : names,
        at,
      });
    }
  }
  if (remind.english !== false) {
    const at = new Date(now);
    at.setHours(20, 0, 0, 0);
    if (at <= now) at.setDate(at.getDate() + 1);
    items.push({
      id: 110,
      title: L('English time', 'وقت الإنجليزية'),
      body: L('A few minutes today keep the streak alive.', 'دقائق قليلة اليوم تحافظ على استمرارك.'),
      at,
    });
  }
  return items;
}

export function useReminders() {
  const [settings] = useStore('settings', NONE);
  const [prayerSettings] = useStore('prayerSettings', NONE);
  const [contacts] = useStore('contacts', EMPTY);
  const { L, pick, lang } = useLang();
  useEffect(() => {
    if (!remindersSupported || settings.reminders?.enabled !== true) return;
    setReminders(buildReminders({ prayerSettings, contacts, settings, L, pick })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.reminders, prayerSettings, contacts, lang]);
}
