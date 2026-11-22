import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { visibleLabels, type Resolution, type SeriesPoint } from '../lib/expenseSeries';
import { t } from '../lib/i18n';

/** One series of the chart: a category, a period, or both together. */
export interface PlotLine {
  key: string;
  label: string;
  color: string;
  points: SeriesPoint[];
  total: number;
  /** The second period of a comparison: dashed line, lighter bars. */
  dashed?: boolean;
}

export type ChartType = 'bars' | 'line';

export interface PlotProps {
  lines: PlotLine[];
  slots: number;
  peak: number;
  type: ChartType;
  resolution: Resolution;
  /** The points whose dates label the axis (the longest series). */
  labelPoints: SeriesPoint[];
  /** The slot being read, or null. */
  active: number | null;
  onSelect: (index: number | null) => void;
  /** Spoken description of a slot (date and every value). */
  describe: (index: number) => string;
  /**
   * The plot sits in the full view while it is turned a quarter: screen coordinates are rotated against the
   * plot's own, so a tap is located along the screen's vertical axis.
   */
  rotated?: boolean;
  /** Stop measuring: during the quarter turn the width changes every frame and nothing needs to follow it. */
  freeze?: boolean;
  /** A fixed height (Tailwind class). Without it the plot fills the height of its parent. */
  heightClass?: string;
}

/** Height of the line in the 0-100 box of the SVG: the highest value sits a little below the top. */
const yOf = (value: number, peak: number): number => 96 - (peak > 0 ? (value / peak) * 92 : 0);

/* ---------- Layers (memoised: dragging or zooming only resizes them, it never redraws 800 bars) ---------- */

const Bars = memo(function Bars({ lines, slots, peak, active, gap }: { lines: PlotLine[]; slots: number; peak: number; active: number | null; gap: number }) {
  const single = lines.length === 1;
  return (
    <div className="absolute inset-0 flex items-end" style={{ gap }} aria-hidden="true">
      {Array.from({ length: slots }, (_, index) => {
        const dim = active !== null && active !== index;
        return (
          <span key={index} className="flex h-full min-w-0 flex-1 items-end gap-px">
            {lines.map((line) => {
              const value = line.points[index]?.total ?? 0;
              const height = peak > 0 ? Math.max(value > 0 ? 3 : 0, (value / peak) * 100) : 0;
              return (
                <span
                  key={line.key}
                  className="block min-w-0 flex-1 rounded-t-[3px]"
                  style={{
                    height: `${height}%`,
                    background: single && active === index ? 'var(--text)' : line.color,
                    opacity: dim ? 0.4 : line.dashed ? 0.7 : 1,
                  }}
                />
              );
            })}
          </span>
        );
      })}
    </div>
  );
});

const Lines = memo(function Lines({ lines, slots, peak, dots, active }: { lines: PlotLine[]; slots: number; peak: number; dots: boolean; active: number | null }) {
  return (
    <>
      {active !== null && (
        <span className="pointer-events-none absolute inset-y-0 w-px bg-[var(--muted)]/50" style={{ left: `${((active + 0.5) / slots) * 100}%` }} aria-hidden="true" />
      )}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {lines.map((line) => (
          <polyline
            key={line.key}
            points={line.points.map((p, i) => `${(((i + 0.5) / slots) * 100).toFixed(3)},${yOf(p.total, peak).toFixed(2)}`).join(' ')}
            fill="none"
            stroke={line.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={line.dashed ? '5 4' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {lines.flatMap((line) =>
        line.points.map((p, i) =>
          dots || active === i ? (
            <span
              key={`${line.key}-${i}`}
              className="pointer-events-none absolute rounded-full border-2"
              style={{
                left: `${((i + 0.5) / slots) * 100}%`,
                top: `${yOf(p.total, peak)}%`,
                width: active === i ? 11 : 7,
                height: active === i ? 11 : 7,
                transform: 'translate(-50%, -50%)',
                background: line.color,
                borderColor: 'var(--surface)',
              }}
              aria-hidden="true"
            />
          ) : null,
        ),
      )}
    </>
  );
});

/**
 * The expense chart itself: bars or one line per series, a dashed grid, the date axis, and one transparent
 * layer on top that reads taps, hovers and the arrow keys. It is as wide as its parent and as tall as
 * `heightClass` (or the parent): the card gives it the whole width, the full view gives it `zoom x` the
 * width inside a scroller. Everything is sized with CSS, so it follows its parent while that animates.
 */
export function ChartPlot({ lines, slots, peak, type, resolution, labelPoints, active, onSelect, describe, rotated = false, freeze = false, heightClass }: PlotProps) {
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const frozen = useRef(freeze);

  useEffect(() => {
    frozen.current = freeze;
  }, [freeze]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => !frozen.current && setWidth(Math.round(el.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The turn is over: take the size it ended on.
  useLayoutEffect(() => {
    if (!freeze && root.current) setWidth(Math.round(root.current.clientWidth));
  }, [freeze]);

  const slotPx = slots > 0 ? width / slots : 0;
  const gap = slotPx > 12 ? 3 : slotPx > 6 ? 2 : slotPx > 3 ? 1 : 0;
  const dots = slotPx >= 12 || (width === 0 && slots <= 45);
  const labels = visibleLabels(labelPoints, resolution, slotPx);

  /** Which slot is under the pointer. */
  const slotAt = (clientX: number, clientY: number): number => {
    const box = overlay.current?.getBoundingClientRect();
    if (!box || slots === 0) return 0;
    const share = rotated ? (clientY - box.top) / box.height : (clientX - box.left) / box.width;
    return Math.min(slots - 1, Math.max(0, Math.floor(share * slots)));
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const index = slotAt(event.clientX, event.clientY);
    onSelect(active === index ? null : index);
  };
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (type === 'line' && event.pointerType === 'mouse' && event.buttons === 0) onSelect(slotAt(event.clientX, event.clientY));
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = slots - 1;
    const now = active ?? (event.key === 'ArrowRight' ? -1 : last + 1);
    let next: number | null | undefined;
    if (event.key === 'ArrowRight') next = Math.min(last, now + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, now - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Escape' && active !== null) next = null;
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(next);
  };

  return (
    <div ref={root} className={`flex flex-col ${heightClass ? '' : 'h-full'}`}>
      <div className={`relative border-b border-[var(--border)] ${heightClass ?? 'min-h-0 flex-1'}`}>
        {[0, 50].map((top) => (
          <span key={top} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--border)]" style={{ top: `${top}%` }} aria-hidden="true" />
        ))}
        {type === 'bars' ? <Bars lines={lines} slots={slots} peak={peak} active={active} gap={gap} /> : <Lines lines={lines} slots={slots} peak={peak} dots={dots} active={active} />}
        <div
          ref={overlay}
          role="slider"
          tabIndex={0}
          aria-label={t('Expenses per {v}', { v: t(resolution) })}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, slots - 1)}
          aria-valuenow={active ?? 0}
          aria-valuetext={active !== null ? describe(active) : t(type === 'bars' ? 'Tap a bar to read it' : 'Tap the line to read a point')}
          onClick={onClick}
          onPointerMove={onMove}
          onKeyDown={onKey}
          className="absolute inset-0 cursor-crosshair rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--muted)]"
        />
      </div>
      <div className="relative h-5 shrink-0" aria-hidden="true">
        {labels.map(({ index, text }) => (
          <span key={index} className="absolute top-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-[var(--muted)]" style={{ left: `${((index + 0.5) / slots) * 100}%` }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
