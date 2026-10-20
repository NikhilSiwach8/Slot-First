/** Seeded PRNG (sfc32). The demo uses it in place of RGS books; the outcome logic is identical. */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    this.a = 0x9e3779b9;
    this.b = 0x243f6a88;
    this.c = 0xb7e15162;
    this.d = seed >>> 0;
    for (let i = 0; i < 15; i++) this.next();
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    const t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    const r = (t + this.d) | 0;
    this.c = (this.c + r) | 0;
    return (r >>> 0) / 4294967296;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  weighted<T extends string>(weights: Partial<Record<T, number>>): T {
    let total = 0;
    for (const k in weights) total += weights[k as T] ?? 0;
    let r = this.next() * total;
    for (const k in weights) {
      r -= weights[k as T] ?? 0;
      if (r < 0) return k as T;
    }
    return Object.keys(weights)[0] as T;
  }
}
