# Feature: currencies and exchange rates

> **Scope:** the journal's currency, paying a single entry in another one, the rates behind it.
>
> **Read when:** you change `src/lib/format.ts` (`CURRENCIES`, `exchangeRate`), `currencyLocked` in `src/lib/journal.ts`, the currency parts of `TxSheet.tsx` / `SettingsSheet.tsx`, or `refreshRates` / `updateSettings` in `store.tsx` (Frankfurter).
>
> **Related:** [entries.md](entries.md), [settings.md](settings.md), [../data-model.md](../data-model.md)

## Currencies

`CURRENCIES` in `format.ts` lists about 40 (code, symbol, name, minor-unit digits, rough `perUsd`). `CurrencyCode` is a plain string; `isCurrency()` validates stored values. Yen, won, dong, rupiah, isk and peso (CLP) show no decimals.

## The journal's currency is locked once there are amounts

Every amount is stored as a bare number and shown in the journal's currency. Switching the currency would relabel all of them (an entry of 100 EUR would show as 100 USD) instead of converting them, so **the picker is locked while the journal holds any amount** (`currencyLocked(data)` in `src/lib/journal.ts`): entries, a monthly or category budget, a goal target, a non-zero account opening balance, a gift card or a recurring item with an amount.

- Settings > Currency then shows the current currency with a lock, the reason, and the way out: save a backup, **Delete all data** (it keeps the currency and empties the journal, which unlocks the picker), then pick the new one.
- `updateSettings()` in the store drops a currency change while the journal is locked, so no other code path can bypass the screen. A restore may still bring its own currency: the preview warns about that ([backup.md](backup.md)).
- The untouched sample journal is exempt (`settings.sampleData` and every entry id looks like `s<number>`); adding an entry of your own locks it.
- Do not confuse the two currencies: the **journal currency** is what totals, budgets and balances are counted in (one per journal, locked); the **currency paid** belongs to a single entry and is converted when the entry is saved (below).
- A real migration (pick a new currency, see a preview of every converted amount, confirm) is not built: [../known-gaps.md](../known-gaps.md).

## One entry in another currency

The journal has one currency (Settings); **every total uses it**. To keep the maths untouched, a foreign entry is converted *when it is saved*:

- `Tx.amount` = what it is worth in the journal's currency (used everywhere);
- `Tx.foreign = { amount, currency, rate }` = what was actually paid and the rate used (units of the journal currency per unit paid).

In the entry sheet: currency chip on the amount screen, then (on the details screen) the line under the amount shows the conversion; tapping it opens the rate screen with the number pad, where the rate can be corrected to what the bank charged. Lists show the original amount in grey under the converted one. Editing a foreign entry reopens it in its own currency. Changing the journal currency later is not possible while it holds amounts (above), so old entries never change meaning.

## Rates

`exchangeRate(from, to, rates)` = `perUsd(to) / perUsd(from)`; `rates` is `Settings.rates` (units per US dollar), falling back per code to the built-in approximate table. **Settings > Update exchange rates** (`refreshRates`) downloads `https://api.frankfurter.dev/v1/latest?base=USD` from [Frankfurter](https://frankfurter.dev) (European Central Bank reference rates, free, no key; it replaced open.er-api.com) and stores it with `Settings.ratesDate` (the date Frankfurter reports). USD is added as `1` because the base is not part of the answer. Frankfurter covers about 30 currencies (EUR, GBP, CHF, JPY, CAD, AUD...); a currency it does not list (AED, SAR, EGP, NGN, KES, MAD, UAH, ARS, VND, COP, CLP...) keeps using the built-in approximate figure, code by code, through `exchangeRate`. Offline (or if the service fails) it shows a toast and nothing changes. This is the only network request the app makes, and only on that button.
