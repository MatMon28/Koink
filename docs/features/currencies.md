# Feature: currencies and exchange rates

> **Scope:** the journal's currency, paying a single entry in another one, the rates behind it.
>
> **Read when:** you change `src/lib/format.ts` (`CURRENCIES`, `exchangeRate`), the currency parts of `TxSheet.tsx` / `SettingsSheet.tsx`, or `refreshRates` in `store.tsx`.
>
> **Related:** [entries.md](entries.md), [settings.md](settings.md), [../data-model.md](../data-model.md)

## Currencies

`CURRENCIES` in `format.ts` lists about 40 (code, symbol, name, minor-unit digits, rough `perUsd`). `CurrencyCode` is a plain string; `isCurrency()` validates stored values. Yen, won, dong, rupiah, isk and peso (CLP) show no decimals.

## One entry in another currency

The journal has one currency (Settings); **every total uses it**. To keep the maths untouched, a foreign entry is converted *when it is saved*:

- `Tx.amount` = what it is worth in the journal's currency (used everywhere);
- `Tx.foreign = { amount, currency, rate }` = what was actually paid and the rate used (units of the journal currency per unit paid).

In the entry sheet: currency chip on the amount screen, then (on the details screen) the line under the amount shows the conversion; tapping it opens the rate screen with the number pad, where the rate can be corrected to what the bank charged. Lists show the original amount in grey under the converted one. Editing a foreign entry reopens it in its own currency. Changing the journal currency later does not rewrite old entries.

## Rates

`exchangeRate(from, to, rates)` = `perUsd(to) / perUsd(from)`; `rates` is `Settings.rates` (units per US dollar), falling back per code to the built-in approximate table. **Settings > Update exchange rates** (`refreshRates`) downloads `https://open.er-api.com/v6/latest/USD` (free, no key) and stores it with `Settings.ratesDate`; offline it fails with a toast and nothing changes. This is the only network request the app makes, and only on that button.
