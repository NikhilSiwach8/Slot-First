import {
  INK_CAP_BASE, INK_CAP_SHOW, MAX_WIN, MODES, REELS, REELSETS, RETRIGGER_SPINS, ROWS, SCATTER_PAY, SHOWS,
  SIDES, showForTickets,
  type Flame, type Mode, type ReelSet, type ShowKind, type Side, type Sym,
} from './config';
import { cast, grid, nextSide, oppositeSide, type Board, type Cell, type Grid, type ShadowRay } from './light';
import { Rng } from './rng';
import { evaluate, type WayWin } from './ways';

// A round is played out completely up front and returned as a "book": the ordered list of
// events the frontend animates. This mirrors how Stake Engine serves pre-generated books.

export type BookEvent =
  | { type: 'reveal'; board: Board; show: ShowKind | null; spin: number; spinsTotal: number }
  | { type: 'lantern'; lanterns: Side[]; flame: Flame }
  | {
      type: 'act';
      act: number; // 1 = first look; 2–4 = Encores; 5 = Full Circle
      lanterns: Side[];
      flame: Flame;
      shadow: Grid<Sym | null>;
      inkGain: Grid<number>;
      ink: Grid<number>; // ink after this act
      rays: ShadowRay[];
      wins: WayWin[];
      actWin: number;
      totalWin: number;
    }
  | { type: 'scatter'; cells: Cell[]; pay: number; totalWin: number }
  | { type: 'showStart'; show: ShowKind; spins: number; flame: Flame; lanterns: number; ink: Grid<number> }
  | { type: 'match'; cells: Cell[]; flame: Flame; lanterns: number }
  | { type: 'retrigger'; cells: Cell[]; spins: number; spinsTotal: number }
  | { type: 'showEnd'; show: ShowKind; showWin: number; deepestInk: number; encores: number; fullCircles: number }
  | { type: 'cap'; totalWin: number };

export interface Book {
  mode: Mode;
  cost: number;
  events: BookEvent[];
  /** Total win of the round in × stake (base stake, not the mode cost). */
  payout: number;
  capped: boolean;
}

const STRIP_LENGTH = 96;
const strips = new Map<ReelSet, Sym[][]>();

/**
 * Reel strips are built once from the reelset weights: every symbol gets its exact share of
 * the strip, cut into short runs (stacks), and the runs are shuffled with a fixed seed.
 * Stacks keep the number of different symbols in a 5-row window low, which keeps the hit
 * rate in check on a 15,625-ways board.
 */
export function reelStrips(reelset: ReelSet): Sym[][] {
  let s = strips.get(reelset);
  if (s) return s;
  s = [];
  for (let r = 0; r < REELS; r++) {
    const rng = new Rng(0x5eed + r);
    const weights = { ...reelset.weights };
    if (r === 0) delete weights.W;
    const total = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
    const runs: Sym[][] = [];
    for (const [sym, w] of Object.entries(weights) as [Sym, number][]) {
      let left = Math.max(1, Math.round((w / total) * STRIP_LENGTH));
      while (left > 0) {
        const len = Math.min(left, sym === 'W' ? 1 : Number(rng.weighted(reelset.stack)));
        runs.push(Array(len).fill(sym));
        left -= len;
      }
    }
    for (let i = runs.length - 1; i > 0; i--) {
      const j = rng.int(i + 1);
      [runs[i], runs[j]] = [runs[j], runs[i]];
    }
    s.push(runs.flat());
  }
  strips.set(reelset, s);
  return s;
}

export function drawBoard(rng: Rng, reelset: ReelSet): Board {
  const board: Board = [];
  reelStrips(reelset).forEach((strip) => {
    const stop = rng.int(strip.length);
    const reel: Sym[] = [];
    for (let c = 0; c < ROWS; c++) reel.push(strip[(stop + c) % strip.length]);
    if (rng.next() < reelset.ticket) reel[rng.int(ROWS)] = 'S';
    if (reelset.match && rng.next() < reelset.match) {
      const row = rng.int(ROWS);
      if (reel[row] !== 'S') reel[row] = 'B';
    }
    board.push(reel);
  });
  return board;
}

function drawFlame(rng: Rng, reelset: ReelSet): Flame {
  const x = rng.next();
  const [c, l] = reelset.flame;
  return x < c ? 1 : x < c + l ? 2 : 3;
}

function lanternSet(first: Side, count: number): Side[] {
  const set = [first];
  if (count >= 2) set.push(oppositeSide(first));
  if (count >= 3) set.push(nextSide(first));
  if (count >= 4) set.push(oppositeSide(nextSide(first)));
  return set;
}

function cellsOf(board: Board, sym: Sym): Cell[] {
  const cells: Cell[] = [];
  board.forEach((reel, r) => reel.forEach((s, c) => { if (s === sym) cells.push([r, c]); }));
  return cells;
}

class RoundState {
  events: BookEvent[] = [];
  total = 0;
  capped = false;

  /** Adds a win, applying the 50,000× cap. Returns the amount actually added. */
  add(amount: number): number {
    if (this.capped) return 0;
    const room = MAX_WIN - this.total;
    const added = Math.min(amount, room);
    this.total += added;
    if (this.total >= MAX_WIN - 1e-9) {
      this.total = MAX_WIN;
      this.capped = true;
    }
    return added;
  }
}

interface SpinContext {
  ink: Grid<number>;
  inkCap: number;
  lanterns: number;
  minFlame: Flame;
}

interface SpinStats {
  encores: number;
  fullCircle: boolean;
}

/** One spin: draw the board, settle the Lantern, then play the acts. */
function playSpin(rng: Rng, st: RoundState, reelset: ReelSet, board: Board, ctx: SpinContext): SpinStats {
  const first = rng.pick(SIDES);
  const flame = Math.max(drawFlame(rng, reelset), ctx.minFlame) as Flame;
  const initial = lanternSet(first, ctx.lanterns);
  st.events.push({ type: 'lantern', lanterns: initial, flame });

  const seen = new Set<string>();
  const key = (s: Side[]) => [...s].sort().join();
  let sides = initial;
  let stats: SpinStats = { encores: 0, fullCircle: false };
  let lastEncore = 0;

  for (let act = 1; act <= 5; act++) {
    const actFlame: Flame = act === 5 ? 3 : flame;
    seen.add(key(sides));
    const res = cast(board, sides, actFlame);
    for (let r = 0; r < REELS; r++)
      for (let c = 0; c < ROWS; c++)
        ctx.ink[r][c] = Math.min(ctx.ink[r][c] + res.inkGain[r][c], ctx.inkCap - 1);

    const wins = evaluate(board, res.shadow, ctx.ink, act > 1);
    const raw = wins.reduce((s, w) => s + w.pay, 0);
    const actWin = st.add(raw);
    st.events.push({
      type: 'act', act, lanterns: sides, flame: actFlame, shadow: res.shadow, inkGain: res.inkGain,
      ink: ctx.ink.map((r) => [...r]), rays: res.rays, wins, actWin, totalWin: st.total,
    });
    if (act > 1) stats.encores++;
    // The curtain only rises again if this Act's applause beats the last Encore's.
    const beats = act === 1 ? actWin > 0 : actWin > 0 && actWin >= lastEncore;
    if (act > 1) lastEncore = actWin;
    if (st.capped || !beats || act === 5) break;

    if (act === 4) {
      // Full Circle: every side paid. The Lantern returns to where it started, as a Bonfire.
      stats = { ...stats, fullCircle: true };
      sides = initial;
      continue;
    }
    const next = sides.map(nextSide);
    if (seen.has(key(next))) break; // the light would only repeat a look the stage has seen
    sides = next;
  }
  return stats;
}

function playShow(rng: Rng, st: RoundState, kind: ShowKind): void {
  const rules = SHOWS[kind];
  const reelset = REELSETS[kind];
  const ink = grid(0);
  if (rules.startInk) for (let r = 0; r < REELS; r++) ink[r][rng.int(ROWS)] = 1;
  let flame = rules.flame;
  let lanterns = rules.lanterns;
  let spinsTotal = rules.spins;
  const start = st.total;
  let encores = 0;
  let fullCircles = 0;
  st.events.push({ type: 'showStart', show: kind, spins: spinsTotal, flame, lanterns, ink: ink.map((r) => [...r]) });

  for (let spin = 1; spin <= spinsTotal && !st.capped; spin++) {
    const board = drawBoard(rng, reelset);
    st.events.push({ type: 'reveal', board, show: kind, spin, spinsTotal });
    const s = playSpin(rng, st, reelset, board, { ink, inkCap: INK_CAP_SHOW, lanterns, minFlame: flame });
    encores += s.encores;
    if (s.fullCircle) fullCircles++;
    if (st.capped) break;

    const matches = cellsOf(board, 'B');
    if (matches.length) {
      for (let i = 0; i < matches.length; i++) {
        if (flame < 3) flame = (flame + 1) as Flame;
        else if (lanterns < 4) lanterns++;
      }
      st.events.push({ type: 'match', cells: matches, flame, lanterns });
    }
    const tickets = cellsOf(board, 'S');
    if (tickets.length >= 3) {
      spinsTotal += RETRIGGER_SPINS;
      st.events.push({ type: 'retrigger', cells: tickets, spins: RETRIGGER_SPINS, spinsTotal });
    }
  }
  st.events.push({
    type: 'showEnd', show: kind, showWin: st.total - start,
    deepestInk: Math.max(...ink.flat().map((d) => (d > 0 ? d + 1 : 0))), encores, fullCircles,
  });
}

export function playRound(rng: Rng, mode: Mode): Book {
  const rules = MODES[mode];
  const st = new RoundState();

  if (rules.buy) {
    playShow(rng, st, rules.buy);
  } else {
    const reelset = REELSETS[rules.reelset];
    const board = drawBoard(rng, reelset);
    st.events.push({ type: 'reveal', board, show: null, spin: 1, spinsTotal: 1 });
    playSpin(rng, st, reelset, board, { ink: grid(0), inkCap: INK_CAP_BASE, lanterns: 1, minFlame: 1 });

    const tickets = cellsOf(board, 'S');
    if (tickets.length >= 3 && !st.capped) {
      const pay = st.add(SCATTER_PAY[tickets.length - 3]);
      st.events.push({ type: 'scatter', cells: tickets, pay, totalWin: st.total });
      const show = showForTickets(tickets.length);
      if (show && !st.capped) playShow(rng, st, show);
    }
  }
  if (st.capped) st.events.push({ type: 'cap', totalWin: st.total });
  return { mode, cost: rules.cost, events: st.events, payout: st.total, capped: st.capped };
}
