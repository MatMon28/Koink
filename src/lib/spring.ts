/*
 * Spring physics for the app's motion. A damped spring is sampled into a CSS `linear()` easing, so
 * CSS transitions, keyframes and Web Animations all follow the same curve, overshoot included.
 * Browsers without `linear()` keep the cubic-bezier approximations declared in index.css.
 * See docs/motion.md.
 */
export interface SpringEase {
  /** CSS easing function. */
  easing: string;
  /** Milliseconds until the spring has settled to within 1 % of its target. */
  duration: number;
}

const SAMPLES = 40;

/** Position of a unit-mass damped spring released from 0 towards 1, after `t` seconds. */
function response(t: number, stiffness: number, damping: number): number {
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
}

/** Builds a spring from stiffness and damping (underdamped: damping < 2 * sqrt(stiffness)). */
export function makeSpring(stiffness: number, damping: number): SpringEase {
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  // The envelope decays as exp(-zeta * w0 * t); 1 % is left after ln(100) / (zeta * w0) seconds.
  const seconds = Math.log(100) / (zeta * w0);
  const values: string[] = [];
  for (let i = 0; i < SAMPLES; i += 1) {
    values.push(response((i / (SAMPLES - 1)) * seconds, stiffness, damping).toFixed(4));
  }
  values[0] = '0';
  values[SAMPLES - 1] = '1';
  return { easing: `linear(${values.join(', ')})`, duration: Math.round(seconds * 1000) };
}

const FALLBACK: { soft: SpringEase; bounce: SpringEase } = {
  soft: { easing: 'cubic-bezier(0.22, 1, 0.36, 1)', duration: 260 },
  bounce: { easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)', duration: 300 },
};

const supportsLinear = (): boolean =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('transition-timing-function', 'linear(0, 1)');

/**
 * `soft`: about 3 % overshoot, settles in about 270 ms (pages, sheets, values).
 * `bounce`: about 20 % overshoot, about 300 ms (pressed controls, the dock, switches).
 */
export const SPRING: { soft: SpringEase; bounce: SpringEase } = supportsLinear()
  ? { soft: makeSpring(520, 34), bounce: makeSpring(950, 31) }
  : FALLBACK;

/** Publishes the curves as `--ease-soft`, `--dur-soft`, `--ease-bounce`, `--dur-bounce` on <html>. */
export function applyMotionTokens(): void {
  const style = document.documentElement.style;
  style.setProperty('--ease-soft', SPRING.soft.easing);
  style.setProperty('--dur-soft', `${SPRING.soft.duration}ms`);
  style.setProperty('--ease-bounce', SPRING.bounce.easing);
  style.setProperty('--dur-bounce', `${SPRING.bounce.duration}ms`);
}
