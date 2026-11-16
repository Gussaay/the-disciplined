import { useMemo, useState } from 'react';
import { Check, MessageCircle, Pencil, Phone, Plus, Trash2, UserPlus } from 'lucide-react';
import { useLang } from '../i18n';
import { useStore } from '../hooks/useStore';
import { goalById } from '../config';
import { Empty, Field, Page, Segmented, Sheet, useToast } from '../components/ui';
import { CONTACT_TYPES, FREQUENCIES, GROUPS, dueInfo, logContact, needsContact, sortByDue, whatsappLink } from '../lib/social';
import { dayKey, fromKey, lastDays, uid } from '../lib/dates';
import { openUrl } from '../lib/native';

const EMPTY = [];
const COLOR = goalById('social').color;
const BLANK = { name: '', group: 'family', phone: '', every: 7, notes: '' };

const TONE = {
  overdue: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  never: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  due: 'bg-gold-100 text-gold-600 dark:bg-gold-500/20 dark:text-gold-300',
  soon: 'bg-gold-100 text-gold-600 dark:bg-gold-500/20 dark:text-gold-300',
  ok: 'bg-brand-50 text-brand-700 dark:bg-white/10 dark:text-brand-100',
};

export default function Social() {
  const { L, pick, date } = useLang();
  const toast = useToast();
  const [contacts, setContacts] = useStore('contacts', EMPTY);
  const [group, setGroup] = useState('all');
  const [editing, setEditing] = useState(null);
  const [logging, setLogging] = useState(null);

  const today = dayKey();
  const sorted = useMemo(() => sortByDue(contacts, today), [contacts, today]);
  const shown = sorted.filter((x) => group === 'all' || x.contact.group === group);
  const due = sorted.filter((x) => needsContact(x.info)).length;
  const week = new Set(lastDays(7, today));
  const reached = contacts.filter((c) => (c.history || []).some((h) => week.has(h.date))).length;

  const statusText = (info) => {
    if (info.status === 'never') return L('Not contacted yet', 'لم تتواصل معه بعد');
    if (info.status === 'overdue') return L(`${-info.left} days overdue`, `متأخر ${-info.left} يوماً`);
    if (info.status === 'due') return L('Due today', 'موعده اليوم');
    return L(`In ${info.left} days`, `بعد ${info.left} يوماً`);
  };

  const saveContact = () => {
    const clean = { ...editing, name: editing.name.trim(), every: Number(editing.every) || 7 };
    if (clean.id) setContacts(contacts.map((c) => (c.id === clean.id ? clean : c)));
    else setContacts([{ ...clean, id: uid(), history: [] }, ...contacts]);
    setEditing(null);
  };

  const record = (contact, type) => {
    setContacts(contacts.map((c) => (c.id === contact.id ? logContact(c, type, today) : c)));
    setLogging(null);
    toast(L(`Recorded. Next reminder in ${contact.every} days.`, `تم التسجيل. التذكير القادم بعد ${contact.every} يوماً.`));
  };

  // Android Chrome can hand over a name and number from the phone book.
  const canPick = typeof navigator !== 'undefined' && 'contacts' in navigator && 'select' in (navigator.contacts || {});
  const pickFromPhone = async () => {
    try {
      const [person] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (person) setEditing({ ...BLANK, ...editing, name: person.name?.[0] || '', phone: person.tel?.[0] || '' });
    } catch { /* cancelled */ }
  };

  return (
    <Page
      title={L('Keeping in touch', 'صلة الرحم والتواصل')}
      subtitle={
        contacts.length
          ? due
            ? L(`${due} waiting to hear from you`, `${due} بانتظار تواصلك`)
            : L('Everyone is up to date', 'تواصلت مع الجميع')
          : undefined
      }
      action={
        <button className="btn-primary !px-3" onClick={() => setEditing({ ...BLANK })} aria-label={L('Add a person', 'إضافة شخص')}>
          <UserPlus size={20} />
        </button>
      }
    >
      {!contacts.length ? (
        <Empty
          icon="🤝"
          title={L('Who do you want to stay close to?', 'من تحب أن تبقى على صلة به؟')}
          action={<button className="btn-primary mt-2" onClick={() => setEditing({ ...BLANK })}><Plus size={18} /> {L('Add the first person', 'أضف أول شخص')}</button>}
        >
          {L(
            'Add parents, relatives and friends and say how often you want to reach each one. The app tells you who is due and keeps the history.',
            'أضف الوالدين والأقارب والأصدقاء وحدد كم مرة تريد التواصل مع كل منهم. يخبرك التطبيق بمن حان موعده ويحفظ السجل.',
          )}
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [due, L('due now', 'حان موعدهم'), due ? '#DC2626' : COLOR],
              [reached, L('reached this week', 'تواصلت معهم هذا الأسبوع'), COLOR],
              [contacts.length, L('people', 'شخصاً'), COLOR],
            ].map(([value, label, color]) => (
              <div key={label} className="card !p-3">
                <p className="tabular text-2xl font-extrabold" style={{ color }}>{value}</p>
                <p className="muted text-xs">{label}</p>
              </div>
            ))}
          </div>

          <Segmented
            value={group}
            onChange={setGroup}
            options={[{ value: 'all', label: L('All', 'الكل') }, ...GROUPS.map((g) => ({ value: g.id, label: pick(g.name), icon: g.icon }))]}
          />

          <div className="space-y-2">
            {shown.map(({ contact, info }) => {
              const g = GROUPS.find((x) => x.id === contact.group) || GROUPS[3];
              const wa = whatsappLink(contact.phone);
              return (
                <div key={contact.id} className="card !p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl" style={{ background: `${COLOR}1F` }} aria-hidden>{g.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{contact.name}</p>
                      <p className="muted text-sm">
                        {pick(g.name)} · {pick(FREQUENCIES.find((f) => f.days === contact.every)?.name) || L(`every ${contact.every} days`, `كل ${contact.every} يوماً`)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TONE[info.status]}`}>{statusText(info)}</span>
                        {contact.last && <span className="muted">{L('last: ', 'آخر تواصل: ')}{date(fromKey(contact.last), { day: 'numeric', month: 'short' })}</span>}
                      </p>
                      {contact.notes && <p className="muted mt-1 text-sm">{contact.notes}</p>}
                    </div>
                    <button className="muted flex h-10 w-10 shrink-0 items-center justify-center" aria-label={L('Edit', 'تعديل')} onClick={() => setEditing(contact)}>
                      <Pencil size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {contact.phone && (
                      <button className="btn-soft !min-h-[40px] flex-1" onClick={() => openUrl(`tel:${contact.phone.replace(/\s/g, '')}`)}>
                        <Phone size={16} /> {L('Call', 'اتصال')}
                      </button>
                    )}
                    {wa && (
                      <button className="btn-soft !min-h-[40px] flex-1" onClick={() => openUrl(wa)}>
                        <MessageCircle size={16} /> {L('WhatsApp', 'واتساب')}
                      </button>
                    )}
                    <button className="btn !min-h-[40px] flex-1 text-white" style={{ background: COLOR }} onClick={() => setLogging(contact)}>
                      <Check size={16} /> {L('Done', 'تم التواصل')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Sheet open={Boolean(logging)} onClose={() => setLogging(null)} title={logging ? L(`How did you reach ${logging.name}?`, `كيف تواصلت مع ${logging.name}؟`) : ''}>
        <div className="grid grid-cols-3 gap-2">
          {CONTACT_TYPES.map((t) => (
            <button key={t.id} className="card flex flex-col items-center gap-1 !p-4 active:scale-[0.97]" onClick={() => record(logging, t.id)}>
              <span className="text-3xl" aria-hidden>{t.icon}</span>
              <span className="font-bold">{pick(t.name)}</span>
            </button>
          ))}
        </div>
        {logging?.history?.length > 0 && (
          <div>
            <p className="eyebrow mb-1">{L('History', 'السجل')}</p>
            <div className="card divide-y divide-brand-900/10 !py-0 text-sm dark:divide-white/10">
              {logging.history.slice(0, 10).map((h, i) => {
                const t = CONTACT_TYPES.find((x) => x.id === h.type);
                return (
                  <p key={i} className="flex justify-between py-2">
                    <span>{t?.icon} {pick(t?.name)}</span>
                    <span className="muted">{date(fromKey(h.date), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? L('Edit person', 'تعديل الشخص') : L('Add a person', 'إضافة شخص')}
        footer={
          <div className="flex gap-2">
            {editing?.id && (
              <button
                className="btn-danger"
                aria-label={L('Delete', 'حذف')}
                onClick={() => {
                  setContacts(contacts.filter((c) => c.id !== editing.id));
                  setEditing(null);
                }}
              >
                <Trash2 size={18} />
              </button>
            )}
            <button className="btn-primary flex-1" disabled={!editing?.name?.trim()} onClick={saveContact}>
              {L('Save', 'حفظ')}
            </button>
          </div>
        }
      >
        {editing && (
          <>
            {canPick && !editing.id && (
              <button className="btn-soft w-full" onClick={pickFromPhone}>
                <UserPlus size={18} /> {L('Pick from my phone contacts', 'اختر من جهات اتصال هاتفي')}
              </button>
            )}
            <Field label={L('Name', 'الاسم')}>
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label={L('Relation', 'الصلة')}>
              <Segmented value={editing.group} onChange={(g) => setEditing({ ...editing, group: g })} options={GROUPS.map((g) => ({ value: g.id, label: pick(g.name), icon: g.icon }))} />
            </Field>
            <Field label={L('How often', 'كم مرة')}>
              <Segmented value={Number(editing.every)} onChange={(every) => setEditing({ ...editing, every })} options={FREQUENCIES.map((f) => ({ value: f.days, label: pick(f.name) }))} />
            </Field>
            <Field label={L('Phone, with country code', 'الهاتف، مع رمز الدولة')} hint={L('Used for the Call and WhatsApp buttons.', 'يُستخدم لزرّي الاتصال وواتساب.')}>
              <input className="input" dir="ltr" type="tel" inputMode="tel" placeholder="+249…" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </Field>
            <Field label={L('Notes', 'ملاحظات')}>
              <input className="input" placeholder={L('e.g. ask about the surgery', 'مثال: اسأل عن العملية')} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
            </Field>
          </>
        )}
      </Sheet>
    </Page>
  );
}
