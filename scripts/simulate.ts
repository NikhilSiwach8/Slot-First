// Monte Carlo simulation of every bet mode.
// npm run simulate -- --rounds 200000 --mode base --seed 1
import { MAX_WIN, MODES, PAYTABLE, type Mode } from '../src/engine/config';
import { Rng } from '../src/engine/rng';
import { playRound } from '../src/engine/round';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const rounds = Number(arg('rounds', '200000'));
const seed = Number(arg('seed', '1'));
const only = arg('mode', 'all');
const scale = Number(arg('scale', '1'));
if (scale !== 1) for (const k in PAYTABLE) PAYTABLE[k] = PAYTABLE[k].map((v) => v * scale) as [number, number, number, number];
const modes = (only === 'all' ? Object.keys(MODES) : only.split(',')) as Mode[];

for (const mode of modes) {
  const rng = new Rng(seed);
  const cost = MODES[mode].cost;
  let paid = 0;
  let won = 0;
  let hits = 0;
  let shows = 0;
  let showWin = 0;
  let capped = 0;
  let encoreRounds = 0;
  let fullCircles = 0;
  let maxWin = 0;
  let sumSq = 0;
  const t0 = Date.now();
  for (let i = 0; i < rounds; i++) {
    const book = playRound(rng, mode);
    paid += cost;
    won += book.payout;
    sumSq += book.payout * book.payout;
    if (book.payout > 0) hits++;
    if (book.capped) capped++;
    maxWin = Math.max(maxWin, book.payout);
    let acts = 0;
    for (const e of book.events) {
      if (e.type === 'showEnd') { shows++; showWin += e.showWin; fullCircles += e.fullCircles; }
      if (e.type === 'act' && e.act > 1) acts++;
    }
    if (acts) encoreRounds++;
  }
  const rtp = won / paid;
  const mean = won / rounds;
  const sd = Math.sqrt(sumSq / rounds - mean * mean);
  const ci = (1.96 * sd) / Math.sqrt(rounds) / cost;
  console.log(
    [
      `${mode.padEnd(13)} RTP ${(rtp * 100).toFixed(2)}% ±${(ci * 100).toFixed(2)}`,
      `hit 1 in ${(rounds / hits).toFixed(2)}`,
      `shows ${shows ? `1 in ${(rounds / shows).toFixed(0)}` : '-'} avg ${shows ? (showWin / shows).toFixed(1) : '-'}×`,
      `show share ${((showWin / won) * 100).toFixed(1)}%`,
      `encore rounds ${((encoreRounds / rounds) * 100).toFixed(1)}%`,
      `full circles ${fullCircles}`,
      `max ${maxWin.toFixed(1)}×`,
      `capped ${capped} (cap ${MAX_WIN}×)`,
      `sd ${sd.toFixed(1)}`,
      `${((Date.now() - t0) / 1000).toFixed(1)}s`,
    ].join(' | '),
  );
}
