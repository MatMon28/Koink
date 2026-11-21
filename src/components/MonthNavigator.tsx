import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, CornerUpLeft } from 'lucide-react';
import { useBackLayer } from '../lib/back';
import { addMonths, currentMonth, formatMonth, MONTH_SHORT, monthOf, pad } from '../lib/dates';
import { useApp } from '../lib/store';
import { t } from '../lib/i18n';

/** Month changer: previous / next arrows, a pill that opens a year grid, and a way back to this month. */
export function MonthNavigator() {
  const { data, selectedMonth, setSelectedMonth } = useApp();
  const thisMonth = currentMonth();
  const isCurrent = selectedMonth === thisMonth;
  const label = formatMonth(selectedMonth);
  const ultra = data.settings.ultraMinimal;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => Number(selectedMonth.slice(0, 4)));

  const monthsWithData = useMemo(() => new Set(data.txs.map((tx) => monthOf(tx.date))), [data.txs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useBackLayer(open, () => setOpen(false));

  // Swiping the row does what the arrows do: swipe left = next month, swipe right = previous month.
  const swipe = useRef<{ id: number; x: number; y: number; done: boolean } | null>(null);
  const swallowClick = useRef(false);
  const shift = (step: number) => setSelectedMonth(addMonths(selectedMonth, step));
  const swipeHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      swallowClick.current = false;
      if (!event.isPrimary || event.button !== 0 || open || event.pointerType === 'mouse') {
        swipe.current = null;
        return;
      }
      swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY, done: false };
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const s = swipe.current;
      if (!s || s.done || s.id !== event.pointerId) return;
      const dx = event.clientX - s.x;
      const dy = event.clientY - s.y;
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        swipe.current = null;
        return;
      }
      if (Math.abs(dx) < 24 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      s.done = true;
      swallowClick.current = true; // the drag must not also tap the pill
      shift(dx < 0 ? 1 : -1);
    },
    onPointerUp: () => {
      swipe.current = null;
    },
    onPointerCancel: () => {
      swipe.current = null;
    },
    onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  const arrow =
    'pressable w-9 h-9 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center';
  const backToNow =
    'pressable rounded-full bg-[#CFE7FE] hover:bg-[#BDDDFC] text-[#183B5E] border border-[#A9CFF5] text-xs font-extrabold inline-flex items-center justify-center gap-1.5';

  return (
    <div className="relative flex items-center justify-center gap-1.5 flex-wrap touch-pan-y select-none" data-no-swipe {...swipeHandlers}>
      <button type="button" onClick={() => shift(-1)} className={arrow} aria-label={t('Previous month')}>
        <ChevronLeft size={17} />
      </button>

      <button
        type="button"
        onClick={() => {
          setViewYear(Number(selectedMonth.slice(0, 4)));
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={t('Month: {label}', { label })}
        className={`pressable flex items-center gap-1.5 bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] rounded-full font-bold text-[var(--text)] ${
          ultra ? (isCurrent ? 'w-9 h-9 p-0 justify-center' : 'h-9 px-2.5 justify-center text-xs') : 'px-4 py-2 text-sm'
        }`}
      >
        <Calendar size={15} className="text-[var(--muted)] shrink-0" />
        {/* Ultra minimal: just the icon for this month, MM/YY for any other. */}
        {ultra ? (
          isCurrent ? <span className="sr-only">{t(label)}</span> : <span className="tabular-nums">{`${selectedMonth.slice(5, 7)}/${selectedMonth.slice(2, 4)}`}</span>
        ) : (
          <>
            <span className="tabular-nums">{t(label)}</span>
            <ChevronDown size={14} className={`text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      <button type="button" onClick={() => shift(1)} className={arrow} aria-label={t('Next month')}>
        <ChevronRight size={17} />
      </button>

      {!isCurrent && (
        <button type="button" onClick={() => setSelectedMonth(thisMonth)} title={t('Back to this month')} aria-label={t('Back to this month')} className={`${backToNow} h-9 ${ultra ? 'w-9 px-0' : 'px-3.5'}`}>
          <CornerUpLeft size={14} strokeWidth={2.6} />
          <span className="um-sr">{t('Now')}</span>
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="anim-pop absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 max-w-full bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 shadow-xl shadow-black/15">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                className="pressable w-8 h-8 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                aria-label={t('Previous year')}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-extrabold text-[var(--text)] tabular-nums">{viewYear}</span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                className="pressable w-8 h-8 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
                aria-label={t('Next year')}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_SHORT.map((name, index) => {
                const key = `${viewYear}-${pad(index + 1)}`;
                const selected = key === selectedMonth;
                const current = key === thisMonth;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(key);
                      setOpen(false);
                    }}
                    aria-pressed={selected}
                    aria-label={formatMonth(key)}
                    className={`pressable relative h-10 rounded-full text-xs font-bold flex items-center justify-center ${
                      selected
                        ? 'bg-[var(--text)] text-[var(--on-text)]'
                        : current
                          ? 'bg-[#C9EFD3] text-[#1D5C38]'
                          : 'text-[var(--text)] hover:bg-[var(--inset)]'
                    }`}
                  >
                    {t(name)}
                    {monthsWithData.has(key) && (
                      <span
                        className={`absolute bottom-1 w-1 h-1 rounded-full ${
                          selected ? 'bg-[var(--on-text)]' : current ? 'bg-[#1D5C38]' : 'bg-[var(--muted)]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {!isCurrent && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(thisMonth);
                  setOpen(false);
                }}
                className={`${backToNow} mt-3 w-full py-2`}
              >
                <CornerUpLeft size={13} strokeWidth={2.6} />
                {t('This month')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
