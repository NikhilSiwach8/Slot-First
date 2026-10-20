import { INK_CAP_BASE, INK_CAP_SHOW, MAX_WIN, type Flame, type ShowKind, type Side, type Sym } from './config';
import { cast, grid, type Board, type Cell, type Grid } from './light';
import type { BookEvent, Book } from './round';
import { evaluate } from './ways';

// The published book format. Stake Engine returns a book's `events` list verbatim from
// /wallet/play, so books only store what can't be recomputed: boards, the Lantern's sides
// and flame, and every win. The game rebuilds shadows and ink with the same engine
// (`hydrate`) and refuses a book whose recomputed wins don't match what it says.

export type PubEvent =
  | { type: 'reveal'; board: Board; show: ShowKind | null; spin: number; spinsTotal: number }
  | { type: 'lantern'; lanterns: Side[]; flame: Flame }
  | { type: 'act'; act: number; lanterns: Side[]; flame: Flame; wins: PubWin[]; actWin: number; totalWin: number }
  | { type: 'scatter'; cells: Cell[]; pay: number; totalWin: number }
  | { type: 'showStart'; show: ShowKind; spins: number; flame: Flame; lanterns: number; ink: [number, number, number][] }
  | { type: 'match'; cells: Cell[]; flame: Flame; lanterns: number }
  | { type: 'retrigger'; cells: Cell[]; spins: number; spinsTotal: number }
  | { type: 'showEnd'; show: ShowKind; showWin: number; deepestInk: number; encores: number; fullCircles: number }
  | { type: 'cap'; totalWin: number };

/** One way-win: symbol, length, number of ways, ways value (ways weighted by ink), pay in × stake. */
export type PubWin = { sym: Sym; length: number; ways: number; value: number; pay: number };

export interface PubBook {
  id: number;
  events: PubEvent[];
  payoutMultiplier: number; // hundredths of the base stake
}

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

function sparse(ink: Grid<number>): [number, number, number][] {
  const out: [number, number, number][] = [];
  ink.forEach((reel, r) => reel.forEach((d, c) => { if (d > 0) out.push([r, c, d]); }));
  return out;
}

export function toPublished(book: Book, id: number): PubBook {
  const events: PubEvent[] = book.events.map((e): PubEvent => {
    switch (e.type) {
      case 'act':
        return {
          type: 'act', act: e.act, lanterns: e.lanterns, flame: e.flame, actWin: e.actWin, totalWin: e.totalWin,
          wins: e.wins.map((w) => ({ sym: w.sym, length: w.length, ways: w.ways, value: w.waysValue, pay: r4(w.pay) })),
        };
      case 'showStart':
        return { type: 'showStart', show: e.show, spins: e.spins, flame: e.flame, lanterns: e.lanterns, ink: sparse(e.ink) };
      default:
        return e;
    }
  });
  return { id, events, payoutMultiplier: Math.round(book.payout * 100) };
}

export class BookMismatch extends Error {}

/**
 * Rebuild the full event list (shadows, rays, ink, winning cells) from a published book and
 * check it against the book. Throws BookMismatch if anything disagrees.
 */
export function hydrate(events: PubEvent[], payoutMultiplier: number): { events: BookEvent[]; payout: number; capped: boolean } {
  const out: BookEvent[] = [];
  let board: Board | null = null;
  let ink = grid(0);
  let inShow = false;
  let total = 0;
  let capped = false;
  const fail = (msg: string): never => { throw new BookMismatch(msg); };

  for (const e of events) {
    switch (e.type) {
      case 'reveal':
        board = e.board;
        if (!inShow) ink = grid(0);
        out.push(e);
        break;
      case 'showStart': {
        inShow = true;
        ink = grid(0);
        for (const [r, c, d] of e.ink) ink[r][c] = d;
        out.push({ ...e, ink: ink.map((x) => [...x]) });
        break;
      }
      case 'act': {
        if (!board) fail('act before reveal');
        const b = board as Board;
        const cap = inShow ? INK_CAP_SHOW : INK_CAP_BASE;
        const res = cast(b, e.lanterns, e.flame);
        for (let r = 0; r < ink.length; r++) for (let c = 0; c < ink[r].length; c++) ink[r][c] = Math.min(ink[r][c] + res.inkGain[r][c], cap - 1);
        const wins = evaluate(b, res.shadow, ink, e.act > 1);
        const raw = Math.round(wins.reduce((s, w) => s + w.pay, 0) * 100);
        const room = MAX_WIN * 100 - Math.round(total * 100);
        if (Math.min(raw, room) !== Math.round(e.actWin * 100)) fail(`act ${e.act}: recomputed ${raw / 100}, book says ${e.actWin}`);
        if (wins.length !== e.wins.length || wins.some((w, i) => w.sym !== e.wins[i].sym || w.ways !== e.wins[i].ways)) fail(`act ${e.act}: wins differ`);
        total = Math.round((total + e.actWin) * 100) / 100;
        if (Math.abs(total - e.totalWin) > 1e-9) fail('running total differs');
        out.push({
          type: 'act', act: e.act, lanterns: e.lanterns, flame: e.flame, shadow: res.shadow, inkGain: res.inkGain,
          ink: ink.map((x) => [...x]), rays: res.rays, wins, actWin: e.actWin, totalWin: e.totalWin,
        });
        break;
      }
      case 'scatter':
        total = Math.round((total + e.pay) * 100) / 100;
        out.push(e);
        break;
      case 'showEnd':
        inShow = false;
        out.push(e);
        break;
      case 'cap':
        capped = true;
        out.push(e);
        break;
      default:
        out.push(e);
    }
  }
  if (Math.round(total * 100) !== payoutMultiplier) fail(`total ${total} does not match payoutMultiplier ${payoutMultiplier}`);
  return { events: out, payout: payoutMultiplier / 100, capped };
}
