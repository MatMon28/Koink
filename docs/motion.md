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
| Dock | enters from the side the page came from (`--kc-swipe-dir`), hides on scroll down |
| Month change | the Month page's content slides in from the side of the newer month |
| A changed total (`.anim-value`) | settles in from 7 px below |
| Collapsible cards and settings groups | height animated with a CSS grid (`.accordion-grid`), 300 ms |
| Launch | [launch-intro.md](launch-intro.md) |

## Sheets (`Modal.tsx`)

- **In:** rises 28 px with the soft curve (`.anim-dialog`), the scrim fades in.
- **Dragged:** follows the finger; a refused or short drag springs back with the soft curve.
- **Out:** shrinks into the dock button that opened it (which answers with a small pulse), or drops 48 px and fades when there is no such button. The exit is short on purpose:

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

## Reduced motion

With `prefers-reduced-motion: reduce`: the launch animation is not shown, CSS animation classes are switched off (`index.css`), and the JS-driven animations (page swipe, sheet exit, month slide) apply their end state directly (`prefersReducedMotion()` checks in each file). Dragging still follows the finger.
