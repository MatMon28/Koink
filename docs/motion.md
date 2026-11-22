# Motion

> **Scope:** the spring curves, press feedback, how pages and sheets move, the sheet's exit and its two input guards, reduced motion.
>
> **Read when:** you touch `src/lib/spring.ts`, any animation timing in `PageSwiper.tsx` / `Modal.tsx`, or the animation classes in `src/index.css`.
>
> **Related:** [gestures.md](gestures.md) (what triggers the motion), [launch-intro.md](launch-intro.md), [design-system.md](design-system.md) (the CSS classes)

Motion is quick, follows the finger, can be interrupted at any moment and animates only `transform` and `opacity`.

## Springs (`src/lib/spring.ts`)

A damped spring is sampled into a CSS `linear()` easing, so CSS transitions, keyframes and Web Animations all use the same curve, overshoot included.

| Token | Spring | Feel | Used for |
| --- | --- | --- | --- |
| `--ease-soft`, `--dur-soft` | stiffness 520, damping 34: about 3 % overshoot, settles in about 270 ms | calm | pages, sheets springing back, changed numbers |
| `--ease-bounce`, `--dur-bounce` | stiffness 950, damping 31: about 20 % overshoot, about 300 ms | lively | pressed controls, the dock, switches, chevrons, the dock button's pulse |

`applyMotionTokens()` publishes them on `<html>` at start-up (`earlyStart.ts`). Browsers without `linear()` keep the cubic-bezier values declared in `index.css`. In TypeScript use `SPRING.soft` / `SPRING.bounce` (`{ easing, duration }`).

## What moves how

| Thing | Motion |
| --- | --- |
| A pressed button (`.pressable`) | shrinks to 90 % in 110 ms, springs back with the bounce curve; wide rows use `.pressable-soft` (98.5 %) |
| Page swipe | the current page and its neighbour move together under the finger; a committed swipe finishes in 90-170 ms, a cancelled one springs back with the soft curve ([gestures.md](gestures.md)) |
| Page reached by the pill or Back | slides in 28 px from the side it lies on, soft curve |
| Dock (Month page only) | enters from the side the page came from (`--kc-swipe-dir`, 130 ms, bounce) and leaves towards the side the page went (`.anim-dock-out`, 110 ms), as in Kakcal; starts when a swipe is committed or the pill is pressed; it never hides on scroll. `ActionDock.tsx` (`show`, phases in / out / gone) |
| Page pill | follows a committed swipe at once (`lib/pillTab.ts`); before, it changed when the page had finished travelling |
| Month change | the Month page's content slides in from the side of the newer month |
| A changed total (`.anim-value`) | settles in from 7 px below |
| Collapsible cards and settings groups | height animated with a CSS grid (`.accordion-grid`), 300 ms |
| Launch | [launch-intro.md](launch-intro.md) |

## Sheets (`Modal.tsx`)

- **In:** rises 28 px with the soft curve (`.anim-dialog`), the scrim fades in.
- **Dragged:** follows the finger; a refused or short drag springs back with the soft curve.
- **Out:** shrinks into the dock button that opened it (which answers with a small pulse), or drops 48 px and fades when there is no such button. **Profile and Settings** (`dockCenter` prop) have no button of their own: they are sucked into the **middle of the whole button bar** (`getDockCenterTarget()` in `lib/dock.ts`), the bar gives a smaller pulse (x1.05 instead of x1.16), and without a bar on screen (any page but Month) they drop away. The *New savings goal* sheet has `dockId="saving"`, so it shrinks into the pig button like the others. The exit is short on purpose:

| Constant | Value | Meaning |
| --- | --- | --- |
| `EXIT_MS.dock` / `.drop` | 130 / 110 ms | into the dock button / dropping away |
| `EXIT_MS.dockSwiped` / `.dropSwiped` | 90 / 80 ms | the same after a swipe (the finger already did part of it) |
| `PULSE_MS` | 180 ms | the button's pulse |
| `REFUSED_CLOSE_MS` | 140 ms | a swipe-close the owner refused (unsaved input) springs back after this |

- **Never in the way.** While it closes, the sheet's frame is `inert` and takes no pointer events, so the page behind is usable at once. Two document-level guards (`installInputGuards`) go further:
  1. **Skip the exit:** the next `pointerdown`, `touchstart`, `keydown` or `wheel` ends every running exit immediately (`activeExits`).
  2. **Tap rescue:** after a drag on a `touch-action: none` handle, Chromium (and the Android WebView) can swallow the `click` of the next taps. For 900 ms after a swipe-close (`TAP_RESCUE_MS`), a quick tap (under 12 px, under 700 ms) whose click has not arrived within 80 ms is sent again. A real click cancels the rescue, so normal taps are untouched.
- **Keyboard:** the sheet's frame follows `window.visualViewport` (CSS variables `--sheet-top/left/width/height` on `.kc-sheet-viewport`), so with the on-screen keyboard open the sheet sits just above it, and the focused field is scrolled into view inside the sheet.

## Ending an animation early

A new touch ends a running gesture animation at once (Kakcal: "a new press cancels the settle"). Pointerdown, touchstart and keydown are caught on `document` (capture phase):

| Animation | Ended by | What the next touch finds |
| --- | --- | --- |
| Sheet exit | `activeExits` in `Modal.tsx` | the sheet gone |
| Page rail: slide-in after pill / Back | `running` in `PageSwiper.tsx` | **caught** where it is by a finger on the rail (no jump), otherwise at rest |
| Page rail: spring back of a cancelled swipe | `running` | **caught** where it is by a finger on the rail, otherwise at rest and the neighbour removed |
| Page rail: last stretch of a committed swipe | `running` (`flushSync(promote)`) | the new page already current; the touch goes to it |
| Month slide, the dock's pulse | `endOnTouch()` in `src/lib/interrupt.ts` | the content in place |
| Dock leaving | `ActionDock.tsx` | the bar removed |
| Dock arriving | `ActionDock.tsx` (cancels its CSS animations) | the bar in place |

Since this round a finger that lands on the rail while it slides in or springs back does not wait for it and does not make it jump to rest: `PageSwiper` stops the animation, reads the rail's current offset (`railOffset`) and the finger carries on from there (the swipe starts at once, with no dead zone). A committed swipe is never caught: its new page lands now and the touch swipes from it. Keys and touches anywhere else end the animation at once. The release speed also shapes the committed exit (`EXIT_MIN_SPEED`, `EXIT_MAX_MS`), and the rail has `will-change: transform` only while it is dragged or travelling.

Other changes of the round: the **toast** now plays an exit (`anim-toast-out`, 160 ms; a newer toast takes over at once), and the **accordion** content fades with the height (`.accordion-inner`, plain CSS transitions that a tap simply turns round).

Use `endOnTouch(el.animate(...))` for a new animation whose end state is the normal state (no `fill: forwards`).

## Reduced motion

With `prefers-reduced-motion: reduce`: the launch animation is not shown, CSS animation classes are switched off (`index.css`), and the JS-driven animations (page swipe, sheet exit, month slide) apply their end state directly (`prefersReducedMotion()` checks in each file). Dragging still follows the finger.

## Smoothness fixes (sheet drag, scrolling)

What made swiping a sheet down and scrolling the page stutter, and what replaced it:

- **Sheet drag** (`Modal.tsx`): pointer moves are applied once per frame (`requestAnimationFrame`), the dialog is a permanent compositor layer (`will-change: transform`), and the scrim fades with the drag. On release the exit animation is started *first* (it runs on the compositor) and the owner's `onClose` runs once it is playing, so the re-render cannot delay the first frame. A form with unsaved input says so through `canClose` and springs back instead.
- **Sheet / toast state is its own context** (`store.tsx`): opening, closing and toasting no longer re-render Month, Transactions, Budgets or Statistics.
- **Header on scroll** (`Header.tsx`, `index.css`): only `opacity` and `transform` change, once per frame. The old version animated the name row's height, the surface padding and the radius of a `backdrop-filter` blur on every scroll event. The background is now a separate fading layer (`.kc-header-bg`) and the surface never paints (the rule uses `!important` to beat the style presets).

## Logo animation

Tapping the header logo plays one of **five press animations** on the wordmark's `kk-*` parts (`PRESS_ANIMATIONS` in `src/brand/art.js`; `animated` option of `wordmarkMarkup`): *oink* (the coin hops, turns, drops into the pig; the pig squashes, jumps and oinks, a new coin pops back), *keypress* (the pig is pressed flat like a calculator key, the snout puffs, then it springs up and launches the coin), *wink & flip* (the pig tilts its head and winks while the coin flips twice in the air), *happy hop* (the pig hops twice, ears flapping, the coin lags behind like a hat) and *turnabout* (pig and coin spin round once like a coin on a table and land with a squash). They last 1.0-1.2 s. `Header.tsx` (`press()`) picks one at random, never the one that played last, and sets `data-press="<id>"` on `.kc-logo-btn` for the length of the animation plus 100 ms; tapping again restarts it. `?press=1` to `?press=5` forces one (for checking). The rules of every animation are written once, in `art.js`, and reach the page as a `<style>` inside the wordmark's SVG (`Brand.tsx`, `pressCss()`), each scoped to its `data-press` value. Origins use `transform-box: fill-box` percentages. `index.css` only lets the SVG overflow its box (the coin leaves it) and replaces the animations with a small nod under `prefers-reduced-motion`. Self-playing copies: `public/brand/koink-press-*.svg`.

## Full chart view, settings popup (CSS transitions, `usePresence`)

- **Presence:** `usePresence(open, exitMs)` mounts the layer, paints it hidden for one frame, then flips `shown` (the transitions run), and keeps it mounted for `exitMs` after `open` ends. Reduced motion: no exit delay.
- **Large view** (`ChartLargeView.tsx`): one `ease-out` curve (`cubic-bezier(0.22, 1, 0.36, 1)`, no overshoot, so the rotation never wobbles). Open / close: the view rises 56 px and fades in (380 ms), and sinks and fades out; a swipe-close keeps sinking from where the finger let go (`exitOffset` = view height). Dragging has no transition (it follows the finger), release re-enables it, so the spring back is the same curve.
- **The turn between vertical and horizontal** is a single 480 ms transition of `transform` (`rotate(0)` to `rotate(90deg)`; the centring `translate` and the drag `translate` stay in the list so the pieces interpolate one by one), `width` / `height` (`100%` to `100dvh` / `100dvw`) and `padding` (the safe-area insets move with the rotation). The backdrop stays put and keeps the page colour, so no edge shows while the box swings. While it runs, a `requestAnimationFrame` loop keeps the data that was in the middle of the chart in the middle, and the plot does not re-measure (`freeze`) until the end.
- **Zoom buttons** glide (230 ms, ease-out cubic, geometric steps so every frame zooms by the same share, anchored on the middle); pinch and wheel follow the fingers directly. Pan keeps gliding after release (speed x 0.94 every 16 ms until 0.02 px/ms).
- **Settings popup** (`ChartPopup.tsx`): the scrim fades (190 ms), the panel fades and rises 14 px with a 0.97 scale (300 ms in, 190 ms out).
- Touches are never blocked by an exit: the closing view and popup stop taking pointer events at once.
