# File map index

> **Scope:** one line per area of the repository, pointing at the file that lists each file's role.
>
> **Read when:** you need to find *which file implements something*. Open only the one area file you need.
>
> **Related:** [../README.md](../README.md), the legend in the root [README.md](../../README.md)

| Looking for... | Open |
| --- | --- |
| `index.html`, `src/main.tsx`, `src/App.tsx`, the three stylesheets, `src/brand/art.js` (all the artwork) | [app-shell.md](app-shell.md), [../brand.md](../brand.md) |
| `src/components/` (cards, modal, header, dock, page swiper, inputs, install card) | [components.md](components.md) |
| `src/pages/` (Month, Transactions, Budgets, Statistics) | [pages.md](pages.md) |
| `src/sheets/` (entry, quick log, recurring, goal, budget, profile, settings) | [sheets.md](sheets.md) |
| `src/lib/` (store, types, maths, dates, themes, Back, PWA, platform, reminders, launch animation, springs) | [lib.md](lib.md) |
| Root configs, `scripts/`, `public/` | [config-scripts-public.md](config-scripts-public.md) |
| `android/` and `capacitor.config.json` | [android-native.md](android-native.md) |
| `docs/` | [../README.md](../README.md) |

## Where things go

| New thing | Put it in |
| --- | --- |
| A page | `src/pages/`, add it to `ActiveTab` (`types.ts`), `ALL_TABS` (`tabs.ts`), `NAV_META` (`Tabs.tsx`), and `PAGE_TITLES` + `renderPage()` in `App.tsx` |
| A sheet | `src/sheets/`, add its type to `Sheet` (`types.ts`), mount it in `App.tsx` |
| A reusable visual piece | `src/components/` |
| Logic without JSX | `src/lib/` (a file that exports components must export nothing else: the ESLint `react-refresh` rule) |
| A platform difference | `src/lib/platform.ts` only |
| Anything about the logo or a launch animation | `src/brand/art.js`, then `npm run brand` |
| A reminder | `src/lib/reminders.ts` (plan) + a row in `src/sheets/NotificationSettings.tsx` |

Keep these tables in step: add a row to the right area file whenever you add, rename or remove a file.
