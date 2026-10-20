import { describe, expect, it } from 'vitest';
import { MAX_WIN, PAYTABLE, type Sym } from '../../src/engine/config';
import { cast, grid, nextSide, type Board } from '../../src/engine/light';
import { Rng } from '../../src/engine/rng';
import { playRound } from '../../src/engine/round';
import { evaluate } from '../../src/engine/ways';

/** Board from rows written top to bottom, e.g. ['H1 L1 L2 ...', ...]. */
function board(rows: string[]): Board {
  const cells = rows.map((r) => r.trim().split(/\s+/) as Sym[]);
  return Array.from({ length: 6 }, (_, reel) => cells.map((row) => row[reel]));
}

const FILLER = [
  'L1 L2 L3 L4 L5 L1',
  'L2 L3 L4 L5 L1 L2',
  'L3 L4 L5 L1 L2 L3',
  'L4 L5 L1 L2 L3 L4',
  'L5 L1 L2 L3 L4 L5',
];

describe('cast', () => {
  it('throws a shadow onto the next cell away from the light', () => {
    const b = board(FILLER);
    b[0][2] = 'H1';
    const { shadow } = cast(b, ['left'], 1);
    expect(shadow[1][2]).toBe('H1');
    expect(shadow[2][2]).toBeNull();
  });

  it('reaches as many cells as the flame level', () => {
    const b = board(FILLER);
    b[2][0] = 'H2';
    const { shadow } = cast(b, ['top'], 3);
    expect([shadow[2][1], shadow[2][2], shadow[2][3], shadow[2][4]]).toEqual(['H2', 'H2', 'H2', null]);
  });

  it('never overwrites puppets, Tickets or Matches', () => {
    const b = board(FILLER);
    b[0][0] = 'H1';
    b[1][0] = 'H3';
    b[0][1] = 'H2';
    b[1][1] = 'S';
    const { shadow } = cast(b, ['left'], 1);
    expect(shadow[1][0]).toBeNull();
    expect(shadow[1][1]).toBeNull();
  });

  it('gives a contested cell to the higher-ranked shadow and inks overlaps of the same symbol', () => {
    const b = board(FILLER);
    b[0][2] = 'H3';
    b[2][2] = 'H1'; // right light: H1 throws onto reel 1, H3 can't (it's on the edge)
    b[3][2] = 'H1'; // and this H1 reaches reel 1 too with a Lamp
    const res = cast(b, ['right'], 2);
    expect(res.shadow[1][2]).toBe('H1');
    expect(res.inkGain[1][2]).toBe(1);
  });

  it('is order-independent and stops at the board edge', () => {
    const b = board(FILLER);
    b[5][4] = 'W';
    const res = cast(b, ['left', 'top'], 3);
    expect(res.rays.every(({ to: [r, c] }) => r >= 0 && r < 6 && c >= 0 && c < 5)).toBe(true);
  });

  it('inks a puppet when a Moth shadow lands on it', () => {
    const b = board(FILLER);
    b[1][1] = 'W';
    b[2][1] = 'H4';
    expect(cast(b, ['left'], 1).inkGain[2][1]).toBe(1);
  });

  it('turns clockwise', () => {
    expect(nextSide('left')).toBe('top');
    expect(nextSide('bottom')).toBe('left');
  });
});

describe('evaluate', () => {
  it('pays ways from reel 1 and multiplies by ways count', () => {
    const b = board(FILLER);
    b[0][0] = 'H1';
    b[1][0] = 'H1';
    b[1][1] = 'H1';
    b[2][3] = 'H1';
    const wins = evaluate(b, grid(null), grid(0), false).filter((w) => w.sym === 'H1');
    expect(wins).toHaveLength(1);
    expect(wins[0].length).toBe(3);
    expect(wins[0].ways).toBe(2);
    expect(wins[0].pay).toBeCloseTo(PAYTABLE.H1[0] * 2);
  });

  it('pays each way at the deepest ink it passes through', () => {
    const b = board(FILLER);
    b[0][0] = 'H1';
    b[1][0] = 'H1';
    b[1][1] = 'H1';
    b[2][3] = 'H1';
    const ink = grid(0);
    ink[1][0] = 2; // ×3 on one of the two ways
    const [win] = evaluate(b, grid(null), ink, false).filter((w) => w.sym === 'H1');
    expect(win.waysValue).toBe(3 + 1);
  });

  it('pays only what the shadows add in an Encore', () => {
    const b = board(FILLER);
    b[0][0] = 'H1';
    b[1][0] = 'H1';
    b[2][0] = 'H1';
    const shadow = grid<Sym | null>(null);
    shadow[1][1] = 'H1'; // a second H1 cell on reel 2
    const encore = evaluate(b, shadow, grid(0), true).filter((w) => w.sym === 'H1');
    expect(encore[0].ways).toBe(1); // 2 ways in total, 1 of them is new
  });
});

describe('playRound', () => {
  it('is deterministic for a seed', () => {
    const a = playRound(new Rng(42), 'base');
    const b = playRound(new Rng(42), 'base');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('never pays more than the max win and reports the cap', () => {
    const rng = new Rng(1);
    for (let i = 0; i < 300; i++) {
      const book = playRound(rng, 'buyLightsOut');
      expect(book.payout).toBeLessThanOrEqual(MAX_WIN);
      if (book.capped) expect(book.events.at(-1)?.type).toBe('cap');
    }
  });

  it('keeps the running total consistent with the act wins', () => {
    const rng = new Rng(7);
    for (let i = 0; i < 500; i++) {
      const book = playRound(rng, 'base');
      let total = 0;
      for (const e of book.events) {
        if (e.type === 'act') { total += e.actWin; expect(e.totalWin).toBeCloseTo(total); }
        if (e.type === 'scatter') { total += e.pay; expect(e.totalWin).toBeCloseTo(total); }
      }
      expect(book.payout).toBeCloseTo(total);
    }
  });

  it('pays every win in whole hundredths of the stake', () => {
    const rng = new Rng(11);
    const cents = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
    for (let i = 0; i < 400; i++) {
      const book = playRound(rng, i % 2 ? 'base' : 'buyMatinee');
      expect(cents(book.payout)).toBe(true);
      for (const e of book.events) if (e.type === 'act') expect(cents(e.actWin) && cents(e.totalWin)).toBe(true);
    }
  });

  it('starts a bought show straight away with the right number of spins', () => {
    const book = playRound(new Rng(3), 'buyMidnight');
    expect(book.events[0]).toMatchObject({ type: 'showStart', show: 'midnight', spins: 12 });
  });
});
