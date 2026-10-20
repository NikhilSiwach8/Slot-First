import type { Ticker } from 'pixi.js';

// Tiny tween engine on the Pixi ticker. Every duration is scaled by `clock.speed` (turbo,
// skip), read on every frame, so a skip mid-animation speeds up what is already running.

export const clock = {
  speed: 1, // 1 = normal; turbo and skip raise it
  base: 1, // dev-only playback multiplier (?speed=)
  turbo: false,
  skipping: false,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  ticker: null as Ticker | null,
};

export function setSkipping(on: boolean): void {
  clock.skipping = on;
  clock.speed = clock.base * (on ? 6 : clock.turbo ? 2.2 : 1);
}

export function setTurbo(on: boolean): void {
  clock.turbo = on;
  if (!clock.skipping) clock.speed = clock.base * (on ? 2.2 : 1);
}

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2,
  outElastic: (t: number) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

/** Run `fn(eased progress)` every frame for `ms` (scaled by clock.speed). */
export function animate(ms: number, fn: (t: number) => void, easing: (t: number) => number = ease.outCubic): Promise<void> {
  return new Promise((resolve) => {
    const ticker = clock.ticker;
    if (!ticker || ms <= 0) {
      fn(1);
      resolve();
      return;
    }
    let elapsed = 0;
    const tick = (t: Ticker) => {
      elapsed += t.deltaMS * clock.speed;
      const p = Math.min(1, elapsed / ms);
      fn(easing(p));
      if (p >= 1) {
        ticker.remove(tick);
        resolve();
      }
    };
    ticker.add(tick);
  });
}

type Num = Record<string, number>;

/** Tween numeric properties of an object (e.g. a sprite's x, y, alpha). */
export function tween(target: object, to: Record<string, number>, ms: number, easing = ease.outCubic): Promise<void> {
  const from: Num = {};
  const t = target as unknown as Num;
  for (const k in to) from[k] = t[k];
  return animate(ms, (p) => {
    for (const k in to) t[k] = from[k] + (to[k] - from[k]) * p;
  }, easing);
}

export function wait(ms: number): Promise<void> {
  return animate(ms, () => {}, ease.linear);
}
