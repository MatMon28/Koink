# Gestures and Back

> **Scope:** every touch gesture, which controls keep their own, the edge reservation, the sensitivity numbers, and what Back does on each platform.
>
> **Read when:** you change swipe handling in `PageSwiper.tsx`, `MonthNavigator.tsx` or `Modal.tsx`, or Back handling in `src/lib/back.ts`.
>
> **Related:** [motion.md](motion.md) (how things move once a gesture decided), [android.md](android.md)

## The gestures

| Gesture | Where | Result | Code |
| --- | --- | --- | --- |
| Swipe left / right | anywhere on a page | the page and its neighbour move together under the finger; release to change page (order of the header pill); the pill changes the moment the swipe is committed, not when the page has landed (`pillTab.ts`) | `PageSwiper.tsx`, `lib/pillTab.ts` |
| Swipe left / right | the month row | next / previous month (what the arrows do) | `MonthNavigator.tsx` |
| Drag down | a sheet's handle or title bar | closes the sheet; a sheet with unsaved input springs back at once and asks first | `Modal.tsx`, `TxSheet.tsx` |
| Tap | the logo in the header | one of five press animations plays on the pig and its coin (and Month / scroll to top) | `Header.tsx`, `index.css` |
| Swipe sideways | the *Days* view of Transactions | scrolls from day to day; the page swipe stays off there | `TransactionsView.tsx` (`data-no-swipe`) |
| Hold | backspace of a number pad | clears the figure | `ui.tsx` (`NumPad`) |
| Back (button, back swipe, browser Back) | anywhere | closes the top sheet or the month picker; installed: then returns to Month | `back.ts` |
| Tap | the launch animation | skips it | `intro.ts` |
| Hold | `+` / `-` of an amount stepper | repeats the step | `ui.tsx` (`AmountStepper`) |
| Scroll down / up | page | the header folds to the page pill; the bottom dock (Month page only) stays where it is | `Header.tsx`, `ActionDock.tsx` |
| Any new touch or key | while an animation of a gesture runs | the animation ends at once ([motion.md](motion.md#ending-an-animation-early)); a swipe that was finishing lands the new page and the touch swipes from it; a slide-in or spring-back is *caught* where it is and follows the finger at once (see below) | `PageSwiper.tsx`, `Modal.tsx`, `lib/interrupt.ts` |
| Tap the scrim, Escape | open sheet | closes it (or asks, see above) | `Modal.tsx` |
| Swipe down | the **chart settings popup** (grip row and title, the dimmed area, and anywhere on the popup when it does not scroll) | closes it: it follows the finger and fades, closes past 72 px or on a flick, otherwise springs back; read in the popup's own axes, so also inside the full view turned sideways | `ChartPopup.tsx`, `lib/chartTurn.ts` |
| Pinch, Ctrl / trackpad wheel, drag | the chart in the large view of *Expenses over time* | zoom around the point between the fingers; move, with a glide | `ChartLargeView.tsx` |
| Swipe down | the title bar or the chart in the large view | closes it (follows the finger, fades; springs back if short); read in the view's own axes, so also when turned sideways | `ChartLargeView.tsx` |

Settings no longer shows a gestures list (it was removed); this page is the only reference.

## Page swipe: the rail

Both pages ride one rail. While the finger drags, the neighbouring page sits 24 px beside the current one and moves with it, showing its top however far the current page was scrolled. Released past the commit distance, or flicked, the rail finishes its travel and the neighbour's element *becomes* the current page (same React key: nothing is mounted twice, its state is kept, the scroll position resets without a jump). Otherwise both spring back.

On touch devices the neighbours of the current page are mounted, hidden and `inert`, in an idle moment after each page change (`warm` in `PageSwiper.tsx`), so a swipe never starts with a pause. With a mouse only, nothing is pre-mounted.

Finger and pen only (a mouse drag does nothing). Vertical movement stays normal scrolling (`touch-action: pan-y`). The swipe does **not** start:

- within **20 px of the left or right screen edge**: that strip belongs to the system's own back swipe;
- on `input`, `textarea`, `select`, `contenteditable`, `[role="slider"]`, or anything inside **`[data-no-swipe]`** (the month row has it);
- inside an element that can itself scroll sideways;
- while a sheet is open, or with a second finger.

A drag that turned into a swipe never also taps what was under the finger. At the first and last page the page only stretches a little and springs back. A page reached by the pill or by Back slides in from the side it lies on. With `prefers-reduced-motion` the page changes without animation.

### Catching the rail (a new gesture during an animation)

No touch is ignored. Whatever the rail is doing when a finger lands on it:

| The rail is... | The new touch... |
| --- | --- |
| springing back after a cancelled swipe, or sliding in after the pill / Back | catches it where it is (`grab()`), locks the swipe at once and carries on from that offset, in either direction; released without moving it rests |
| finishing a committed swipe | lands the new page now (`promote()`), then swipes normally from it, so a quick second swipe goes on to the next page |
| anywhere else on screen (header, dock, another control) | ends the animation at once |

A key press always ends it. One touch still changes at most one page.

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
| `EXIT_MAX_MS`, `COMMIT_MIN_MS`, `EXIT_MIN_SPEED` | 220, 90, 1.4 px/ms | a committed swipe finishes its travel in `remaining / max(release speed, EXIT_MIN_SPEED)`, kept between 90 and 220 ms |
| `CATCH_TAP_PX` | 4 | a rail caught mid-animation that the finger did not move afterwards rests instead of committing |
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

## A second swipe during the first

While a committed swipe is still travelling (about 170 ms), a new touch **lands the new page at once** (every touch ends a running animation) and then **swipes normally from that page**: two quick swipes in a row go two pages. One touch still never changes the page twice, because a swipe is only decided when the finger lifts.

History: the round before this one made that touch "used up" (it landed the first page and then could not swipe at all), so a quick second swipe was simply ignored and the gesture still felt broken. The `spentPointer` guard is gone. What `PageSwiper.tsx` does now:

- `running.current.commit` marks the last stretch of a committed swipe; the document-level capture listener (`endNow`) ends it on `pointerdown`, `touchstart` or `keydown`. It runs *before* the page's own `pointerdown`, so the new gesture starts on the page that has just arrived.
- `promote()` (the page change at the end of a swipe) is always a `flushSync`: the new page is current, the rail is at rest, `leaving` is cleared and the pill is in step in the same frame, whether the swipe finished by itself or was cut short. There is no moment in which a touch could meet a half-changed state.
- The spring back of a cancelled swipe and the slide-in after the pill are not committed swipes: a swipe started during them works as before (they simply end at once).
