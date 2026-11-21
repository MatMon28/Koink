# Gestures and Back

> **Scope:** every touch gesture, which controls keep their own, the edge reservation, the sensitivity numbers, and what Back does on each platform.
>
> **Read when:** you change swipe handling in `PageSwiper.tsx`, `MonthNavigator.tsx` or `Modal.tsx`, or Back handling in `src/lib/back.ts`.
>
> **Related:** [motion.md](motion.md) (how things move once a gesture decided), [android.md](android.md)

## The gestures

| Gesture | Where | Result | Code |
| --- | --- | --- | --- |
| Swipe left / right | anywhere on a page | the page and its neighbour move together under the finger; release to change page (order of the header pill) | `PageSwiper.tsx` |
| Swipe left / right | the month row | next / previous month (what the arrows do) | `MonthNavigator.tsx` |
| Drag down | a sheet's handle or title bar | closes the sheet; a sheet with unsaved input asks first and springs back | `Modal.tsx`, `TxSheet.tsx` |
| Back (button, back swipe, browser Back) | anywhere | closes the top sheet or the month picker; installed: then returns to Month | `back.ts` |
| Tap | the launch animation | skips it | `intro.ts` |
| Hold | `+` / `-` of an amount stepper | repeats the step | `ui.tsx` (`AmountStepper`) |
| Scroll down / up | page | hides / shows the bottom dock; the header folds to the page pill | `ActionDock.tsx`, `Header.tsx` |
| Tap the scrim, Escape | open sheet | closes it (or asks, see above) | `Modal.tsx` |

The same list is shown to users in **Settings > Gestures** (`GESTURES` in `SettingsSheet.tsx`): keep the two in step.

## Page swipe: the rail

Both pages ride one rail. While the finger drags, the neighbouring page sits 24 px beside the current one and moves with it, showing its top however far the current page was scrolled. Released past the commit distance, or flicked, the rail finishes its travel and the neighbour's element *becomes* the current page (same React key: nothing is mounted twice, its state is kept, the scroll position resets without a jump). Otherwise both spring back.

On touch devices the neighbours of the current page are mounted, hidden and `inert`, in an idle moment after each page change (`warm` in `PageSwiper.tsx`), so a swipe never starts with a pause. With a mouse only, nothing is pre-mounted.

Finger and pen only (a mouse drag does nothing). Vertical movement stays normal scrolling (`touch-action: pan-y`). The swipe does **not** start:

- within **20 px of the left or right screen edge**: that strip belongs to the system's own back swipe;
- on `input`, `textarea`, `select`, `contenteditable`, `[role="slider"]`, or anything inside **`[data-no-swipe]`** (the month row has it);
- inside an element that can itself scroll sideways;
- while a sheet is open, or with a second finger.

A drag that turned into a swipe never also taps what was under the finger. At the first and last page the page only stretches a little and springs back. A page reached by the pill or by Back slides in from the side it lies on. With `prefers-reduced-motion` the page changes without animation.

### Sensitivity

Named constants at the top of `PageSwiper.tsx`:

| Constant | Value | Meaning |
| --- | --- | --- |
| `EDGE_RESERVED_PX` | 20 | strip left to the system back swipe |
| `TAKEOVER_PX`, `TAKEOVER_RATIO` | 8 px, 1.2x | horizontal travel that starts the swipe, and how much it must beat the vertical |
| `SCROLL_PX` | 10 px | vertical travel that makes it a scroll for good |
| `FOLLOW`, `RUBBER` | 0.9, 0.22 | how far the rail moves per finger pixel; at an end page |
| `COMMIT_SHARE`, `COMMIT_MIN_PX`, `COMMIT_MAX_PX` | 16 %, 48, 84 | release distance that changes the page (16 % of the width, kept within 48-84 px) |
| `FLICK_SPEED`, `FLICK_MIN_PX` | 0.35 px/ms, 24 px | a quick flick changes the page sooner |
| `RAIL_GAP_PX` | 24 | gap between the two pages |
| `COMMIT_MS`, `COMMIT_MIN_MS` | 170, 90 | time a committed swipe takes to finish (less when the finger did most of it) |
| `ENTER_OFFSET_PX` | 28 | slide-in distance for a page reached without a swipe |

Other thresholds:

| Gesture | Rule | Where |
| --- | --- | --- |
| Month row | 24 px = one month per swipe; ignored while the picker is open | `MonthNavigator.tsx` |
| Sheet drag-to-close | closes past **56 px** (`DISMISS_PX`), or on a downward flick faster than **0.3 px/ms** past 10 px (`FLICK_SPEED`, `FLICK_MIN_PX`) | `Modal.tsx` |
| Release speed | measured over the last 120 ms of movement; a finger that rested 90 ms before lifting has none | `src/lib/velocity.ts` |

After a swipe-close the next tap can never be lost: the closing sheet takes no input, the next press ends its animation, and a swallowed click is re-sent (*tap rescue*). Details in [motion.md](motion.md#sheets-modaltsx).

## Back

`src/lib/back.ts` keeps a stack of *layers*: things Back should dismiss. `Modal` pushes one while open, `MonthNavigator` while its picker is open (`useBackLayer`), and `App.tsx` pushes "not on the Month page" when the app is installed (`isAppShell()`). Back dismisses the top layer.

| Platform | Mechanism | With no layer left |
| --- | --- | --- |
| Android app | `@capacitor/app` `backButton` event -> `handleBack()` | `App.minimizeApp()`: the app goes to the background, state kept |
| Browser tab, installed PWA | one extra history entry (the *sentinel*, `history.state.koinkLayer`) exists while any layer is open; Back pops it -> `popstate` -> top layer dismissed | Back is the browser's own |

Details that matter when changing it:

- History is reconciled on a `setTimeout(0)`, never synchronously: a sheet that closes while another opens leaves one layer, and nothing moves.
- Closing the last layer from the page (X, scrim, drag) removes the sentinel with `history.back()`; the resulting `popstate` is recognised by the `awaitingPop` flag and ignored.
- Back only *asks* the top layer to close; the layer leaves the stack when its owner really closes it. A layer that refuses (the entry sheet asking about unsaved input) stays, and 120 ms later (`SETTLE_MS`) Back is armed for it again. Back on the question itself means "keep editing".
- A reload keeps `history.state`; `initBackHandling()` notices a leftover sentinel and steps off it.
- In a plain browser tab Back never changes the page, only closes overlays, so the browser's Back still leaves the site as people expect.

To make something new dismissable by Back: `useBackLayer(isOpen, close)`.
