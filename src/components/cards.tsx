import type { CSSProperties, ReactNode } from 'react';
import { ICON } from '../lib/icons';
import { Banknote, ChevronDown, CircleCheck, Pencil, House, Plus, Receipt, Repeat, Sparkles, StickyNote, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react';
import { PigIcon } from '../lib/pig';
import { formatDay } from '../lib/dates';
import { formatMoney } from '../lib/format';
import { useApp } from '../lib/store';
import type { Tx } from '../lib/types';
import { t } from '../lib/i18n';

/* ---------- The two big cards: money in (green) and money out (pink) ---------- */

const HERO = {
  in: {
    card: 'kc-hero-intake bg-intake',
    label: 'text-intake-accent',
    number: 'text-intake-ink',
    track: 'bg-intake-soft',
    fill: 'bg-intake-accent',
    pill: 'kc-balance-badge kc-balance-badge-intake bg-intake-accent text-intake-soft',
  },
  out: {
    card: 'kc-hero-burned bg-activity',
    label: 'text-activity-accent',
    number: 'text-activity-ink',
    track: 'bg-activity-soft',
    fill: 'bg-activity-accent',
    pill: 'kc-balance-badge bg-activity-accent text-activity-soft',
  },
};

interface HeroCardProps {
  tone: 'in' | 'out';
  label: string;
  /** Raw value: a change replays the short settle-in of the number. */
  amount: number;
  /** Share of the wider of the two bars, 0-100. */
  pct: number;
  /** Balance pill in the top-right corner (shown on the dominant side only). */
  pill?: string;
  pillTitle?: string;
  /** Marks the number as a per-month average (Statistics). */
  average?: boolean;
  /** Stands in for the label in Ultra minimal. Defaults to the banknote (in) or the receipt (out). */
  icon?: LucideIcon;
}

export function HeroCard({ tone, label, amount, pct, pill, pillTitle, average = false, icon }: HeroCardProps) {
  const { moneyFit } = useApp();
  const c = HERO[tone];
  const text = moneyFit(amount, 8);
  const Icon = icon ?? (tone === 'in' ? Banknote : Receipt);
  return (
    <div role="group" aria-label={average ? t('{label}: {text} per month on average', { label, text }) : `${label}: ${text}`} className={`${c.card} kc-crisp um-tight rounded-3xl p-4 sm:p-5 flex flex-col justify-between min-w-0`}>
      <div>
        <div className="flex items-center justify-between gap-1 mb-1 min-h-[22px]">
          <span className={`inline-flex min-w-0 items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider ${c.label}`}>
            <Icon size={ICON.md} className="um-only shrink-0" aria-hidden="true" />
            <span className="um-sr truncate">{t(label)}</span>
          </span>
          {pill && (
            <span title={pillTitle} className={`${c.pill} shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums`}>
              {pill}
            </span>
          )}
        </div>
        <div className="um-center flex items-baseline gap-1 my-1">
          <span key={amount} className={`anim-value text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${c.number}`}>
            {t(text)}
          </span>
          {average && <span className={`text-xs font-bold ${c.label}`}>{t('/ month')}</span>}
        </div>
      </div>
      <div className={`kc-hero-track w-full h-2.5 rounded-full overflow-hidden mt-3 ${c.track}`}>
        <div
          className={`kc-hero-fill h-full rounded-full transition-[width] duration-500 ease-out ${c.fill}`}
          style={{ width: `${amount > 0 ? Math.max(5, Math.min(100, pct)) : 0}%` }}
        />
      </div>
    </div>
  );
}

/** The pair, scaled against each other, with the balance pill on the dominant side. */
export function HeroPair({ inLabel, outLabel, inAmount, outAmount, average = false, pillTitle, inIcon, outIcon }: {
  inLabel: string;
  outLabel: string;
  inIcon?: LucideIcon;
  outIcon?: LucideIcon;
  inAmount: number;
  outAmount: number;
  average?: boolean;
  pillTitle?: string;
}) {
  const { moneyFit } = useApp();
  const scale = Math.max(inAmount, outAmount, 1);
  const net = inAmount - outAmount;
  const positive = net > 0;
  const hasData = inAmount > 0 || outAmount > 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <HeroCard
        tone="in"
        icon={inIcon}
        label={inLabel}
        amount={inAmount}
        pct={(inAmount / scale) * 100}
        average={average}
        pill={hasData && positive ? moneyFit(net, 8, true) : undefined}
        pillTitle={pillTitle}
      />
      <HeroCard
        tone="out"
        icon={outIcon}
        label={outLabel}
        amount={outAmount}
        pct={(outAmount / scale) * 100}
        average={average}
        pill={hasData && !positive ? moneyFit(net, 8) : undefined}
        pillTitle={pillTitle}
      />
    </div>
  );
}

/* ---------- Needs / Wants / Savings: amount with its share below ---------- */

const SHARE = {
  needs: { card: 'kc-macro-carbs bg-needs', label: 'text-needs-ink', number: 'text-needs-ink', icon: House },
  wants: { card: 'kc-macro-protein bg-wants', label: 'text-wants-ink', number: 'text-wants-ink', icon: Sparkles },
  savings: { card: 'kc-macro-fat bg-weight', label: 'text-weight-ink', number: 'text-weight-ink', icon: PigIcon },
};

interface ShareCardProps {
  tone: keyof typeof SHARE;
  label: string;
  amount: number;
  share: number;
  /** Target share from the budget rule (Profile). */
  target?: number;
  /** 'ok' = target reached (savings), 'over' = limit passed (needs, wants). */
  status?: 'ok' | 'over';
  shareTitle: string;
}

/*
 * Two card styles share the Month page. The pastel, tall one (rounded-3xl, one colour per card) is now worn by
 * Left / Per day / Budget; the small yellow note card is worn by Needs / Wants / Savings. They used to be the
 * other way round.
 */

export function ShareCard({ tone, label, amount, share, target, status, shareTitle }: ShareCardProps) {
  const { moneyFit } = useApp();
  const c = SHARE[tone];
  const text = moneyFit(amount, 7);
  return (
    <div
      data-nutrient="fiber"
      role="group"
      aria-label={`${label}: ${text}, ${share}% ${shareTitle}`}
      className="bg-nutrient text-nutrient-ink rounded-2xl relative flex flex-col items-center justify-center gap-0.5 text-center px-2 py-3 sm:px-3 min-w-0"
    >
      {status === 'ok' && <CircleCheck size={ICON.sm} strokeWidth={2.5} className="absolute top-1.5 right-1.5" aria-label={t('Target reached')} />}
      {status === 'over' && <TriangleAlert size={ICON.sm} strokeWidth={2.5} className="absolute top-1.5 right-1.5 text-[var(--text-warn)]" aria-label={t('Over the target')} />}
      <c.icon size={ICON.md} className="um-only" aria-hidden="true" />
      <span className="um-sr block max-w-full truncate text-[11px] font-bold uppercase leading-tight tracking-wider">{t(label)}</span>
      <span className="whitespace-nowrap text-base sm:text-lg font-extrabold leading-tight tabular-nums">{t(text)}</span>
      <span title={shareTitle} className="text-xs font-bold tabular-nums block whitespace-nowrap opacity-80">
        {share}%{target !== undefined && <span className="um-hide opacity-70"> / {target}%</span>}
      </span>
    </div>
  );
}

/**
 * One of the pastel cards under the two big ones. `icon` replaces the label in Ultra minimal. `hint` is a
 * small line under the figure (what it covers); `onClick` makes the whole card a button.
 */
export function NoteCard({ label, value, unit, title, icon: Icon, tone, hint, onClick }: { label: string; value: string; unit?: string; title?: string; icon: LucideIcon; tone: keyof typeof SHARE; hint?: string; onClick?: () => void }) {
  const c = SHARE[tone];
  const inner = (
    <>
      <Icon size={ICON.md} className={`um-only mx-auto ${c.label}`} aria-hidden="true" />
      <span className={`um-sr text-[11px] font-bold uppercase tracking-wider ${c.label} block truncate`}>{t(label)}</span>
      <div className="mt-1">
        <span className={`text-lg min-[400px]:text-xl sm:text-2xl font-extrabold tabular-nums ${c.number} tracking-tight whitespace-nowrap`}>{value}</span>
        {unit && <small className={`ml-0.5 text-xs font-bold ${c.label}`}>{unit}</small>}
      </div>
      {hint && <span className={`um-hide mt-0.5 line-clamp-2 text-[10px] font-bold leading-tight ${c.label}`}>{hint}</span>}
    </>
  );
  const className = `${c.card} rounded-3xl p-3 sm:p-4 relative text-center min-w-0`;
  const aria = `${label}: ${value}${unit ? ` ${unit}` : ''}${hint ? `, ${hint}` : ''}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title ?? label} aria-label={aria} className={`${className} pressable block w-full`}>
        {inner}
      </button>
    );
  }
  return (
    <div role="group" title={title ?? label} aria-label={aria} className={className}>
      {inner}
    </div>
  );
}

/* ---------- Numeric pills ---------- */

/*
 * Neutral on purpose. These used to be blue, orange and purple: the colours of Needs, Wants and
 * Savings above them, which made people read "3x" as a budget bucket. Now every pill is the same
 * quiet grey; what it is says an icon and (when there is room) a word. Only "over budget" is red.
 */
const PILL_TONES = {
  neutral: 'bg-[var(--inset)] text-[var(--text)] border border-[var(--border)]',
  alert: 'kc-pill-alert bg-danger text-danger-ink border border-transparent',
};

export interface PillItem {
  tone: keyof typeof PILL_TONES;
  icon: LucideIcon;
  text: string;
  /** A word after the figure, shown when `labels` is on: "entries", "of spending", "left". */
  label?: string;
  title: string;
}

/** Short figures, each with its icon; the title spells them out. */
export function Pills({ items, stretch = false, labels = false }: { items: PillItem[]; stretch?: boolean; labels?: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 ${stretch ? 'min-w-0 flex-1 w-full flex-wrap' : 'shrink-0'}`}>
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <span
            key={index}
            role="img"
            aria-label={t(item.title)}
            title={t(item.title)}
            className={`${PILL_TONES[item.tone]} ${stretch ? 'flex-auto max-w-full justify-center' : 'min-w-8'} inline-flex items-center gap-1 rounded-xl px-1.5 py-1.5 text-[11px] font-extrabold tabular-nums leading-none whitespace-nowrap`}
          >
            <Icon size={ICON.mark} strokeWidth={2.5} aria-hidden="true" className="shrink-0 opacity-70" />
            <span className={stretch ? 'whitespace-nowrap' : 'truncate'}>{t(item.text)}</span>
            {labels && item.label && <span className="font-bold opacity-70 truncate">{t(item.label)}</span>}
          </span>
        );
      })}
    </span>
  );
}

/* ---------- Collapsible card: category cards and the pastel tracker cards ---------- */

const PALETTES = {
  income: { surface: 'var(--color-intake)', text: 'var(--color-intake-ink)', muted: 'var(--color-intake-accent)', inset: 'var(--color-intake-soft)', border: '#A6DDB5', hover: '#B9E6C5' },
  savings: { surface: 'var(--color-weight)', text: 'var(--color-weight-ink)', muted: 'var(--color-weight-accent)', inset: 'var(--color-weight-soft)', border: '#CABAF3', hover: '#D5C6FB' },
  giftcards: { surface: 'var(--color-gift)', text: 'var(--color-gift-ink)', muted: 'var(--color-gift-accent)', inset: 'var(--color-gift-soft)', border: '#F2B6D0', hover: '#FFC8DE' },
  recurring: { surface: 'var(--color-needs)', text: 'var(--color-needs-ink)', muted: 'var(--color-needs-accent)', inset: 'var(--color-needs-soft)', border: '#A9CFF5', hover: '#BDDDFC' },
};

interface FoldCardProps {
  /** Category cards are neutral; tracker cards keep their own pastel in the Classic style. */
  variant: 'slot' | 'tracker';
  id: string;
  palette?: keyof typeof PALETTES;
  icon: ReactNode;
  title: string;
  headline: ReactNode;
  /** Pills or a short line next to the headline (under it in Compact). */
  summary: ReactNode;
  onAdd: () => void;
  addLabel: string;
  open: boolean;
  onToggle: () => void;
  compact?: boolean;
  children: ReactNode;
}

export function FoldCard({ variant, id, palette, icon, title, headline, summary, onAdd, addLabel, open, onToggle, compact = false, children }: FoldCardProps) {
  const { data } = useApp();
  const scoped = palette && data.settings.themeStyle === 'classic'
    ? (Object.fromEntries(Object.entries(PALETTES[palette]).map(([name, value]) => [`--${name}`, value])) as CSSProperties)
    : undefined;

  const badge = (
    <div className={`${variant === 'slot' ? 'kc-meal-icon' : 'kc-tracker-icon'} ${compact ? 'size-7 max-[374px]:size-6' : 'size-9'} rounded-full flex items-center justify-center shrink-0 bg-transparent text-[var(--text)]`}>
      {icon}
    </div>
  );

  const addButton = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onAdd();
      }}
      className={`pressable ${compact ? 'size-7 max-[374px]:size-6' : 'size-8'} shrink-0 rounded-full bg-transparent hover:opacity-75 text-[var(--text)] flex items-center justify-center`}
      title={addLabel}
      aria-label={addLabel}
    >
      <Plus size={compact ? 14 : 16} strokeWidth={2.5} />
    </button>
  );

  // The whole header toggles on click; the chevron is the real disclosure button for keyboards and screen readers.
  const chevron = (
    <button
      type="button"
      aria-expanded={open}
      aria-label={open ? t('Hide {title} entries', { title }) : t('Show {title} entries', { title })}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`${compact ? 'size-5 -mr-1' : 'size-8 -mr-1.5'} shrink-0 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)]`}
    >
      <ChevronDown size={compact ? 14 : 16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );

  const attrs = variant === 'slot' ? { 'data-meal-slot': id } : { 'data-tracker': id };

  return (
    <div
      {...attrs}
      style={scoped}
      className={`bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] overflow-hidden transition-colors ${compact ? 'rounded-2xl' : 'rounded-3xl'}`}
    >
      <div
        onClick={onToggle}
        className={`${compact ? 'px-3 py-3 max-[359px]:px-2.5' : 'px-4 py-3.5'} flex flex-col items-center gap-2.5 cursor-pointer select-none hover:bg-[var(--inset)]/40 transition-colors`}
      >
        {compact ? (
          <>
            <div className="flex items-center gap-1.5 max-[359px]:gap-1 w-full">
              {badge}
              <div className="min-w-0 flex-1">{headline}</div>
              {addButton}
              {chevron}
            </div>
            <div className="w-full min-h-6 flex items-center min-w-0">{summary}</div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 w-full">
              {badge}
              <h3 className="min-w-0 flex-1 text-sm font-extrabold text-[var(--text)] truncate">{t(title)}</h3>
              {addButton}
              {chevron}
            </div>
            <div className="flex items-center gap-3 w-full min-w-0 min-h-6">
              {headline}
              {summary}
            </div>
          </>
        )}
      </div>

      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className={`${compact ? 'px-2.5' : 'px-4'} py-1.5 border-t border-[var(--border)] divide-y divide-[var(--border)]`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Headline figure of a collapsible card. In Compact the type steps down with the length, so it is never clipped. */
export function Headline({ text, compact, unit }: { text: string; compact?: boolean; unit?: string }) {
  const size = !compact
    ? 'text-sm sm:text-base'
    : text.length <= 5
      ? 'text-sm'
      : text.length === 6
        ? 'text-sm max-[374px]:text-sm tracking-tight'
        : 'text-xs tracking-tight';
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 tabular-nums whitespace-nowrap" title={unit ? `${text} ${unit}` : t(text)}>
      <span className={`font-extrabold text-[var(--text)] ${size}`}>{t(text)}</span>
      {unit && !compact && <span className="text-[11px] font-bold text-[var(--muted)]">{unit}</span>}
    </span>
  );
}

/** Empty line of a collapsible card: says so, and offers the way to add. */
export function EmptyRow({ text, action, onAdd }: { text: string; action: string; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full py-3 flex items-center justify-between gap-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors text-left"
    >
      <span>{t(text)}</span>
      <span className="font-bold inline-flex items-center gap-1 shrink-0">
        <Plus size={ICON.sm} aria-hidden="true" />
        {t(action)}
      </span>
    </button>
  );
}

/** One entry inside an open card: tap the text to edit, or use the two round buttons. */
export function TxRow({ tx, compact = false, sub, category }: { tx: Tx; compact?: boolean; sub?: string; category?: string }) {
  const { money, openSheet, removeTx } = useApp();
  const edit = () => openSheet({ type: 'tx', kind: tx.kind, editId: tx.id });
  const amount = money(tx.amount, { cents: true });
  const marks = (
    <>
      {tx.recurringId && <Repeat size={ICON.mark} strokeWidth={2.5} aria-label={t('Recurring')} />}
      {tx.details && <StickyNote size={ICON.mark} strokeWidth={2.5} aria-label={t('Has a note')} />}
    </>
  );
  return (
    <div className="py-2.5 flex items-center justify-between gap-2">
      <button type="button" onClick={edit} className="min-w-0 flex-1 text-left group">
        {category ? (
          // Category on top, the title right below it, then the day.
          <>
            <span className="text-xs sm:text-sm font-bold text-[var(--text)] group-hover:opacity-80 truncate block">{category}</span>
            {tx.note && <span className="text-[11px] sm:text-xs font-bold text-[var(--text)]/80 truncate block">{tx.note}</span>}
            <span className="text-[11px] font-medium tabular-nums text-[var(--muted)] flex items-center gap-1">
              {marks}
              <span className="truncate">{sub ?? formatDay(tx.date)}</span>
            </span>
          </>
        ) : (
          <>
            <span className="text-xs sm:text-sm font-bold text-[var(--text)] group-hover:opacity-80 truncate block">{tx.note || t('Entry')}</span>
            <span className="text-[11px] font-medium tabular-nums text-[var(--muted)] flex items-center gap-1">
              {marks}
              <span className="truncate">{sub ?? formatDay(tx.date)}</span>
            </span>
          </>
        )}
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <span className="mr-1 text-right">
          <span className="block text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)]">{amount}</span>
          {tx.foreign && (
            <span className="block text-[10px] font-bold tabular-nums text-[var(--muted)]">{formatMoney(tx.foreign.amount, tx.foreign.currency, { cents: true })}</span>
          )}
        </span>
        {!compact && (
          <button
            type="button"
            onClick={edit}
            className="pressable w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:bg-[var(--inset)] hover:text-[var(--text)]"
            title={t('Edit')}
            aria-label={t('Edit {name}', { name: tx.note || t('entry') })}
          >
            <Pencil size={ICON.sm} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => removeTx(tx.id)}
          className="pressable w-8 h-8 rounded-full text-[var(--muted)] hover:text-danger-ink hover:bg-danger flex items-center justify-center"
          title={t('Delete')}
          aria-label={t('Delete {name}', { name: tx.note || t('entry') })}
        >
          <Trash2 size={ICON.sm} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
