# Koink documentation index

**How to use this documentation (humans and LLMs):** read *only this file*, pick the single row that matches your task, open that one document, and stop. Every document starts with a *Scope / Read when / Related* box, so three lines tell you whether it is the right one. To find the file that implements something, open [file-map/README.md](file-map/README.md) and then one area file. The root [README.md](../README.md) has the same guide keyed by source file.

## Task -> document

| I want to... | Open |
| --- | --- |
| Install, build, host the PWA, build / sign the Android app | [prepare-apps.md](prepare-apps.md) |
| Understand how the app is put together (shell, state, sheets) | [architecture.md](architecture.md) |
| Know what is stored, the types, the money maths, the backup format | [data-model.md](data-model.md) |
| Change colours, tokens, presets, motion classes | [design-system.md](design-system.md) |
| Change swipe rules or what Back does | [gestures.md](gestures.md) |
| Change animation timing, springs, how sheets leave | [motion.md](motion.md) |
| Change reminders: plan, wording, Android alarms, browser timers | [notifications.md](notifications.md) |
| Change a launch animation, the first paint, or the Android launch-screen colour | [launch-intro.md](launch-intro.md) |
| Change the manifest, offline worker, install card, shortcuts | [pwa.md](pwa.md) |
| Change the Android shell, its config, icons, launch screen, plugins | [android.md](android.md) |
| Change the logo, icon or wordmark, their light / dark versions, the notification icon, or regenerate the files | [brand.md](brand.md) |
| Test a change, see what has been checked | [verification.md](verification.md) |
| See what is unverified, missing or deliberately left out | [known-gaps.md](known-gaps.md) |
| Find which file does X | [file-map/README.md](file-map/README.md) |

## Features

| Feature | Open |
| --- | --- |
| Month page: hero cards, shares, category cards, layouts | [features/month.md](features/month.md) |
| Transactions page: search, filter, day groups | [features/transactions.md](features/transactions.md) |
| Budgets page: category budgets, goals, recurring | [features/budgets.md](features/budgets.md) |
| Statistics page: averages, balance trend, breakdown | [features/statistics.md](features/statistics.md) |
| Adding and editing entries, Log again, toasts and Undo | [features/entries.md](features/entries.md) |
| Recurring items | [features/recurring.md](features/recurring.md) |
| Savings goals | [features/savings-goals.md](features/savings-goals.md) |
| Widgets (single button, multiple buttons, expense-type buttons) | [features/widgets.md](features/widgets.md) |
| Gift cards (add, pay an expense with one, tracker) | [features/gift-cards.md](features/gift-cards.md) |
| Profile and the budget rule | [features/profile.md](features/profile.md) |
| Settings: language, appearance, currency, bottom bar, widgets, install card | [features/settings.md](features/settings.md) |
| Language (English / Italian) | [features/language.md](features/language.md) |
| Themes and the six style presets | [features/themes.md](features/themes.md) |
| Ultra minimal mode | [features/ultra-minimal.md](features/ultra-minimal.md) |
| Reminder notifications | [notifications.md](notifications.md) |
| Launch animation | [launch-intro.md](launch-intro.md) |
| Accounts, expense categories, currencies and exchange rates | [features/accounts.md](features/accounts.md), [features/categories.md](features/categories.md), [features/currencies.md](features/currencies.md) |
| Backup, restore, sample journal, delete all data | [features/backup.md](features/backup.md) |
| Installing the app, offline use, home-screen shortcuts | [pwa.md](pwa.md) |
| Swipes and Back | [gestures.md](gestures.md) |

## Keeping the docs current

After **every** new feature or new / renamed / deleted file, update the matching document in the same change:

| If you change... | Update |
| --- | --- |
| Any file (add / rename / delete) | its row in the matching `file-map/*.md`, and the root README legend if it is a main entry point |
| A page or a sheet | the matching `features/*.md` |
| `package.json` scripts, requirements, build flow | [prepare-apps.md](prepare-apps.md), [known-gaps.md](known-gaps.md) |
| Manifest, icons, offline worker, install card, PWA tags in `index.html` | [pwa.md](pwa.md), [file-map/config-scripts-public.md](file-map/config-scripts-public.md) |
| `capacitor.config.json`, anything in `android/`, a Capacitor plugin | [android.md](android.md), [file-map/android-native.md](file-map/android-native.md), [prepare-apps.md](prepare-apps.md) |
| A swipe threshold or Back rule | [gestures.md](gestures.md) (the constants table) |
| An animation duration or spring | [motion.md](motion.md), [launch-intro.md](launch-intro.md) |
| A reminder, its text, ids or channels | [notifications.md](notifications.md), [android.md](android.md) |
| A label or hint on a page | check it in Ultra minimal: [features/ultra-minimal.md](features/ultra-minimal.md) |
| A stored key, the shape of `AppData`, the backup format | [data-model.md](data-model.md), [features/backup.md](features/backup.md) |
| A colour token, a preset, an animation class | [design-system.md](design-system.md), [features/themes.md](features/themes.md) |
| A page background (`--bg`) or the Mono palette | also run `npm run android:splash`: [launch-intro.md](launch-intro.md) |
| Anything in `src/brand/art.js` | run `npm run brand`; [brand.md](brand.md), [launch-intro.md](launch-intro.md) |
| The docs structure itself | this file and the root `README.md` |

Keep each document under roughly 120 lines. If one grows, split it and add a row above.

## Last audit

Written together with the PWA / Android / gestures round. Checked against the tree at that point: every path named in the docs exists, the npm scripts match `package.json`, the storage keys match the source, and the versions quoted (Capacitor 8.5.3, Android Gradle Plugin 8.13.0, Gradle 8.14.3, minSdk 24, SDK 36, Java 21) match `package.json` and the generated Gradle files. What was run and what was not is in [verification.md](verification.md).

**Kakcal-features round (launch animation, page rail, reminders, Ultra minimal, sheet behaviour):** new documents `notifications.md`, `launch-intro.md`, `motion.md`, `features/ultra-minimal.md`; `gestures.md` rewritten; architecture, data-model, design-system, pwa, android, brand, prepare-apps, the feature documents and every file map updated. Checked: paths in the docs exist, storage keys and constants quoted match the source. What was run is in [verification.md](verification.md); Android was again not compiled.

**Koink round (rename, new logo, light / dark versions, five launch animations, launch-screen colour, notification icon):** `brand.md` and `launch-intro.md` rewritten; android, the Android file map, notifications, known-gaps, verification, data-model, prepare-apps, design-system, pwa, architecture, the other file maps and both READMEs updated. Checked: every path named in the docs exists; no `Koins` left outside the two compatibility shims and the notes about them. Android was again not compiled: the three new Java files are untested.

**Widgets / gift cards round (widgets, gift cards, pig icon, blur and pill fixes):** new documents `features/widgets.md` and `features/gift-cards.md`; `features/month.md`, `entries.md`, `accounts.md`, `settings.md`, `brand.md`, `data-model.md`, `android.md`, `known-gaps.md` and the file maps (`components.md`, `sheets.md`, `lib.md`, `android-native.md`) were updated.

**Wallet round (number pad, title + long note, quick delete, own categories, accounts, many currencies, list / days view, smoother sheet drag and header scroll, logo animation):** new documents `features/accounts.md`, `features/categories.md`, `features/currencies.md`; entries, transactions, month, budgets, settings, data-model, gestures, motion, brand, known-gaps, the lib / sheets / components / pages file maps and the root README updated. Checked in headless Chromium at 390 px: the two-screen entry flow, foreign-currency entry and rate screen, category create / hide, Transactions list and days views and quick delete, sheet swipe-close, header fold, logo animation; `tsc -b`, `eslint` and the build are clean.
