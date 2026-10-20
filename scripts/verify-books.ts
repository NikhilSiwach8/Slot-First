// Independently checks the Stake Engine upload folder (stake/math/) using only the files.
//   npm run books:verify                 # every book is replayed through the engine
//   npm run books:verify -- --sample 50  # replay every 50th book (plus all max-win books)
//
// Checks, per mode:
//   format   index.json schema; every book has id, events, payoutMultiplier (integer);
//            ids run 1..N in order; CSV rows are exactly three unsigned integers.
//   match    CSV payout equals the book's payoutMultiplier for every id, with no extra or
//            missing ids.
//   stats    RTP 90–98% and every mode within 0.5% of the others; non-zero hit rate better
//            than 1 in 20 for the base modes; max payout equals the declared max win and is
//            more frequent than 1 in 10,000,000; no empty win range between 1× and the max;
//            100,000–1,000,000 books.
//   replay   books are rebuilt with the game engine (shadows, ink, every way-win) and must
//            reproduce their own payout.
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { createZstdDecompress } from 'node:zlib';
import { hydrate, type PubBook } from '../src/engine/book';
import { MAX_WIN } from '../src/engine/config';

const DIR = process.env.BOOKS_OUT ?? 'stake/math';
const i = process.argv.indexOf('--sample');
const SAMPLE = i >= 0 ? Number(process.argv[i + 1]) : 1;

interface IndexMode { name: string; cost: number; events: string; weights: string }

const problems: string[] = [];
const fail = (mode: string, msg: string) => { problems.push(`${mode}: ${msg}`); console.log(`  ✗ ${msg}`); };
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

async function checkMode(m: IndexMode): Promise<number> {
  console.log(`\n${m.name} (cost ${m.cost})`);
  // Lookup table.
  const rows = readFileSync(join(DIR, m.weights), 'utf8').trimEnd().split('\n');
  const weights: bigint[] = [];
  const csvPay: bigint[] = [];
  let badRows = 0;
  rows.forEach((row, k) => {
    const parts = row.split(',');
    if (parts.length !== 3 || !parts.every((p) => /^\d+$/.test(p)) || Number(parts[0]) !== k + 1) { badRows++; return; }
    weights.push(BigInt(parts[1]));
    csvPay.push(BigInt(parts[2]));
  });
  if (badRows) fail(m.name, `${badRows} malformed CSV rows`); else ok(`${rows.length.toLocaleString('en-US')} CSV rows, all uint64 id,weight,payout with ids 1..N`);

  // Books, streamed.
  const lines = createInterface({ input: createReadStream(join(DIR, m.events)).pipe(createZstdDecompress()), crlfDelay: Infinity });
  let n = 0;
  let mismatches = 0;
  let badFormat = 0;
  let replayed = 0;
  let replayFails = 0;
  // One example round per scenario, for Stake's review (normal win, big win, max win, loss, bonus).
  const review: Record<string, number> = {};
  const pick = (k: string, id: number) => { if (review[k] === undefined) review[k] = id; };
  for await (const line of lines) {
    if (!line) continue;
    n++;
    let b: PubBook;
    try { b = JSON.parse(line); } catch { badFormat++; continue; }
    if (b.id !== n || !Array.isArray(b.events) || !Number.isInteger(b.payoutMultiplier) || b.payoutMultiplier < 0) { badFormat++; continue; }
    if (csvPay[n - 1] === undefined || BigInt(b.payoutMultiplier) !== csvPay[n - 1]) mismatches++;
    const x = b.payoutMultiplier / 100 / m.cost;
    if (b.payoutMultiplier === 0) pick('loss', b.id);
    else if (x >= 1 && x < 5) pick('normalWin', b.id);
    else if (x >= 20 && b.payoutMultiplier < MAX_WIN * 100) pick('bigWin', b.id);
    if (b.payoutMultiplier === MAX_WIN * 100) pick('maxWin', b.id);
    if (b.events.some((e) => (e as { type?: string }).type === 'showStart')) pick('bonusTrigger', b.id);
    if (n % SAMPLE === 0 || b.payoutMultiplier === MAX_WIN * 100) {
      replayed++;
      try { hydrate(b.events, b.payoutMultiplier); } catch (e) { replayFails++; if (replayFails <= 3) console.log(`    book ${b.id}: ${(e as Error).message}`); }
    }
  }
  if (badFormat) fail(m.name, `${badFormat} books with a bad format or out-of-order id`); else ok(`${n.toLocaleString('en-US')} books, each with id, events and an integer payoutMultiplier`);
  if (n !== csvPay.length) fail(m.name, `${n} books but ${csvPay.length} CSV rows`);
  if (mismatches) fail(m.name, `${mismatches} payouts differ between books and CSV`); else ok('every CSV payout matches its book');
  if (replayFails) fail(m.name, `${replayFails} of ${replayed} replayed books did not reproduce their payout`); else ok(`${replayed.toLocaleString('en-US')} books replayed through the engine, all reproduce their payout`);
  if (n < 100_000 || n > 1_000_100) fail(m.name, `${n} books (expected 100,000–1,000,000)`);
  ok(`review events: ${Object.entries(review).map(([k, v]) => `${k} #${v}`).join(', ')}`);
  const reportPath = join(process.env.BOOKS_REPORTS ?? 'math/reports', `${m.name}.json`);
  if (existsSync(reportPath)) writeFileSync(reportPath, JSON.stringify({ ...JSON.parse(readFileSync(reportPath, 'utf8')), reviewEvents: review }, null, 2) + '\n');

  // Statistics from the integer table.
  const W = weights.reduce((a, b) => a + b, 0n);
  let WP = 0n;
  let hitW = 0n;
  let maxW = 0n;
  let maxPay = 0n;
  weights.forEach((w, k) => {
    WP += w * csvPay[k];
    if (csvPay[k] > 0n) hitW += w;
    if (csvPay[k] > maxPay) maxPay = csvPay[k];
  });
  weights.forEach((w, k) => { if (csvPay[k] === maxPay) maxW += w; });
  const rtp = Number((WP * 10n ** 12n) / W) / 1e12 / 100 / m.cost;
  const hit = Number((hitW * 10n ** 12n) / W) / 1e12;
  const maxP = Number((maxW * 10n ** 15n) / W) / 1e15;
  if (rtp < 0.9 || rtp > 0.98) fail(m.name, `RTP ${(rtp * 100).toFixed(4)}% is outside 90–98%`); else ok(`RTP ${(rtp * 100).toFixed(4)}%`);
  if (m.cost <= 1.25 && hit < 1 / 20) fail(m.name, `hit rate 1 in ${(1 / hit).toFixed(1)} is worse than 1 in 20`); else ok(`non-zero hit rate 1 in ${(1 / hit).toFixed(2)}`);
  if (Number(maxPay) !== MAX_WIN * 100) fail(m.name, `max payout ${Number(maxPay) / 100}× is not the declared ${MAX_WIN}×`);
  else if (maxP < 1e-7) fail(m.name, `max win 1 in ${Math.round(1 / maxP)} is rarer than 1 in 10,000,000`);
  else ok(`max win ${MAX_WIN.toLocaleString('en-US')}× reachable, 1 in ${Math.round(1 / maxP).toLocaleString('en-US')}`);
  const edges = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
  const empty: string[] = [];
  for (let k = 0; k < edges.length - 1; k++) {
    const lo = BigInt(edges[k] * 100);
    const hi = BigInt(edges[k + 1] * 100);
    let w = 0n;
    weights.forEach((x, j) => { if (csvPay[j] >= lo && csvPay[j] < hi) w += x; });
    if (w === 0n) empty.push(`${edges[k]}–${edges[k + 1]}×`);
  }
  // Show buys start at a show, so their smallest ranges can legitimately be empty.
  if (empty.length) (m.cost > 1.25 && empty.every((r) => Number(r.split('–')[0]) < 5) ? ok : (msg: string) => fail(m.name, msg))(`empty win ranges: ${empty.join(', ')}`);
  else ok('no empty win range between 1× and the max win');
  return rtp;
}

async function main(): Promise<void> {
  const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as { modes: IndexMode[] };
  const schemaOk = Array.isArray(index.modes) && index.modes.every((m) => typeof m.name === 'string' && typeof m.cost === 'number' && m.events.endsWith('.jsonl.zst') && m.weights.endsWith('.csv'));
  console.log(schemaOk ? `index.json ✓ ${index.modes.length} modes` : 'index.json ✗ schema');
  if (!schemaOk) problems.push('index.json schema');
  const rtps: number[] = [];
  for (const m of index.modes) rtps.push(await checkMode(m));
  const spread = Math.max(...rtps) - Math.min(...rtps);
  console.log(`\nRTP spread across modes: ${(spread * 100).toFixed(4)}% ${spread <= 0.005 ? '✓' : '✗ (must be ≤ 0.5%)'}`);
  if (spread > 0.005) problems.push('RTP spread');
  console.log(problems.length ? `\nFAILED: ${problems.length} problem(s)` : '\nALL CHECKS PASSED');
  process.exit(problems.length ? 1 : 0);
}

void main();
