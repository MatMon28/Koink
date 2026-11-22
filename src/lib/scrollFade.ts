/**
 * Border fade for scrollable fields: an element marked `data-scroll-fade="y"` (vertical) or `"x"` (horizontal)
 * fades out at the edge that still has content beyond it, and shows no fade at an edge it has scrolled to.
 * That tells the eye "there is more, scroll". The fade itself is CSS (`[data-scroll-fade][data-fading]` in
 * src/index.css, a mask); this file only measures, so a field needs nothing but the attribute.
 *
 * `startScrollFade()` runs once (src/main.tsx). A capture-phase scroll listener, a ResizeObserver per marked
 * element and a MutationObserver (children added or removed, attribute added) keep every marked element current;
 * the work is batched into one animation frame.
 */

const SELECTOR = '[data-scroll-fade]';
/** Distance in px from an edge below which that edge counts as reached. */
const EDGE = 2;

/** Which of the two edges of `el` (start = top / left, end = bottom / right) have more content beyond them. */
export function fadeEdges(el: { scrollTop: number; scrollLeft: number; scrollHeight: number; scrollWidth: number; clientHeight: number; clientWidth: number }, axis: 'x' | 'y'): { start: boolean; end: boolean } {
  const pos = axis === 'y' ? el.scrollTop : el.scrollLeft;
  const max = (axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth);
  if (max <= EDGE) return { start: false, end: false };
  return { start: pos > EDGE, end: max - pos > EDGE };
}

function update(el: HTMLElement): void {
  const axis = el.dataset.scrollFade === 'x' ? 'x' : 'y';
  const { start, end } = fadeEdges(el, axis);
  el.style.setProperty('--fade-start', start ? 'var(--fade-size)' : '0px');
  el.style.setProperty('--fade-end', end ? 'var(--fade-size)' : '0px');
  if (start || end) el.setAttribute('data-fading', '');
  else el.removeAttribute('data-fading');
}

let started = false;

export function startScrollFade(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  const watched = new WeakSet<Element>();
  let frame = 0;

  const resizes = new ResizeObserver((entries) => {
    for (const entry of entries) update(entry.target as HTMLElement);
  });

  const sweep = () => {
    frame = 0;
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
      if (!watched.has(el)) {
        watched.add(el);
        resizes.observe(el);
      }
      update(el);
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(sweep);
  };

  // Scroll events do not bubble, but they can be caught on the way down.
  document.addEventListener('scroll', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute('data-scroll-fade')) update(target);
  }, { capture: true, passive: true });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-scroll-fade'] });
  window.addEventListener('resize', schedule);
  schedule();
}
