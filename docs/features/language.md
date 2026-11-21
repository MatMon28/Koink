# Feature: language (English / Italian)

> **Scope:** the interface language, chosen in Settings (the first block).
>
> **Read when:** you change `src/lib/i18n.ts`, `src/lib/i18n.it.ts`, or add any visible text.
>
> **Related:** [settings.md](settings.md), [../data-model.md](../data-model.md)

## How it works

- `settings.language` is `'en'` or `'it'`. On a first launch it is the browser's language when that is Italian, English otherwise (`detectLanguage`). It is stored in the journal, so it is in the backup.
- **English is the source.** Every visible text in the code is its own English text wrapped in `t()`: `t('Save changes')`, `t('Delete {name}?', { name })`. Placeholders are `{name}` and are filled after the lookup, so the dictionary key is always the English template.
- Italian is `IT` in `src/lib/i18n.it.ts` (`'English text': 'Testo italiano'`). **A missing key shows the English text**, nothing breaks.
- `t()` is a plain function, not a hook. `AppProvider` calls `setLanguage(settings.language)` while it renders, and every component that reads `useApp()` re-renders when the setting changes, so the whole interface switches at once. Module-level constants must therefore not call `t()` at load time: use a getter (see `EXPENSE_CATEGORIES`, `BUCKET_LABEL` in `categories.ts`) or call `t(label)` where the text is rendered.
- Numbers (`format.ts`) use `localeTag()` (`it-IT`: `1.234,50 €`), month and weekday names go through `t()` in `dates.ts`, ordinals are plain numbers in Italian.
- `document.documentElement.lang` follows the choice.

## Adding or changing a text

1. Write it in English inside `t()` (or as an attribute `title={t('...')}`).
2. Add `'the English text': 'il testo italiano'` to `IT`.
3. Texts that are only data (sample journal in `demo.ts`, reminder notification texts in `reminders.ts` / `notifications.ts`, the Koink name) are not translated.

## Adding a language

Add its code to `Language` and `LANGUAGES` in `i18n.ts`, normalise it in `normalizeLanguage`, give `localeTag()` its locale, and add a dictionary next to `i18n.it.ts`.

## Not translated

Reminder notification titles and bodies, the sample journal's entry names, the PWA manifest and the Android launcher widget names (`strings.xml`: Koink: Button / Buttons / Expense types). See [../known-gaps.md](../known-gaps.md).
