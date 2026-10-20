import { PAYING, PAYTABLE, REELS, ROWS, type Sym } from './config';
import { inkMultiplier, type Board, type Cell, type Grid } from './light';

export interface WayWin {
  sym: Sym;
  length: number;
  ways: number;
  /** Sum over every way of its multiplier: the deepest ink it passes through (1 if none). */
  waysValue: number;
  pay: number; // × stake
  cells: Cell[];
}

interface ReelMatch {
  mults: number[]; // multiplier of each matching cell (1 if no ink)
  cells: Cell[];
}

function evaluateSymbol(
  sym: Sym,
  board: Board,
  shadow: Grid<Sym | null>,
  ink: Grid<number>,
  baseOnly: boolean,
): { length: number; ways: number; waysValue: number; cells: Cell[] } {
  const reels: ReelMatch[] = [];
  for (let r = 0; r < REELS; r++) {
    const m: ReelMatch = { mults: [], cells: [] };
    for (let c = 0; c < ROWS; c++) {
      if (baseOnly && shadow[r][c]) continue;
      const e = shadow[r][c] ?? board[r][c];
      if (e !== sym && e !== 'W') continue;
      m.mults.push(Math.max(1, inkMultiplier(ink[r][c])));
      m.cells.push([r, c]);
    }
    if (m.cells.length === 0) break;
    reels.push(m);
  }
  const length = reels.length;
  if (length < 3) return { length, ways: 0, waysValue: 0, cells: [] };

  // Each way pays the deepest ink it passes through. Counting the ways whose deepest ink
  // is at most t (a product over reels) for each distinct multiplier t gives the sum.
  const ways = reels.reduce((p, m) => p * m.mults.length, 1);
  const levels = [...new Set(reels.flatMap((m) => m.mults))].sort((a, b) => a - b);
  let waysValue = 0;
  let below = 0;
  for (const t of levels) {
    const atMost = reels.reduce((p, m) => p * m.mults.filter((x) => x <= t).length, 1);
    waysValue += t * (atMost - below);
    below = atMost;
  }
  return { length, ways, waysValue, cells: reels.flatMap((m) => m.cells) };
}

/**
 * Evaluate every paying symbol.
 * With `encore` (acts 2–5) only the value the shadows add is paid: for each symbol, the
 * ways the puppets reach on their own (at the same length) are subtracted, so an Encore
 * never pays the same way twice.
 */
export function evaluate(
  board: Board,
  shadow: Grid<Sym | null>,
  ink: Grid<number>,
  encore: boolean,
): WayWin[] {
  const wins: WayWin[] = [];
  for (const sym of PAYING) {
    const full = evaluateSymbol(sym, board, shadow, ink, false);
    if (full.length < 3) continue;
    let ways = full.ways;
    let waysValue = full.waysValue;
    if (encore) {
      const base = evaluateSymbol(sym, board, shadow, ink, true);
      if (base.length === full.length) {
        ways -= base.ways;
        waysValue -= base.waysValue;
      }
    }
    if (ways <= 0 || waysValue <= 0) continue;
    const pay = PAYTABLE[sym][full.length - 3] * waysValue;
    wins.push({ sym, length: full.length, ways, waysValue, pay, cells: full.cells });
  }
  return wins;
}
