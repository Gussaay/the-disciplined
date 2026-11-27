// The person's own words for a machine ("the boat", a nickname, a word in
// either language): saved once, then search finds the machine by them.
// Keywords live in the `gymKeywords` store: { [toolId]: [words] }.
import { useState } from 'react';
import { Plus, Tag, X } from 'lucide-react';
import { useLang } from '../i18n';
import { addKeyword, removeKeyword } from '../lib/gymTools';

export default function KeywordsEditor({ toolId, keywords, onChange }) {
  const { L } = useLang();
  const [draft, setDraft] = useState('');
  const words = (keywords || {})[toolId] || [];

  const add = () => {
    const next = addKeyword(keywords || {}, toolId, draft);
    if (next !== keywords) onChange(next);
    setDraft('');
  };

  return (
    <div className="rounded-2xl bg-brand-50/60 p-3 dark:bg-white/5">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Tag size={15} />
        {L('Your words for this machine', 'كلماتك الخاصة لهذا الجهاز')}
      </p>
      <p className="muted mt-0.5 text-xs">
        {L('Add a word you call it by, in Arabic or English. Search will find the machine by it.', 'أضف كلمة تناديه بها، بالعربية أو الإنجليزية، وسيجده البحث بها.')}
      </p>
      {words.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {words.map((w) => (
            <span key={w} className="chip !min-h-[32px] gap-1">
              {w}
              <button
                aria-label={L(`Remove ${w}`, `حذف ${w}`)}
                onClick={() => onChange(removeKeyword(keywords || {}, toolId, w))}
                className="flex h-5 w-5 items-center justify-center"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input
          className="input !min-h-[40px] flex-1"
          placeholder={L('e.g. the boat, جهاز السفينة…', 'مثال: السفينة، الجهاز الطويل…')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button className="btn-soft !min-h-[40px]" onClick={add} disabled={!draft.trim()}>
          <Plus size={16} /> {L('Add', 'إضافة')}
        </button>
      </div>
    </div>
  );
}
