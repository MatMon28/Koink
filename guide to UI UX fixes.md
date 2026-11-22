# Guide to UI / UX fixes

> **Scope:** the 28 places where Koink's interface disagrees with itself (colours, fields, buttons, icons, type, cards, wording), the one standard that settles each of them, and the rules every future feature follows.
>
> **Read when:** you fix one of the findings below, or you add or restyle a screen, a field, a button, an icon or a label.
>
> **Related:** [docs/design-system.md](docs/design-system.md), [docs/features/ultra-minimal.md](docs/features/ultra-minimal.md), [docs/features/language.md](docs/features/language.md), [docs/changes-patch.md](docs/changes-patch.md)

Audited at commit `cb7512a` ("UI/UX fixes"). Line numbers are from that commit: if a file has moved on, search for the quoted class or string instead. This file changes no code. It is the brief for the change.

## 0. How to use this file (instructions for the LLM doing the work)

1. Read section 1 (the standard) once. Then work through section 3 (order of work), one step at a time. Each step names the findings of section 2 it closes.
2. Open only the files a finding lists. Never read `src/styles/presets.css`, `src/lib/i18n.it.ts` end to end, `android/` or `docs/` end to end (root `README.md`, "Legend for LLMs").
3. Hard rules:
   - **Do not rename** any `kc-*` class, `data-*` hook, or the tokens `intake`, `activity`, `weight`, `nutrient`. The style presets depend on them ([docs/design-system.md](docs/design-system.md#the-borrowed-names)). Adding tokens is fine.
   - **Look, wording and accessibility only.** No change to state, storage, maths or gestures, except where a finding says so (W2).
   - **Every visible or spoken string goes through `t()`** with its placeholders as parameters, and every new or changed key gets its Italian entry in `src/lib/i18n.it.ts` (search the file for the old key; do not read it all).
   - Check every step in **Light, Soft dark and Dark**, in **Ultra minimal**, and in **Basic and Full** mode, at 360 px and 390 px wide.
   - `npx tsc -b`, `npm run lint` and `npm run build` pass after every step.
4. Documentation: tick the finding in section 6, and update the documents named in [docs/README.md](docs/README.md#keeping-the-docs-current) (a new shared component gets its row in `docs/file-map/components.md`; a token gets its row in `docs/design-system.md`).
5. Hand the work back as `changes.patch` ([docs/changes-patch.md](docs/changes-patch.md)).

Decisions that belong to the owner are marked **Decision**, with the default to apply when nobody answers.

## 1. The standard

One answer per question. Where the code already has a majority habit, the standard is that habit.

### 1.1 Colour

Add to `src/index.css` (values are the ones `BANNER_TONES` in `src/sheets/shared.tsx:127` already uses, so nothing changes on screen):

```css
@theme {
  --color-needs: #CFE7FE;  --color-needs-ink: #183B5E;  --color-needs-accent: #436B94;  --color-needs-soft: #E8F3FF;
  --color-wants: #FAE0B4;  --color-wants-ink: #7D4E14;  --color-wants-accent: #9B6E32;  --color-wants-soft: #FDF3E0;
  --color-gift: #FFD9E8;   --color-gift-ink: #7A1F4B;   --color-gift-accent: #9C4C73;   --color-gift-soft: #FFEDF4;
  --color-danger: #F6D0D0; --color-danger-ink: #7A2727; --color-danger-hover: #F0BDBD;
}
:root { --text-ok: #1F6B3F; }                                   /* next to --text-warn */
[data-theme="lite-dark"], [data-theme="dark"] { --text-ok: #8FD6A8; }
```

| Need | Use | Never |
| --- | --- | --- |
| Pastel fill with its ink | `bg-intake text-intake-ink`, `bg-activity ...`, `bg-weight ...`, `bg-needs ...`, `bg-wants ...`, `bg-gift ...`, `bg-nutrient ...` | `bg-[#C9EFD3]`, `bg-[#E2D6FF]`, `bg-[#CFE7FE]`, `bg-[#FAE0B4]`, `bg-[#FFD9E8]` and their private inks |
| Warning or negative text on `--surface` / `--inset` | `text-[var(--text-warn)]` (9.2:1 light, 8.6:1 dark) | `#A3312F`, `#B4342F`, `#C94444`, `#8C2D32` |
| Positive / saved text on a surface | `text-[var(--text-ok)]` | `#1F7A45` |
| Coloured figure on a surface | `--intake-on-surface`, `--activity-on-surface`, `--weight-on-surface` | the pastel itself as text |
| Solid destructive button | `bg-danger hover:bg-danger-hover text-danger-ink` | `bg-[#F6D0D0] text-[#7A2727]` |

A `.tsx` file contains **no hex colour**. Exceptions: `src/brand/`, the mono hue swatches, and the phone mock-ups in `src/components/tour/` and `InstallGuide.tsx`.

### 1.2 Type roles

| Role | Classes | Used for |
| --- | --- | --- |
| Label | `text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]` | field labels, group captions (`SectionLabel`) |
| Helper | `text-[11px] font-medium text-[var(--muted)]` | hint under a field, second line of a row |
| Body | `text-xs font-medium` (cards), `text-sm font-medium` (dialogs) | sentences |
| Row title | `text-xs sm:text-sm font-bold text-[var(--text)]` | first line of a list row |
| Control | `text-xs font-extrabold` (chips, segments, small buttons), `text-sm font-extrabold` (buttons) | anything you tap |
| Card title | `text-sm font-extrabold text-[var(--text)]` | title of a card on a page |
| Sheet title | `text-base sm:text-lg font-extrabold tracking-tight` | `Modal` title only |
| Figure | `font-extrabold tabular-nums` | every amount and count |

Sizes in use: 10 px (count badges only), 11, 12, 14, 16, then figures. No 9, 9.5, 13 or 15 px. Weights: `medium`, `bold`, `extrabold` (`font-semibold` becomes `font-bold`). Sentence case everywhere; capitals only through the Label role.

### 1.3 Shape and size

| Level | Radius | Examples |
| --- | --- | --- |
| Card, sheet, banner | `rounded-3xl` | page cards, `Modal`, `Banner` |
| Anything rectangular you tap or type in, placed on a card or sheet | `rounded-2xl` | rows, fields, buttons, tiles, segments |
| A control nested inside such a row | `rounded-xl` | the two step buttons inside a rule row |
| Pills, chips, icon buttons, page-level switches | `rounded-full` | |

`rounded-lg`, `rounded-md` and `rounded-sm` are not used (phone mock-ups excepted). Controls in one row share height and radius. Heights: **44 px** (`min-h-11`) for fields, segments and buttons in sheets; **36 px** (`min-h-9`) for chips and small buttons; **32 px** (`h-8`) for items inside a page pill group.

### 1.4 Icons

Sizes, exported once from `src/lib/icons.ts` as `ICON = { mark: 12, sm: 14, md: 16, lg: 18, xl: 22 } as const`:

| Size | Where |
| --- | --- |
| 12 | marks inside a text line (recurring, has a note) |
| 14 | inside chips and small buttons |
| 16 | default: rows, card headers, buttons, small icon buttons |
| 18 | sheet close, leading icon of the save button, medium icon buttons |
| 22 | header and dock |

Stroke: lucide's default (2). `strokeWidth={2.5}` only for 12 to 14 px icons and for `Plus` / `Check` used as an action. Nothing else (2.2, 2.4, 2.6, 2.8 and 3 go).

One meaning, one icon:

| Meaning | Icon | Meaning | Icon |
| --- | --- | --- | --- |
| Expense | `Receipt` | Edit | `Pencil` |
| Income | `Banknote` | Delete | `Trash2` |
| Savings, goal | `PigIcon` | Close, clear | `X` |
| Recurring | `Repeat` | Add, new | `Plus` |
| Log again | `Zap` | Confirm, done | `Check` |
| Gift card | `Gift` | Reset to default | `RotateCcw` |
| Budget | `Target` | Refresh, try again | `RefreshCw` |
| Month page, money left | `Wallet` | View settings, filters | `SlidersHorizontal` |
| Transactions page | `ListOrdered` | Open / close a section | `ChevronDown` (right side, turns 180 degrees, 200 ms) |
| Statistics (tab, weekly review, tour) | `ChartColumn` | Goes somewhere | `ChevronRight` |
| Personal inflation | `TrendingUp` | Warning, not saved | `TriangleAlert` |
| Needs / Wants | `House` / `Sparkles` | Saved, reached | `CircleCheck` |
| A day, per day | `CalendarDays` | Sample data | `FlaskConical` |
| A period | `CalendarRange` | Has a note | `StickyNote` |
| List layout | `LayoutList` | Two-column layout | `Columns2` |
| Compact grid layout | `Grid2x2` | Expanded layout | `ListTree` |

An icon that only repeats the text next to it carries `aria-hidden="true"`. An icon that stands alone sits in a button with `aria-label` and `title`.

### 1.5 Shared pieces (build once in `src/components/ui.tsx`, then use everywhere)

| Piece | Recipe |
| --- | --- |
| `Button` | base `pressable pressable-soft inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold disabled:opacity-40`; size `md` = `min-h-11 px-4 text-sm`, `sm` = `min-h-9 px-3 text-xs gap-1.5`; variants: `primary` = `kc-primary-btn hover:brightness-95` + a tone (`bg-activity text-activity-ink`, `bg-intake ...`, `bg-weight ...`, `bg-needs ...`, `bg-gift ...`, neutral = `bg-[var(--text)] text-[var(--on-text)]`), `secondary` = `bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)]`, `quiet` = `text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]`, `danger` = `bg-danger hover:bg-danger-hover text-danger-ink`, `dangerQuiet` = `bg-[var(--inset)] border border-[var(--border)] text-[var(--text-warn)] hover:bg-danger hover:text-danger-ink` |
| `IconButton` | `pressable relative shrink-0 rounded-full flex items-center justify-center`; `sm` = `size-8` + icon 16 + `after:absolute after:-inset-1.5` (touch area 44 px; keep `gap-3` between two of them, or `after:-inset-1` with `gap-2`), `md` = `size-10` + icon 18, `lg` = `size-11` + icon 22; variants `ghost` (`text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]`), `inset` (`bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]`), `surface` (`bg-[var(--surface)] border border-[var(--border)] ...`), `danger` (ghost + `hover:bg-danger hover:text-danger-ink`). Required `label` prop sets `aria-label` and `title`; the icon gets `aria-hidden` |
| `textInput` | `w-full min-h-11 bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 text-base [@media(pointer:fine)]:text-sm font-bold text-[var(--text)] placeholder:text-[var(--muted)] placeholder:font-medium focus:outline-none focus:border-[var(--muted)] transition-colors`. No caller overrides the size |
| `DateField` / time field | `<input type="date">` with `textInput`; `compact` = `min-h-9 px-2.5` (still 16 px on touch) |
| `SectionLabel` | the Label role + `block mb-1.5`; the only field label in the app |
| `seg()` | `pressable flex-1 min-h-11 px-3 rounded-2xl text-xs font-extrabold text-center border` + today's on / off colours. For choices inside a sheet |
| `PillGroup` | wrapper `inline-flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full`; item `pressable h-8 px-3.5 rounded-full text-xs font-extrabold`, icon-only item `h-8 w-10` with a 16 px icon. For switches on a page (kind, period, layout) |
| `Chip` | `pressable inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full text-xs font-extrabold border`; off = `bg-[var(--inset)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--hover)]`, on = `bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]`; `dashed` variant for "New ..." |
| `Switch` | track off `bg-[var(--muted)]`, on `bg-[var(--intake-on-surface)]`; knob `bg-[var(--surface)]`. No hex |
| `ToggleRow` | today's `Row` of `src/sheets/NotificationSettings.tsx:40` (icon bubble, title, description, `Switch`, optional children), `min-h-[52px]` |
| `SectionCard` | today's `SectionCard` of `src/pages/BudgetsView.tsx:28`, moved to `src/components/cards.tsx`: `id?` (remembers open / closed when given), `icon`, `title`, `aside?`, `onAdd?`. Title is an `<h3>` in the Card title role: icon 16 px `text-[var(--muted)]` always shown, text wrapped in `um-sr`. Chevron as in 1.4. Body = `accordion-grid` + `inert` when closed |
| `EmptyState` | optional title (`text-sm font-extrabold`), text (`kc-section-empty` + Body role, muted), optional `Button sm secondary`. Inside a fold card keep `EmptyRow` |
| `EntryRow` | one row for an entry (see S3) |

### 1.6 Words

| Say | Not | Where |
| --- | --- | --- |
| **entry / entries** | transaction (in sentences) | everywhere except the page name |
| **New {thing}** on the button that opens an empty form and as that sheet's title | "Add account", "Add a new gift card", "New goal" | `New account`, `New gift card`, `New category`, `New type`, `New recurring item`, `New savings goal` |
| **Add {thing}** on the button that confirms that form | "Create goal" | `Add account`, `Add gift card`, `Add category`, `Add recurring item`, `Add savings goal` |
| **Add** for money going in | | `Add expense`, `Add income`, `Add to {name}` |
| **Save changes** when editing | | all edit sheets |
| **Save backup / Restore backup** | "Export a backup" | `Export` is for Excel only |
| **Try again** | "Retry" | |

### 1.7 Behaviour that is already coherent (keep it)

- Deleting an **entry** is immediate and shows a toast with Undo. Deleting **anything else** (account, category, type, goal, recurring item, gift card, all data) asks first with `ConfirmDialog`.
- Every form ends with `SaveRow`; every sheet is a `Modal`; amounts in entry forms are typed on the number pad.
- Selected = a solid block of `--text` with `--on-text` ink (segments, tiles, chips, pill groups).

## 2. Findings and fixes

Severity: **High** = breaks reading or use for some users, **Med** = visible inconsistency, **Low** = polish.

### Colour and tokens

**C1 · High · Warning text is hard-coded and fades out on the dark themes.** `--text-warn` exists (`src/index.css:104`) and is used once (`ProfileSheet.tsx:120`). Elsewhere red and green inks are literals that stay dark on a dark surface: `TxSheet.tsx:439` `#A3312F` (2.4:1 on Dark, 1.7:1 on Soft dark), `DataStatus.tsx:22` `#B4342F` (2.5:1, 2.3:1) and `:23` `#1F7A45` (2.8:1), `SettingsSheet.tsx:400` `#C94444` on a red tint (3.9:1 light, 2.4:1 Soft dark; its 11 px second line at 80 % opacity is 3.0:1 and 2.0:1).
*Fix:* `text-[var(--text-warn)]` for the first two, `text-[var(--text-ok)]` for the tick. *Delete all data* becomes `bg-[var(--inset)] border border-[var(--border)] text-[var(--text-warn)]`, second line without `opacity-80`.
*Done when:* every warning reads at 4.5:1 or better in the three themes.

**C2 · Med · Seven reds for one meaning.** `#7A2727` (11 uses), `#8C2D32` (4: `TransactionsView.tsx:117`, `CategoriesSheet.tsx:135`, `:169`, `cards.tsx:458`), `#A3312F` (2), `#6E2326` (2), `#C94444`, `#B4342F`, `#D93636` (borders and tints: `RestoreDialog.tsx:46`, `SettingsSheet.tsx:400`, `StorageBanner.tsx:35`). `bg-[#F6D0D0]` is written 16 times although it is exactly `bg-activity`; its hover is `#F0BDBD` (`shared.tsx:185`, `ui.tsx:391`, `:436`, `RestoreDialog.tsx:99`) while the token `--color-activity-hover` is `#F2BFBF`.
*Fix:* the `danger` tokens of 1.1. Alert boxes (`StorageBanner`, `RestoreDialog.tsx:46`) = `bg-danger text-danger-ink border border-danger-ink/20`. Hover of a delete icon = `IconButton danger`. The count badge at `TransactionsView.tsx:334` = `bg-danger text-danger-ink`.

**C3 · Med · Pastels are typed as hex, so tokens and presets cannot reach them.** 58 different hex colours in `src/pages`, `src/sheets`, `src/components`. `bg-[#C9EFD3]` (10 uses) is `intake`; `bg-[#E2D6FF]` (7) is `weight`; blue `#CFE7FE` (14), amber `#FAE0B4` (11) and rose `#FFD9E8` (5) have no token and come with four blue inks (`#183F66`, `#1A4670`, `#183B5E`, `#0F3355`), three amber inks and five green inks. Main places: `shared.tsx:131-133`, `:157-163`; `cards.tsx:127-131`; `Tabs.tsx:10-13`; `SettingsSheet.tsx:32-37`, `:211`, `:232`; `BudgetsView.tsx:21`, `:254`; `QuickSheet.tsx:92`; `MonthNavigator.tsx:76`; `RecurringRow.tsx:39`; `InstallApp.tsx:35`; `ProjectDownload.tsx:16`; `GiftCardPickerSheet.tsx:70`.
*Fix:* add the tokens of 1.1, replace each literal by its token pair. One ink per pastel (`-ink`); the darker figure colour on share cards (`#0F3355`, `#2D1E0B`, `#1F1636`) becomes `-ink` too.
*Done when:* `grep -rE "#[0-9A-Fa-f]{6}" src/pages src/sheets src/components/*.tsx` only returns the mono swatches and the phone mock-ups of `InstallGuide.tsx`.

**C4 · Low · Note cards wear the colours of Needs, Wants and Savings.** `NoteCard` takes `tone: 'needs' | 'wants' | 'savings'` (`cards.tsx:178`) for figures that are none of those: *Left*, *Per day*, *Budget* (`MonthView.tsx:404-408`), the three note cards of Budgets (`BudgetsView.tsx:195-197`), *Saved*, *Kept*, *Per day* (`StatsView.tsx:208-210`): nine in all. On Statistics, *Saved* is drawn in the Needs blue while *Per day* gets the Savings lilac. On the Month page they sit right above the real Needs / Wants / Savings cards, same three colours, same order. The comment at `cards.tsx:210` records that this exact reading mistake already happened with the pills.
*Fix:* rename the prop values to `blue | amber | lilac` so the code stops claiming a meaning. **Decision** (default: colours stay): give all note cards the `nutrient` yellow, as `docs/design-system.md` already describes them, and keep blue, amber and lilac for the three shares only.

### Fields

**F1 · High · Text fields are 14 px or 12 px: iPhone Safari zooms the page on focus.** The viewport tag has no `maximum-scale` (`index.html:17`; correct, do not add one). `textInput` is `text-base` (`ui.tsx:29`) but all 24 call sites append `text-sm`; the date field of the entry sheet is `text-xs` (`TxSheet.tsx:352`); also `GiftCardSheet.tsx:75`, `NotificationSettings.tsx:21`, `ProfileAccounts.tsx:23`, the search field `TransactionsView.tsx:307`, and check `TitleField.tsx:35`.
*Fix:* `textInput` of 1.5 (16 px on touch, 14 px with a mouse); delete every `text-sm` / `text-xs` override on an `<input>`, `<textarea>`; give the search field `text-base [@media(pointer:fine)]:text-sm`.
*Done when:* on an iPhone, focusing any field does not zoom.

**F2 · Med · Four looks for a date or time field.** `textInput text-sm` (`StatsView.tsx:173`, `:177`; `TransactionsView.tsx:412`, `:416`; `ExpenseChart.tsx:323`, `:327`; `EditSheets.tsx:133`), a custom one (`GiftCardSheet.tsx:75`: `px-2.5 py-2.5`), a smaller custom one (`TxSheet.tsx:352`: 7 px padding, 12 px text), and the time field on `--surface` (`NotificationSettings.tsx:21`: `py-1.5`).
*Fix:* `DateField` (1.5) everywhere; `compact` only next to the Today / Yesterday chips and inside a `ToggleRow`.

**F3 · Med · Controls in one row differ in height and corner.** Field `rounded-xl py-2.5` next to a button `rounded-2xl py-3` (`shared.tsx:307-309`, `CategoriesSheet.tsx:178-180`); the amount stepper has `rounded-2xl` step buttons around a `rounded-xl` figure (`ui.tsx:259`, `:282`); `seg()`, currency tiles and icon tiles are `rounded-xl` while category tiles are `rounded-2xl` (`ui.tsx:12`, `shared.tsx:217`, `:250`, `:49`). 53 `rounded-xl` against 94 `rounded-2xl`; 9 stray `rounded-lg`.
*Fix:* the levels of 1.3. `textInput`, `seg()`, the stepper figure, all tiles and all buttons in sheets are `rounded-2xl`, 44 px high.

**F4 · Med · Three field labels.** `SectionLabel` is 12 px, `mb-2` (`ui.tsx:24`); pages write their own at 11 px with `mb-1.5`, with `px-1` (`StatsView.tsx:172`, `:176`, `ExpenseChart.tsx:89`) or without (`TransactionsView.tsx:360`, `:386`, `:411-423`); `ProfileSheet.tsx:93` copies `SectionLabel`'s classes by hand; `docs/design-system.md` says `text-[11px] font-bold`, which only `cards.tsx:181` uses.
*Fix:* `SectionLabel` takes the Label role of 1.2; replace the hand-written labels with it; correct the line in `docs/design-system.md` to `font-extrabold`.

**F5 · Low · Amounts are entered three ways.** `ui.tsx:32`: "amounts are typed on screen, never with the phone's keyboard". But the amount filters are `type="number"` (`TransactionsView.tsx:420`, `:424`) and account balances are `type="text"` with their own class on `--surface` (`ProfileAccounts.tsx:22`, `:48`, `:144`).
*Fix:* keep the keyboard for these inline amounts, and say so in `docs/features/entries.md`. Make them one thing: `type="text" inputMode="decimal"`, `textInput` (compact, right-aligned), the same parser (`parseBalance`).

**F6 · Med · A switch that is off can hardly be seen on the light theme.** `Switch` (`ui.tsx:319`): the off track is `--border` on an `--inset` row (1.2:1) with a knob of 1.3:1 against the track; the on colours are four hex literals.
*Fix:* `Switch` of 1.5 (off 4.3:1, on 5.7:1 on light; 5.7:1 and 11.9:1 on Dark).

**F7 · Low · Placeholders are too faint to be the instruction they are.** `placeholder:text-[var(--muted)]/60` (`ui.tsx:30`) is 2.2:1 on light, 3.0:1 on Dark; `/70` in the search field (`TransactionsView.tsx:307`).
*Fix:* full `--muted` with `placeholder:font-medium` (4.3:1 and up), as in `textInput` of 1.5.

### Buttons and touch targets

**B1 · High · In the expense sheet, Delete and Save are the same pink.** `SaveRow` (`shared.tsx:169`): delete is `bg-[#F6D0D0] text-[#7A2727]` (`:185`), and the expense save button beside it is `bg-activity text-activity-ink`, the same `#F6D0D0`. Only the glyph tells them apart.
*Fix:* the delete button of `SaveRow` becomes `Button dangerQuiet` (neutral fill, warning ink), 44 px square, `Trash2` 18 px. Solid `danger` is kept for the confirming button inside `ConfirmDialog` and `SaveBeforeCloseDialog`. Also translate its fallback label (W1).

**B2 · Med · Icon buttons come in eight sizes; "close" alone has four looks.** 20 and 24 px (`cards.tsx:316`, compact chevron), 28 (`TransactionsView.tsx:449`; `cards.tsx:298` compact), 32 (`BudgetsView.tsx:46`, `MonthView.tsx:272`, `:324`, `:379`, `cards.tsx:448`, `:458`, `ExpenseChart.tsx:368`, `ProfileAccounts.tsx:118`, `MonthNavigator.tsx:127`), 36 (`CategoriesSheet.tsx:28`, `EditSheets.tsx:151`, `ChartLargeView.tsx:85`, `MonthNavigator.tsx:74`), 40, 44, 48. Close: `Modal.tsx:422` and `InstallGuide.tsx:450` (40 px, inset, `X` 18), `ChartLargeView.tsx:481` (36 px, **solid ink**, `X` 16), `ChartPopup.tsx:223` (32 px, `X` 15), `MonthView.tsx:379` and `TransactionsView.tsx:314` (32 px, no fill, `X` 15).
*Fix:* `IconButton` (1.5). Close is always `md inset` with `X` 18. Row actions are `sm ghost` with the enlarged touch area. Compact fold cards keep their drawn size (layout) and get `after:-inset-2`.
*Done when:* no tappable element has a touch area under 40 px.

**B3 · Med · The same button is rebuilt in fifteen places.** Heights `py-2.5` or `py-3`, corners `rounded-xl` or `rounded-2xl`, text `text-xs` or `text-sm`: `ui.tsx:176`, `shared.tsx:194`, `CategoriesSheet.tsx:209`, `:220`, `:228`, `InstallApp.tsx:47`, `:55`, `:64`, `ProjectDownload.tsx:25`, `SettingsSheet.tsx:41`, `ChartPopup.tsx:235`, `:241`, `GiftCardPickerSheet.tsx:37`, `QuickSheet.tsx:92`, `TxSheet.tsx:260`. In `ConfirmDialog` the two buttons of one row have different minimum heights (`ui.tsx:384` none, `:391` `min-h-11`). The "neutral" save button is green (`shared.tsx:161`: `neutral: 'bg-intake ...'`) in the account, budget and profile sheets, but ink-coloured in `CategoriesSheet.tsx:220` and `ChartPopup.tsx:241`.
*Fix:* `Button` (1.5) everywhere. **Decision** (default: yes): neutral primary = `bg-[var(--text)] text-[var(--on-text)]`, so green keeps meaning "money in".

**B4 · Low · "Add" is drawn in ten ways.** Ghost circle (`cards.tsx:298`, `MonthView.tsx:272`), inset circle (`BudgetsView.tsx:46`), lilac block (`BudgetsView.tsx:241`), tiny `rounded-lg` chip (`ProfileAccounts.tsx:92`), dashed tile (`shared.tsx:66`), dashed chip (`shared.tsx:287`), and four full-width buttons in four colours (`QuickSheet.tsx:92`, `TxSheet.tsx:260`, `CategoriesSheet.tsx:220`, `GiftCardPickerSheet.tsx:37`). `Plus` is 12, 13, 15, 16, 17 or 18 px with stroke 2.5, 2.6 or 2.8.
*Fix:* card header = `IconButton sm inset` + `Plus` 16; inline in a sheet section header = `Button sm secondary` + `Plus` 14; end of a list in a sheet = `Button md secondary`, full width (primary with the sheet's tone only when the list is empty); in a tile grid = the dashed tile. `rounded-lg` chips (`ProfileSheet.tsx:96`, `ProfileAccounts.tsx:92`, `DataStatus.tsx:41`) become `Button sm`.

**B5 · Med · Five recipes for "pick one of a few".** `seg()` (`ui.tsx:11`); page pills that differ between pages (`TransactionsView.tsx:281`: `px-3.5 text-xs`; `StatsView.tsx:157`: `px-2.5 sm:px-3.5 text-[11px] sm:text-xs`); two functions both called `chip` with different padding and off-colour (`ExpenseChart.tsx:84`: `px-2.5`, `--text`; `PersonalInflation.tsx:25`: `px-3`, `--muted`); `pill` (`TxSheet.tsx:336`: `rounded-xl px-3 py-2`); and the same icon-only layout switch at two sizes on neighbouring pages (`MonthView.tsx:479`: 32 x 40 px, icon 15; `TransactionsView.tsx:449`: 28 px, icon 14).
*Fix:* `seg()`, `PillGroup` and `Chip` of 1.5; delete the local copies. Account pills and date chips in `TxSheet` are `Chip`.

### Icons

**I1 · Med · Twelve icon sizes and seven stroke widths.** Sizes 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22 (15 and 16 are used 47 and 48 times for the same jobs). Strokes: default, 2.2, 2.4, 2.5, 2.6, 2.8, 3. In the header the two matching buttons hold a 21 px and a 22 px icon (`Header.tsx:146`, `:163`).
*Fix:* the scale and stroke rule of 1.4, through `ICON`. Map 10-12 to 12, 13-14 to 14, 15-17 to 16, 18-19 to 18, 21-22 to 22.

**I2 · Med · One meaning with several icons, one icon with several meanings.**
- Edit: `Edit2` (`cards.tsx:452`), `Pencil` (`CategoriesSheet.tsx:119`, `:167`, `ProfileAccounts.tsx:122`), and `PenLine` decorates the empty-journal note (`MonthView.tsx:390`).
- `Columns2` means *Compact* on Month (`MonthView.tsx:127`) and *2 days* on Transactions (`TransactionsView.tsx:26`); the plain list is `LayoutList` on one page and `List` on the other.
- The same "not saved" state shows `TriangleAlert` in `StorageBanner.tsx:37` and `CircleAlert` in `DataStatus.tsx:23`.
- `TrendingUp` is the Statistics tab (`Tabs.tsx:13`), the Personal inflation card (`PersonalInflation.tsx:95`) and the weekly review reminder (`NotificationSettings.tsx:160`), while the tour shows that same weekly reminder with a column chart (`BarChart3`, `tour/NotificationShowcase.tsx:44`).
- `Wallet` is the Month tab, *Left*, the budget pill (`MonthView.tsx:161-163`, which is about a budget: `Target`), the profile banner and a pickable account icon.
- `Sparkles` is *Wants* (`cards.tsx:129`) and also sample data (`MonthView.tsx:365`, `SettingsSheet.tsx:381`).
- `Calendar` (`MonthNavigator.tsx:96`) and `CalendarDays` for the same idea.
*Fix:* the table of 1.4. Never change a key in `ICON_CHOICES` (`src/lib/icons.ts`): those are stored in journals.

**I3 · Low · Decorative icons are not hidden consistently; one section opens the other way.** Of 172 icons, 83 carry `aria-hidden` and 6 an `aria-label`; e.g. `SaveRow` (`shared.tsx:187`, `:196`) has neither while `NumPad` (`ui.tsx:178`) has it. `TypeGroup` puts its chevron on the left and turns it -90 degrees over 300 ms (`CategoriesSheet.tsx:44`); every other section has it on the right, 180 degrees, over 150 ms (`ExpenseChart.tsx:382`, `PersonalInflation.tsx:100`, `:185`, `TxSheet.tsx:542`), 200 ms (`BudgetsView.tsx:37`, `StatsView.tsx:235`, `:303`, `:358`, `cards.tsx:318`) or 480 ms with a bounce (`ui.tsx:350`).
*Fix:* `IconButton` and `Button` hide their icon themselves; add `aria-hidden` to the remaining decorative ones. All disclosure chevrons follow 1.4.

### Type

**T1 · Med · Fourteen text sizes, with 11 px and 12 px used for the same roles.** `text-xs` 164 times and `text-[11px]` 146 times, both for hints and chips; also 9 px (`PersonalInflation.tsx:155`), 9.5 px (`ChartPlot.tsx:213`), 13 px (`cards.tsx:376`), 15 px (`cards.tsx:374`), and 10 px 20 times. Uppercase labels exist at 10, 11 and 12 px in `bold` and `extrabold`.
*Fix:* the roles of 1.2. 9 and 9.5 px become 10 px; 13 and 15 px become 14 px (check `Headline` in Compact at 360 px).

**T2 · Low · Card titles are not the same element.** On Statistics, *Balance trend* is a `<span>` (`StatsView.tsx:225`) and its neighbours are `<h3>` (`:297`, `:352`). `<h2>` is a small uppercase label in `WidgetStrip.tsx:20` and `TransactionsView.tsx:145`, a sheet title in `Modal.tsx:413`; `InstallApp.tsx:33` and `ProjectDownload.tsx:14` use `<h3>` for a label.
*Fix:* page = sr-only `<h1>` (`App.tsx:206`), section headings `<h2>`, card titles `<h3>`; in a sheet the `Modal` title is `<h2>` and groups inside are `<h3>`. Level follows structure, look follows 1.2.

### Cards and sections

**S1 · Med · The folding card is written nine times.** `FoldCard` (`cards.tsx:279`), `SectionCard` (`BudgetsView.tsx:28`), three inline ones (`StatsView.tsx:223`, `:295`, `:350`), `ExpenseChart.tsx:373`, `PersonalInflation.tsx:91`, `Collapsible` (`ui.tsx:337`), `TypeGroup` (`CategoriesSheet.tsx:31`). On the Statistics page alone the five headers differ: icon in a coloured 28 px circle (`StatsView.tsx:226`), icon only in Ultra minimal (`StatsView.tsx:298`, `:353`), icon always (`ExpenseChart.tsx:377`, `PersonalInflation.tsx:95`); the last two titles also do not turn into icons in Ultra minimal (no `um-sr`). Budgets cards remember open / closed, the others do not say.
*Fix:* `SectionCard` of 1.5 for Budgets, the three Statistics cards, `ExpenseChart` and `PersonalInflation` (pass `id` so each remembers its state under the key it already uses, if any). `FoldCard` (Month) and `Collapsible` (sheets) stay, with the chevron rule of 1.4. `TypeGroup` uses `Collapsible`'s header layout.

**S2 · Low · Settings mixes four containers; the switch row is pasted four times.** Bare label blocks (*Language*, *Mode*: `SettingsSheet.tsx:96-118`), `Collapsible` (`rounded-3xl`, `bg-[var(--inset)]/40`), `InstallApp.tsx:32` and `ProjectDownload.tsx:13` (`rounded-2xl`, solid inset, own `<h3>` label), then the brand footer **above** *Delete all data* (`SettingsSheet.tsx:388-407`). The switch row is copied at `SettingsSheet.tsx:204`, `:225`, `:244`, `:330` and exists a fifth time as `Row` in `NotificationSettings.tsx:40`, the only one with `min-h-[52px]`.
*Fix:* `ToggleRow` (1.5) for all five. `InstallApp` and `ProjectDownload` become `Collapsible` sections (or at least `rounded-3xl` with `Collapsible`'s header classes). Order: sections, *Delete all data*, brand footer last.

**S3 · Med · An entry looks and behaves differently on Month and on Transactions.** `TxRow` (`cards.tsx:404`): no sign and no colour on the amount, a pencil and a bin (32 px, 13 px icons), marks at 10 px. `EntryRow` (`TransactionsView.tsx:63`): `+` / `-` and a green income amount, tap the row to edit, one bin (36 px, 15 px icon), marks at 10 and 11 px.
*Fix:* one `EntryRow` in `src/components/` (props: `density: 'card' | 'list' | 'narrow'`, `showCategoryIcon`). Everywhere: `+` for income in `--intake-on-surface`, `-` for an expense in `--text`, savings in `--weight-on-surface`; tap the row to edit; one `IconButton sm danger` bin; marks 12 px. **Decision** (default: keep it, via a `showEdit` prop): the extra pencil on the Month page.

**S4 · Low · Eight kinds of "nothing here".** `kc-section-empty text-xs` (`BudgetsView.tsx:210`, `:259`, `StatsView.tsx:241`, `:309`, `:364`, `ExpenseChart.tsx:255`); `EmptyRow` (`MonthView.tsx:202` ...); title plus text (`TransactionsView.tsx:464`); `text-sm` without the hook, for the same sentence as Budgets (`QuickSheet.tsx:81`); 11 px medium (`CategoriesSheet.tsx:184`); 11 px bold (`PersonalInflation.tsx:193`); a boxed paragraph (`ProfileAccounts.tsx:102`); plain (`GiftCardSheet.tsx:110`).
*Fix:* `EmptyState` (1.5) for all but `EmptyRow`.

### Wording and language

**W1 · High · Strings that can never be translated.** Values are put into the English text *before* `t()` looks it up, so no dictionary key can match: `MonthView.tsx:153`, `:154`, `:161`, `:162` (pill titles such as `` `${count} entries this month` ``, read by `cards.tsx:238`), `:250` (`N goals`), `:345` (`X still due`, `N to come`). Plain English without `t()`: `cards.tsx:53` (`' per month on average'`), `:428` (`'Entry'`); `ui.tsx:281` (`'Open the number pad'`), `:375` (default `confirmLabel = 'Delete'`, rendered raw at `:395`); `shared.tsx:183-184` (`'Delete'`); `CategoriesSheet.tsx:127` (`'Show'` / `'Hide'`); `App.tsx:206` (`PAGE_TITLES[activeTab]`); fallbacks `TxSheet.tsx:164` (`'Savings'`), `EditSheets.tsx:303` (`'Category'`), `AccountSheet.tsx:49` (`'Account'`), `GiftCardSheet.tsx:50` (`'Gift card'`).
*Fix:* `t('{n} entries this month', { n: count })` and so on, with singular / plural as two keys (the pattern of `ProfileSheet.tsx:60`). Wrap the plain ones. Add each key to `i18n.it.ts`.
*Done when:* with Italian chosen, no English is left on the Month page pills, tooltips or screen-reader labels.

**W2 · Med · Two leftovers from when the bottom bar was on every page.** The bar now exists on the Month page only (`App.tsx:211`). (a) The empty Transactions page still says "Use the buttons at the bottom to log your first expense or income." (`TransactionsView.tsx:466`). (b) The toast keeps clear of a bar on every page except Statistics (`ui.tsx:464`), so on Transactions and Budgets it floats 5.5 rem above an empty edge.
*Fix:* (a) text "Log your first expense or income on the Month page." plus `Button sm secondary` *Add expense* (`openSheet({ type: 'tx', kind: 'expense' })`). (b) lift the toast only when the bar is on screen: `activeTab === 'month'` and the bar has a button (the `hasDock` condition of `App.tsx`). This one changes a position, not behaviour.

**W3 · Low · One action, several names.** *Save backup* (`SettingsSheet.tsx:365`) but *Export a backup now* (`StorageBanner.tsx:48`) and "Export a backup to be safe" (toast). *Retry* and *Try again* on the same button (`DataStatus.tsx:44`). Opening an empty form: *Add account* (`ProfileAccounts.tsx:95`), *Add a new gift card* (`GiftCardPickerSheet.tsx:40`), *New goal* (`MonthView.tsx:254`), *New* and *Add* (`EmptyRow` at `MonthView.tsx:202`, `:304`, `:350`) against *New category*, *New recurring item*, *New savings goal*. Confirming it: *Create goal* (`EditSheets.tsx:276`) against *Add account*, *Add gift card*, *Add recurring item*. The page is *Transactions*, its content says *entries*.
*Fix:* the table of 1.6. **Decision** (default: keep): the page name *Transactions*. If it changes to *Entries*, change the two labels only (`NAV_META` in `Tabs.tsx`, `PAGE_TITLES` in `App.tsx`), never the `transactions` id.

## 3. Order of work

Each step leaves the app working and can be its own patch.

| Step | Do | Closes |
| --- | --- | --- |
| 1 | Tokens in `index.css` (1.1); replace hex literals file by file | C1, C2, C3 |
| 2 | Translation fixes; toast position; Transactions empty text | W1, W2 |
| 3 | `textInput`, `DateField`, `SectionLabel`, `Switch`, radius of fields and tiles | F1, F2, F3, F4, F6, F7 |
| 4 | `Button`, `IconButton`; `SaveRow` delete; dialogs | B1, B2, B3, B4 |
| 5 | `seg()`, `PillGroup`, `Chip` | B5 |
| 6 | `ICON` scale, stroke rule, icon vocabulary, `aria-hidden`, chevrons | I1, I2, I3 |
| 7 | `SectionCard`, `ToggleRow`, `EmptyState`, `EntryRow`; heading levels | S1, S2, S3, S4, T2 |
| 8 | Type roles sweep; wording table | T1, W3, F5, C4 |

## 4. Rules for future features

**Every feature, screen, sheet, field or label added from now on follows this section whenever possible.** When a rule cannot be followed, say why in the feature's document under `docs/features/` and add a line to section 6. If a new need is not covered, extend section 1 first (one new row), then build.

1. **Reuse before you write.** A new sheet is a `Modal` that ends in `SaveRow`. A new control is one of 1.5. If a class string for a button, field, chip, label or card header appears in a second file, it moves to `src/components/ui.tsx` or `cards.tsx` in the same change.
2. **No hex colour in a `.tsx` file.** Use the tokens of 1.1. A new meaning that needs a colour gets a token (`--color-<name>`, `-ink`, `-accent`, `-soft`) in `index.css` and a row in `docs/design-system.md`. A colour that already means something (green = money in, pink = money out, lilac = savings, blue = needs, amber = wants, rose = gift cards) is not borrowed for decoration.
3. **Three themes, always.** Text on `--surface`, `--inset` or `--bg` uses a variable that changes with the theme (`--text`, `--muted`, `--text-warn`, `--text-ok`, `--*-on-surface`). Contrast: 4.5:1 for text, 3:1 for the outline or state of a control.
4. **Type, shape and size come from 1.2 and 1.3.** No new font size, weight or radius. Controls in one row share height and radius. A field is 16 px on touch screens.
5. **Touch area 44 px** (40 px at the very least), whatever the drawn size. Two destructive or opposite actions never touch each other.
6. **Icons from 1.4**: a size from `ICON`, default stroke, and the vocabulary table. A new meaning adds a row to that table before it ships; an icon already in the table is not reused for something else.
7. **Words from 1.6.** Sentence case. New text goes through `t('... {name}', { name })` with an Italian entry; nothing is glued together with `+` or template strings before `t()`.
8. **Destructive actions:** entries delete at once with Undo; everything else asks with `ConfirmDialog`. The destructive button is `danger`, on the right, never the same colour as the primary button next to it.
9. **Every state is designed:** empty (`EmptyState` or `EmptyRow`), disabled (`disabled:opacity-40`), over the limit (`--text-warn` or `kc-pill-alert`), and Ultra minimal (`um-*` helpers: a label that becomes an icon needs that icon).
10. **Anything that scrolls** carries `data-scroll-fade`; anything that folds uses `accordion-grid` with `inert` when closed and the chevron rule; anything that animates uses `--ease-soft` / `--ease-bounce` and respects `prefers-reduced-motion`.
11. **Accessibility is part of done:** a real `<button>`, a visible focus ring (the global one in `index.css`, never removed), `aria-pressed` / `aria-expanded` / `role="switch"` where they apply, `aria-hidden` on decorative icons, headings in order.
12. **Before handing back:** run the checklist of section 5 and update the docs ([docs/README.md](docs/README.md#keeping-the-docs-current)).

## 5. Checklist for every UI change

- [ ] No new hex, font size, weight, radius, icon size or stroke width
- [ ] Shared pieces of 1.5 used; no copied class string
- [ ] Light, Soft dark, Dark; Ultra minimal; Basic and Full; 360 px and 390 px
- [ ] Touch areas, focus ring, labels for icon-only buttons
- [ ] English and Italian, including tooltips and `aria-label`s
- [ ] Empty, disabled and error states
- [ ] `npx tsc -b`, `npm run lint`, `npm run build`
- [ ] Docs updated, finding ticked in section 6

## 6. Status

| ID | Fixed in | ID | Fixed in | ID | Fixed in | ID | Fixed in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | open | F4 | open | B4 | open | S1 | open |
| C2 | open | F5 | open | B5 | open | S2 | open |
| C3 | open | F6 | open | I1 | open | S3 | open |
| C4 | open | F7 | open | I2 | open | S4 | open |
| F1 | open | B1 | open | I3 | open | W1 | open |
| F2 | open | B2 | open | T1 | open | W2 | open |
| F3 | open | B3 | open | T2 | open | W3 | open |

Deliberate exceptions to section 4 (add a line when one is accepted): none yet.

## 7. What this audit did and did not cover

- **Read in full:** `src/components/ui.tsx`, `src/sheets/shared.tsx`, `src/lib/icons.ts`, `src/lib/i18n.ts`, the token part of `src/index.css`. **Searched by pattern and read in part:** the four pages, the sheets, the non-tour components, `src/App.tsx`.
- **Not read:** `src/styles/presets.css` (the six style presets may hide or worsen some findings: check each fix in at least Classic and one preset), `src/lib/i18n.it.ts` (W1 is about keys that cannot exist, not about missing entries), `src/components/tour/*` and `InstallGuide.tsx` beyond counts, `android/`, the home-screen widgets.
- **Not run:** nothing was opened in a browser or on a device. Contrast figures are computed from the token values in `index.css` (WCAG 2 formula).
- **Seen on the way, outside UI coherence:** `index.html` in the repository carries three injected script blocks (`data-arena-recording`, `data-arena-views`, `data-element-picker`) from a preview tool; one of them posts page views to `designarena.ai`. Settings tells users "nothing is uploaded". Review and remove them from the committed file.
