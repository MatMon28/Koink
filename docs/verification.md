# Verification

> **Scope:** how to check a change, and what was actually checked when the PWA / Android / gestures round was written.
>
> **Read when:** before you ship, or when you need to know how far a claim in these docs was tested.
>
> **Related:** [known-gaps.md](known-gaps.md), [prepare-apps.md](prepare-apps.md)

## Routine checks

```sh
npm run build                      # tsc -b + vite build; must end without errors
npx eslint src                     # must print nothing
npm run preview                    # then try the change on http://localhost:4173
npm run android:prepare            # must end with "Android assets ready"
```

`npm run lint` (which lints the whole folder) reports two findings in `vite.config.ts` that come from the project template's own lines (`@ts-ignore`, an empty `catch`); `npx eslint src` is the meaningful check. There is no unit-test suite in the repository.

By hand, on a phone-sized viewport with touch emulation:

1. Add an expense, undo it from the toast, add it again, edit it, delete it.
2. Swipe between all four pages; swipe the month row; drag a sheet down.
3. Open a sheet and press Back: the sheet closes and the site is still there.
4. DevTools > Application: manifest without errors, worker activated; go offline and reload.
5. Switch theme and one style preset; nothing is clipped at 360 px wide.

## What was checked in this round

All of it in headless Chromium against `npm run preview`, with scripted touch input (CDP touch events):

| Area | Result |
| --- | --- |
| Build | `tsc -b` and `vite build` clean; `npx eslint src` clean; sub-path build (`--base=/koink/`) rewrites every URL |
| Existing flows | the earlier 37-step script (add / edit / delete with Undo, recurring log, quick log, month picker, budgets, goals with stacked confirm, profile rule, currency, dark mode, reload persistence, start fresh, backup round trip, bad backup) still passes |
| Page swipe | changes page in both directions; rubber-bands at the last page; a 30 px slow drag does not commit, a 40 px flick does; vertical scrolling still scrolls; a swipe starting at the screen edge is ignored; a cancelled swipe does not tap the card under it |
| Month row | swiping it changes the month and not the page |
| Back (browser) | closes a sheet and stays on the site; closes only the top of two stacked sheets; survives a sheet-to-sheet switch; closes the month picker; closing by button removes the history entry; a reload with a sheet open cleans up |
| Back (standalone, `display-mode` stubbed) | closes Settings first, then returns to Month, then is the browser's own; returning by the pill releases it |
| Manifest and icons | served, parsed, 3 icons + apple-touch icon are PNGs, 2 shortcuts |
| Offline worker | takes control; one `koink-shell-*` cache with the shell, scripts, styles, fonts, manifest and icons; an offline reload renders the app with its fonts |
| Shortcuts | `?add=expense` (also offline) and `?add=income` open the right sheet and the parameter leaves the address; a reload does not reopen it |
| Install card | appears with a button when `beforeinstallprompt` is dispatched, calls `prompt()`, then reports the outcome; shows "installed" in standalone mode |
| Project archive | `npm run package` writes the zip; `unzip -t` passes; `gradlew` keeps its executable bit; unpacked in an empty folder, `npm ci`, `npm run build` and `npm run android:prepare` all complete; the Settings card downloads the same file from the running app; the offline worker does not cache it |
| Preview modes | the dev server (`npm run dev`) renders the app, saves an entry, changes pages, closes a sheet with Back and serves the manifest and the project archive; the production build also runs inside an iframe, a sandboxed iframe, and a sandboxed iframe without `allow-same-origin` (no storage, no offline worker: the app still works, the journal just does not persist) |
| Android | `cap add android` and `npm run android:prepare` complete; the synced bundle matches `dist/`; the three plugins are in `capacitor.plugins.json`; the edited XML files are well formed; icons inspected by eye |

## Kakcal-features round

Also in headless Chromium against `npm run preview` (tests open the app with `?intro=0` unless they test the animation):

| Area | Result |
| --- | --- |
| Launch animation | overlay in the DOM before the app's first render; stays for the animation, then leaves (about 1.1 s); never the same animation twice in a row; a tap skips it and does not reach the app; none with `?intro=0` or reduced motion; all four end on the icon (frames inspected); runs in the dev server and inside iframes |
| First paint | with the bundle blocked, the inline script alone applies the saved theme, style and background |
| Page rail | neighbour pre-mounted hidden and `inert`; during a swipe it sits 24 px beside the page; the same DOM node becomes the page; no vertical jump with the page scrolled; a cancelled swipe returns to one page; turning round swaps the neighbour; the dock returns from the swipe's side |
| Sheets | drag 90 px or a quick 26 px flick closes, a slow 30 px drag springs back; a tap 30-40 ms after closing lands on the page; frame follows the visual viewport |
| Unsaved input | Escape, scrim, X, swipe and Back all ask; Keep editing keeps the input; Don't save and Save do what they say; no amount = no Save; an untouched form closes at once; Back never leaves the app while a refused sheet is open (a bug found and fixed in this round) |
| Ultra minimal | switch sets `data-ultra`; Month page about a third shorter; labels off screen but present for screen readers; pill, month row and layout behave as documented; no horizontal overflow on any page; persists; switching off restores the chosen layout; looked at in Classic, Pop, Angular, Aurora |
| Reminders (pure) | plan, ids, wording, validation and `nextOccurrence` (daily, weekly, monthly, over a year end) by assertion |
| Reminders (browser) | with a faked clock: the daily one fires at its minute and again next day, the weekly one only on its weekday, a recurring one on its day; nothing fires with everything off; taps (worker message and `?open=`) open the right screen; the worker's click handler posts the target; denied / unavailable permission is reported |
| Android | `npm run android:prepare` completes with four plugins; edited XML is well formed; the notification glyph was rendered from its path data and inspected |

In those reminder tests `Notification.permission` and the display call were **stubbed**: headless Chromium reports the permission inconsistently and shows nothing. Real permission prompts and real notifications were not seen.

## Koink round

| Area | Result |
| --- | --- |
| Icon | rendered at 1024 px and compared with the reference: fewer than 400 of about a million pixels differ noticeably. Dark version compared by eye with the dark reference |
| Wordmark | rendered on the reference's canvas and overlaid: letters, K, pig and coin coincide within a pixel; the pig's lighter lines and closed ears were matched after the first overlay showed them |
| Launch animations | frame strips of all five, light and dark, inspected; in the app: the first launch plays `coin-oink`, later picks never repeat, overlay background is the app's `--bg`, ink and coin switch with the theme; skip, `?intro=0` and reduced motion as before |
| Coin | in `coin-oink` the turn is one keyframe sequence, `scaleX` 1 -> 0 -> -1 -> 0 -> 1 (one full turn); no other animation turns it |
| Rename | storage written as `koins_*` is moved to `koink_*` with the journal, view preferences and animation memory intact, unrelated keys untouched; the first paint still honours `koins_boot`; `koins-shell-*` caches are deleted; title, manifest and wordmark say Koink |
| Brand sheet | `/brand/` opens, all 14 images load; visiting it does not replace the cached app shell; it is not precached |
| Existing suites | entry flows (44), gestures (29), page rail (15), sheets (12), Ultra minimal (18), reminders (24), launch (11), PWA (18), standalone Back (8) all still pass under the new name |
| Android | `npm run android:prepare` completes for `com.koink.app` with four plugins; `splash_themes.xml` has 48 styles and matches the stylesheets; every edited XML file is well formed; launcher, adaptive, monochrome and notification icons inspected as images, the notification icon at all five densities on a tinted background |

## What was not checked

- **The Android project was not compiled and the app was not run** on a device or emulator: no JDK or Android SDK was available. That covers the three Java files (`MainActivity`, `LaunchBackground`, `KoinkDevicePlugin`: written without a compiler), the launch screen and whether it really follows the theme, safe-area insets, the hardware Back button, the share sheet for backups, the file picker, the system-bar icon colour, the themed launcher icon, and everything about reminders on Android (permission, alarms with the app closed, how the icon looks in the status bar, taps).
- No real phone or tablet: touch behaviour was emulated. iOS Safari (Add to Home Screen, edge swipe) was not tried.
- The real browser install flow (Chrome's dialog, the installed window) was not exercised, only the event handling around it.
- Lighthouse / installability audits were not run.

The device checklist is in [prepare-apps.md](prepare-apps.md#first-run-on-a-device-check-these).

## Wallet round

Run in headless Chromium (390 x 800, touch): add expense through the number pad, foreign-currency entry with a corrected rate, new and hidden categories, Transactions in both layouts and quick delete, swipe-down close of a sheet, header fold on scroll and the logo animation (screenshots inspected). **Not measured:** real frame times on a phone, so the "laggy swipe" fix is by construction (compositor-only changes, no re-render during the exit), not by profiling. The rates download was not exercised (no network in the test run).

## Frankfurter / types / frequency round

Checked: `tsc -b` and ESLint clean, `vite build` succeeds; the Frankfurter endpoint (`/v1/latest?base=USD`) was called once and its answer shape matches `refreshRates`. **Not** exercised in a browser: the 2 days layout, the expandable categories field, hiding Budgets, the frequency picker and the always-visible dock should be tried by hand (steps in the feature docs). The Android widget layout change (no text) is not compiled, as before.
