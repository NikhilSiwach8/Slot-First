// Generates the Stake Engine math publication files for one bet mode, or all of them.
//
//   npm run books                         # every mode, one after another
//   npm run books -- --mode base          # one mode (run several in parallel to save time)
//   npm run books -- --index              # only (re)write index.json from the modes on disk
//
// Output, in stake/math/ (upload this folder as it is):
//   index.json, books_<mode>.jsonl.zst, lookUpTable_<mode>_0.csv
// Reports for review go to math/reports/ (not uploaded).
//
// Method (the same idea as the Math SDK's distributions + optimizer):
// 1. Play N rounds of the mode with the real reels. Each round is one book.
// 2. Add a few 50,000× books, and real big wins for any high win range the natural books
//    left empty. They are rounds of the same engine played on boosted reel sets (the SDK
//    does this with dedicated win-cap reel sets).
// 3. Give those books fixed, declared probabilities, and weight every other book by
//    (1 + payout)^λ with λ solved so the mode's RTP is exactly the target. A small λ keeps
//    the natural distribution almost untouched.
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { constants, createZstdCompress } from 'node:zlib';
import { MAX_WIN, MODES, REELSETS, RTP_TARGET, type Mode, type ReelSet } from '../src/engine/config';
import { hydrate, toPublished } from '../src/engine/book';
import { Rng } from '../src/engine/rng';
import { playRound, type ReelOverrides } from '../src/engine/round';

const MATH_VERSION = '1.0.0';
const OUT = process.env.BOOKS_OUT ?? 'stake/math';
const REPORTS = process.env.BOOKS_REPORTS ?? 'math/reports';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

interface Plan {
  books: number;
  /** Probability of a 50,000× round. */
  maxWinChance: number;
  maxWinBooks: number;
}

export const PLANS: Record<Mode, Plan> = {
  base: { books: 500_000, maxWinChance: 1 / 8_000_000, maxWinBooks: 12 },
  ante: { books: 500_000, maxWinChance: 1 / 6_000_000, maxWinBooks: 12 },
  buyMatinee: { books: 150_000, maxWinChance: 1 / 500_000, maxWinBooks: 12 },
  buyMidnight: { books: 120_000, maxWinChance: 1 / 200_000, maxWinBooks: 12 },
  buyLightsOut: { books: 100_000, maxWinChance: 1 / 60_000, maxWinBooks: 12 },
};

const MODE_ORDER = Object.keys(MODES) as Mode[];
const seedOf = (mode: Mode, i: number) => (MODE_ORDER.indexOf(mode) * 600_000_000 + i) >>> 0;

const boost = (rs: ReelSet): ReelSet => ({
  ...rs,
  weights: { ...rs.weights, W: (rs.weights.W ?? 1) * 4, H1: (rs.weights.H1 ?? 1) * 2, H2: (rs.weights.H2 ?? 1) * 2 },
  match: 0.06,
});
/** Boosted reel sets, used only to find max-win rounds. */
const MAX_WIN_REELS: ReelOverrides = {
  base: { ...REELSETS.base, ticket: 0.7 },
  ante: { ...REELSETS.ante, ticket: 0.7 },
  matinee: boost(REELSETS.matinee),
  midnight: boost(REELSETS.midnight),
  lightsOut: boost(REELSETS.lightsOut),
};

/** Solve λ so that Σ p·w(λ)/Σ w(λ) hits `target` (bisection; the mean rises with λ). */
function solveTilt(pays: Float64Array, target: number): number {
  const mean = (l: number) => {
    let sw = 0;
    let swp = 0;
    for (const p of pays) {
      const w = Math.exp(l * Math.log1p(p));
      sw += w;
      swp += w * p;
    }
    return swp / sw;
  };
  let lo = -1;
  let hi = 1;
  if (mean(lo) > target || mean(hi) < target) throw new Error(`target mean ${target} is out of reach (${mean(lo)}..${mean(hi)})`);
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (mean(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

async function exportMode(mode: Mode): Promise<void> {
  const rules = MODES[mode];
  const plan = { ...PLANS[mode], books: Number(arg('books') ?? PLANS[mode].books) };
  const t0 = Date.now();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(REPORTS, { recursive: true });

  const zstd = createZstdCompress({ params: { [constants.ZSTD_c_compressionLevel]: Number(arg('level') ?? 19), [constants.ZSTD_c_windowLog]: 25 } });
  const file = createWriteStream(join(OUT, `books_${rules.rgs}.jsonl.zst`));
  zstd.pipe(file);
  const write = async (line: string) => {
    if (!zstd.write(line + '\n')) await new Promise<void>((r) => zstd.once('drain', () => r()));
  };

  const pays: number[] = []; // × base stake, by id - 1
  /** Fixed-probability group of each book: -1 = natural (tilted), otherwise an index into `groups`. */
  const group: number[] = [];
  const groups: { label: string; probability: number }[] = [];
  let naturalMax = 0;
  let id = 0;
  const add = async (book: ReturnType<typeof playRound>, g: number, check: boolean) => {
    const pub = toPublished(book, ++id);
    if (check) hydrate(pub.events, pub.payoutMultiplier); // spot-check the book format
    pays.push(pub.payoutMultiplier / 100);
    group.push(g);
    await write(JSON.stringify(pub));
  };

  // 1. Natural rounds on the real reels. Natural max wins join the max-win group.
  groups.push({ label: `${MAX_WIN}×`, probability: plan.maxWinChance });
  for (let i = 0; i < plan.books; i++) {
    const book = playRound(new Rng(seedOf(mode, i + 1)), mode);
    if (book.capped) naturalMax++;
    await add(book, book.capped ? 0 : -1, i % 997 === 0);
    if ((i + 1) % 50_000 === 0) console.log(`  ${rules.rgs}: ${i + 1}/${plan.books} books`);
  }

  // 2. Boosted-reel rounds: the max-win books, and real big wins for any high win range the
  //    natural books left (nearly) empty, so there's no gap below the max win. Each filled
  //    range gets a declared probability that steps down toward the max win.
  let seed = 4_000_000_000 - MODE_ORDER.indexOf(mode) * 10_000_000;
  const boosted = () => playRound(new Rng(seed--), mode, MAX_WIN_REELS);
  for (let k = 0; k < plan.maxWinBooks; k++) {
    let book = boosted();
    while (!book.capped) book = boosted();
    await add(book, 0, true);
  }
  const FILL = [
    { lo: 20_000, hi: MAX_WIN, factor: 3 },
    { lo: 10_000, hi: 20_000, factor: 8 },
    { lo: 5_000, hi: 10_000, factor: 20 },
    { lo: 2_000, hi: 5_000, factor: 60 },
    { lo: 1_000, hi: 2_000, factor: 150 },
    { lo: 500, hi: 1_000, factor: 300 },
  ];
  for (const f of FILL) {
    const have = pays.slice(0, plan.books).filter((p) => p >= f.lo && p < f.hi).length;
    if (have >= 3) continue;
    const g = groups.push({ label: `${f.lo}–${f.hi}×`, probability: plan.maxWinChance * f.factor }) - 1;
    for (let k = 0; k < 4; k++) {
      let book = boosted();
      while (book.capped || book.payout < f.lo || book.payout >= f.hi) book = boosted();
      await add(book, g, true);
    }
  }
  zstd.end();
  await new Promise<void>((r) => file.on('close', () => r()));
  const total = pays.length;

  // 3. Weights: fixed groups get their declared probability, split evenly; the natural books
  //    share the rest, tilted by (1 + payout)^λ so the RTP is exactly the target.
  const members = groups.map((_, g) => group.flatMap((x, i) => (x === g ? [i] : [])));
  const fixedP = groups.reduce((s, x) => s + x.probability, 0);
  const fixedPay = groups.reduce((s, x, g) => s + (x.probability * members[g].reduce((a, i) => a + pays[i], 0)) / members[g].length, 0);
  const rest = group.flatMap((x, i) => (x === -1 ? [i] : []));
  const restMeanTarget = (RTP_TARGET * rules.cost - fixedPay) / (1 - fixedP);
  const lambda = solveTilt(Float64Array.from(rest, (i) => pays[i]), restMeanTarget);

  const SCALE = 2 ** 50;
  const weights = new Array<bigint>(total);
  let sw = 0;
  for (const i of rest) sw += Math.exp(lambda * Math.log1p(pays[i]));
  for (const i of rest) weights[i] = BigInt(Math.max(1, Math.round(((1 - fixedP) * Math.exp(lambda * Math.log1p(pays[i]))) / sw * SCALE)));
  groups.forEach((x, g) => { for (const i of members[g]) weights[i] = BigInt(Math.max(1, Math.round((x.probability / members[g].length) * SCALE))); });
  const isMax = (i: number) => group[i] === 0;

  const csv: string[] = [];
  let W = 0n;
  let WP = 0n;
  for (let i = 0; i < total; i++) {
    const pm = BigInt(Math.round(pays[i] * 100));
    csv.push(`${i + 1},${weights[i]},${pm}`);
    W += weights[i];
    WP += weights[i] * pm;
  }
  writeFileSync(join(OUT, `lookUpTable_${rules.rgs}_0.csv`), csv.join('\n') + '\n');

  // Report.
  const prob = (i: number) => Number(weights[i]) / Number(W);
  const rtp = Number((WP * 1_000_000_000n) / W) / 1e9 / 100 / rules.cost;
  let hit = 0;
  let mean = 0;
  let sq = 0;
  let pmax = 0;
  let naturalMean = 0;
  const ranges = [0.01, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  const rangeProb = new Array(ranges.length).fill(0);
  const rangeBooks = new Array(ranges.length).fill(0);
  for (let i = 0; i < total; i++) {
    const p = prob(i);
    if (pays[i] > 0) hit += p;
    mean += p * pays[i];
    sq += p * pays[i] * pays[i];
    if (isMax(i)) pmax += p;
    if (i < plan.books) naturalMean += pays[i] / plan.books;
    let r = -1;
    for (let k = 0; k < ranges.length; k++) if (pays[i] >= ranges[k]) r = k;
    if (r >= 0) { rangeProb[r] += p; rangeBooks[r]++; }
  }
  const report = {
    mode: rules.rgs, name: rules.name, cost: rules.cost, mathVersion: MATH_VERSION,
    books: total, naturalBooks: plan.books, maxWinBooks: members[0].length, naturalMaxWinBooks: naturalMax,
    fixedGroups: groups.map((x, g) => ({ ...x, books: members[g].length })),
    rtp, naturalRtp: naturalMean / rules.cost, lambda,
    hitRate: hit, hitOneIn: 1 / hit,
    maxWin: MAX_WIN, maxWinProbability: pmax, maxWinOneIn: 1 / pmax,
    stdDev: Math.sqrt(sq - mean * mean) / rules.cost,
    winRanges: ranges.map((lo, k) => ({ from: lo, to: ranges[k + 1] ?? null, probability: rangeProb[k], oneIn: rangeProb[k] ? 1 / rangeProb[k] : null, books: rangeBooks[k] })),
    seconds: (Date.now() - t0) / 1000,
  };
  writeFileSync(join(REPORTS, `${rules.rgs}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(`${rules.rgs}: RTP ${(rtp * 100).toFixed(4)}% (natural ${(report.naturalRtp * 100).toFixed(2)}%, λ ${lambda.toFixed(4)}) | hit 1 in ${report.hitOneIn.toFixed(2)} | max win 1 in ${Math.round(report.maxWinOneIn).toLocaleString('en-US')} | ${report.seconds.toFixed(0)}s`);
}

function writeIndex(): void {
  const modes = MODE_ORDER.filter((m) => existsSync(join(OUT, `lookUpTable_${MODES[m].rgs}_0.csv`))).map((m) => ({
    name: MODES[m].rgs,
    cost: MODES[m].cost,
    events: `books_${MODES[m].rgs}.jsonl.zst`,
    weights: `lookUpTable_${MODES[m].rgs}_0.csv`,
  }));
  // Costs are written as floats ("1.0") to match the documented index.json schema.
  const json = JSON.stringify({ modes }, null, 2).replace(/"cost": (\d+)\n/g, '"cost": $1.0\n').replace(/"cost": (\d+),/g, '"cost": $1.0,');
  writeFileSync(join(OUT, 'index.json'), json + '\n');

  // The rules page shows RTP, cost and max-win odds per mode from the published tables.
  const published: Record<string, unknown> = { mathVersion: MATH_VERSION, maxWin: MAX_WIN, modes: {} };
  for (const m of MODE_ORDER) {
    const path = join(REPORTS, `${MODES[m].rgs}.json`);
    if (!existsSync(path)) continue;
    const r = JSON.parse(readFileSync(path, 'utf8'));
    (published.modes as Record<string, unknown>)[m] = { rgs: r.mode, cost: r.cost, rtp: r.rtp, hitOneIn: r.hitOneIn, maxWinOneIn: r.maxWinOneIn };
  }
  if (!process.env.BOOKS_OUT) writeFileSync('src/engine/published.json', JSON.stringify(published, null, 2) + '\n');
  console.log(`index.json: ${modes.map((m) => m.name).join(', ')}`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--index')) return writeIndex();
  const only = arg('mode');
  const modes = only ? (only.split(',') as Mode[]) : MODE_ORDER;
  for (const m of modes) await exportMode(m);
  writeIndex();
}

void main();
