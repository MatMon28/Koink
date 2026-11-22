# Gestures and Back

> **Scope:** every touch gesture, which controls keep their own, the edge reservation, the sensitivity numbers, and what Back does on each platform.
>
> **Read when:** you change swipe handling in `PageSwiper.tsx`, `MonthNavigator.tsx` or `Modal.tsx`, or Back handling in `src/lib/back.ts`.
>
> **Related:** [motion.md](motion.md) (how things move once a gesture decided), [android.md](android.md)

## The gestures

| Gesture | Where | Result | Code |
| --- | --- | --- | --- |
| Swipe left / right | anywhere on a page | the page and its neighbour move together under the finger; release to change page (order of the header pill); the pill follows the pages the whole way, in every phase, and changes colour gradually; a new swipe is never ignored: it catches the rail wherever it is (see below) | `PageSwiper.tsx`, `Tabs.tsx`, `lib/pillTab.ts` |
| Swipe left / right | the month row | next / previous month (what the arrows do) | `MonthNavigator.tsx` |
| Drag down | a sheet's handle or title bar | closes the sheet; a sheet with unsaved input springs back at once and asks first | `Modal.tsx`, `TxSheet.tsx` |
| Tap | the logo in the header | one of five press animations plays on the pig and its coin (and Month / scroll to top) | `Header.tsx`, `index.css` |
| Swipe sideways | the *Days* view of Transactions | scrolls from day to day; the page swipe stays off there | `TransactionsView.tsx` (`data-no-swipe`) |
| Hold | backspace of a number pad | clears the figure | `ui.tsx` (`NumPad`) |
| Back (button, back swipe, browser Back) | anywhere | closes the top sheet or the month picker; installed: then returns to Month | `back.ts` |
| Tap | the launch animation | skips it | `intro.ts` |
| Hold | `+` / `-` of an amount stepper | repeats the step | `ui.tsx` (`AmountStepper`) |
| Scroll down / up | page | the header folds to the page pill; the bottom dock (Month page only) stays where it is | `Header.tsx`, `ActionDock.tsx` |
| Any new touch or key | while an animation of a gesture runs | the animation ends at once ([motion.md](motion.md#ending-an-animation-early)); every animation of the rail is *caught* where it is and follows the finger at once, a finishing swipe lands its page first (see below) | `PageSwiper.tsx`, `Modal.tsx`, `lib/interrupt.ts` |
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

No touch is ever ignored, and nothing waits for an animation to end. Whatever the rail is doing when a finger lands on it:

| The rail is... | The new touch... |
| --- | --- |
| springing back after a cancelled swipe, or sliding in after the pill / Back | catches it where it is (`grab()`), locks the swipe at once and carries on from that offset, in either direction; released without moving it rests |
| finishing a committed swipe | **lands the target page now and keeps the rail exactly where it visibly is** (`land(..., rebased)`): the rail's offset was `at` from the old page, which lies one place behind, so it is `at + step * travel` from the new page; the page just left becomes the neighbour on the other side and keeps showing what it showed. The finger then swipes from that page |
| anywhere else on screen (header, dock, another control) | ends the animation at once (a finishing swipe lands its page) |

A key press always ends it. What counts as "on the rail": the rail itself **and the column around it** (the 24 px gap between two pages, the margins). The page that rides beside the current one is no longer `inert` (it is `aria-hidden`, and it only exists during a swipe), because a finger that lands on it must reach the rail; the column has `touch-action: pan-y` like the rail, or the browser would claim a sideways drag from the gap and cancel the touch. Taps and clicks on controls outside the rail (`a`, `button`) in that column are left alone.

**How a release is decided.** From the finger's own travel `dx` since it landed, measured from the page that is current at that moment (after a catch, the page that has just landed), not from the rail's offset:

- `dx < 0` (finger left) means the page on the right, `dx > 0` the page on the left;
- it changes page when `|dx|` reaches the commit distance, or on a flick (speed above `FLICK_SPEED` in the same direction past `FLICK_MIN_PX`); otherwise the rail springs back to the current page;
- a touch that hardly moved (`CATCH_TAP_PX`) after a catch simply rests on the current page.

What follows from it:

| Sequence | Result |
| --- | --- |
| a quick swipe, then another the same way while the first is travelling (any delay, from the very same instant) | two pages from the start; three swipes, three pages; at the last page the rail only stretches |
| a swipe, then one the other way while the first is travelling | the first is interrupted; the second sends the rail back to the page it started from |
| a short swipe that springs back, then a swipe during the spring-back | one page, from the page that was current |
| a swipe that is too short to commit, during a committed swipe | the committed page is reached (the swipe it finishes), nothing more |

At the first and last page the rail is damped only where it goes beyond rest, so a rail caught off-centre never jumps when the finger crosses rest (`pos = lead`, or `lead * RUBBER / FOLLOW` when no page waits on that side).

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

## The pill follows the rail

`PageSwiper` publishes the rail's position for the header pill in page-order units (`lib/pillTab.ts`: `setPillPos`, `getPillPos`, `subscribePillPos`): `0` = first page, `1.5` = half way between the second and the third. It is `index of the current page - rail offset / (page width + gap)`, read from the rail itself every animation frame (`drive()`), so it is right whatever moves the rail: the finger, the exit of a committed swipe (a Web Animation), the spring back. It is clamped to the first and last page, and it is **continuous across a page change** (the offset is re-expressed at the same moment as the page), which is why chaining and turning round do not make the pill jump. While nothing moves the rail it is `null` and the pill sits on the active page; a page picked with a tap (pill, Back) glides there in 260 ms (`GLIDE_MS` in `Tabs.tsx`).

`Tabs.tsx` draws that one number, straight into the DOM (no React render per frame):

- every tab has a weight `w = max(0, 1 - |position - index|)` (`--w`): its label opens by `w` (width up to the measured label width, opacity), its padding goes from the 32 px circle to the active pill, and its text goes from the idle colour to its own ink by `w` (`color-mix`);
- one indicator sits behind the buttons, with one layer per page in that page's pastel (`kc-nav-tab-active` + the page's class, so the style presets colour it too). Its left and right edges are interpolated between the two buttons the position lies between. The layer of the page below the position is opaque, the one above fades in by the fraction: the colour mixes gradually and exactly with the pages;
- `.kc-nav-*` in `index.css` (the *Page pill* block). Nothing there may transition: the position is already animated, and a transition would lag behind the pages. The press shrink of the buttons stays.

`usePillTab()` is unchanged: it is still the page a *committed* swipe is going to (known when the finger lets go), and `App.tsx` uses it to bring the bottom dock in or out at that moment.

## History: a second swipe during the first

1. Two rounds ago a touch during a committed swipe was *used up* by it (it landed the first page and could not swipe), so a quick second swipe was ignored.
2. The next round made it land the page and swipe from rest. That fixed the ignored touch but a quick swipe was still lost when the finger landed on the neighbouring page (it was `inert`, so the touch was treated as outside the rail and ended the animation), the second swipe could only go one page from the *landed* page after the first had visibly finished, and a swipe the other way could not turn the rail round.
3. Now: the touch catches the rail wherever it is, on the rail or in its column, lands the target and re-expresses the offset (`land(..., rebased)` in `PageSwiper.tsx`), the release is decided by the finger (above), and the pill reads the same offset. No state blocks a touch: `leaving` is only true between the release and the landing, and a touch always lands first.

The spring back of a cancelled swipe and the slide-in after the pill are caught the same way (`grab()` returns the offset, the page stays current).
