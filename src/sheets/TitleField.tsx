import { useId, useMemo, useState } from 'react';
import { textInput } from '../components/ui';
import { t } from '../lib/i18n';

/** How many suggested titles the list shows at most. */
export const TITLE_SUGGESTIONS = 5;

/**
 * The Title field of the entry sheet. Nothing sits under it until it is focused: then a short list of recent
 * titles opens right below it (the caller decides which: this category's only once the user picked one, else
 * every recent title). Typing narrows the list to the titles that contain the text; a tap on one fills the
 * field and closes the list. The list never shows more than `TITLE_SUGGESTIONS` lines.
 */
export function TitleField({ value, onChange, placeholder, suggestions, format }: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  /** Recent titles, newest first, with the amount last paid under each. */
  suggestions: [string, number][];
  format: (amount: number) => string;
}) {
  const [focused, setFocused] = useState(false);
  const listId = useId();

  const shown = useMemo(() => {
    const typed = value.trim().toLowerCase();
    return suggestions
      .filter(([text]) => text.toLowerCase() !== typed && (!typed || text.toLowerCase().includes(typed)))
      .slice(0, TITLE_SUGGESTIONS);
  }, [suggestions, value]);
  const open = focused && shown.length > 0;

  return (
    <div>
      <input
        id="tx-title"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        maxLength={60}
        autoComplete="off"
        enterKeyHint="next"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={`${textInput} text-sm`}
      />
      <div className="accordion-grid" data-open={open}>
        <div className="accordion-inner">
          <ul id={listId} role="listbox" aria-label={t('Recent titles')} className="mt-1.5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--inset)]">
            {shown.map(([text, lastAmount]) => (
              <li key={text} role="option" aria-selected={false} className="border-b border-[var(--border)] last:border-b-0">
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  // The mouse-down would blur the field (and close the list) before the click lands.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChange(text)}
                  title={t('{text}, last time {v}', { text, v: format(lastAmount) })}
                  className="pressable flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-bold text-[var(--text)] hover:bg-[var(--hover)]"
                >
                  <span className="min-w-0 truncate">{t(text)}</span>
                  <span className="shrink-0 tabular-nums text-[11px] text-[var(--muted)]">{format(lastAmount)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
