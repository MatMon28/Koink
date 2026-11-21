/*
 * Release speed of a drag, shared by the page swipe and the sheets. A few recent pointer positions
 * are kept; when the finger lifts, the speed is what it did over the last moments of movement.
 * A finger that rested before lifting has no speed, however fast it moved earlier.
 */
export interface Sample {
  pos: number;
  at: number;
}

const MAX_SAMPLES = 8;
/** The stretch of movement the speed is measured over. */
const WINDOW_MS = 120;
/** Still for this long before lifting = not a flick. */
const REST_MS = 90;

export function trackSample(samples: Sample[], pos: number, at: number): void {
  samples.push({ pos, at });
  if (samples.length > MAX_SAMPLES) samples.shift();
}

/** Signed speed in px per ms at the moment of release (`releasedAt` is the pointerup time stamp). */
export function releaseSpeed(samples: Sample[], releasedAt: number): number {
  const last = samples[samples.length - 1];
  if (!last || releasedAt - last.at > REST_MS) return 0;
  const first = samples.find((sample) => last.at - sample.at <= WINDOW_MS) ?? last;
  const elapsed = last.at - first.at;
  return elapsed > 0 ? (last.pos - first.pos) / elapsed : 0;
}
