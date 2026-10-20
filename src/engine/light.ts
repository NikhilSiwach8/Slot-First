import { CASTERS, LOW, REELS, ROWS, type Flame, type Side, type Sym } from './config';

export type Board = Sym[][]; // [reel][row]
export type Grid<T> = T[][];
export type Cell = [reel: number, row: number];

export const DIRECTION: Record<Side, [dReel: number, dRow: number]> = {
  left: [1, 0], // light from the left throws shadows to the right
  top: [0, 1],
  right: [-1, 0],
  bottom: [0, -1],
};

/** Clockwise neighbour, used by the Encore. */
export function nextSide(side: Side): Side {
  return ({ left: 'top', top: 'right', right: 'bottom', bottom: 'left' } as const)[side];
}

export function oppositeSide(side: Side): Side {
  return ({ left: 'right', top: 'bottom', right: 'left', bottom: 'top' } as const)[side];
}

export function grid<T>(fill: T): Grid<T> {
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => fill));
}

const RANK: Partial<Record<Sym, number>> = { W: 6, H1: 5, H2: 4, H3: 3, H4: 2, H5: 1 };

export interface ShadowRay {
  from: Cell;
  to: Cell;
  sym: Sym;
  side: Side;
}

export interface CastResult {
  /** Shadow symbol on each cell, or null. Only cells that held a low symbol take a shadow. */
  shadow: Grid<Sym | null>;
  /** Ink depth added on each cell by this cast. */
  inkGain: Grid<number>;
  /** Every ray that reached a cell on the board (for animation). */
  rays: ShadowRay[];
}

/**
 * Cast shadows from every lantern. The result does not depend on the order the rays are
 * processed in: each cell looks at all the shadows that reached it at once.
 *
 * - A low-symbol cell takes the highest-ranked shadow (Wild > H1 > … > H5). If two or more
 *   shadows of that symbol overlap there, the ink deepens by 1.
 * - A puppet or Moth cell keeps its symbol. A Moth shadow landing on it deepens its ink by 1.
 * - Ink deepens by at most 1 per cell per act.
 * - Tickets and Matches are never touched.
 */
export function cast(board: Board, lanterns: Side[], flame: Flame): CastResult {
  const arrivals: Grid<Sym[]> = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => []));
  const rays: ShadowRay[] = [];

  for (const side of lanterns) {
    const [dr, dc] = DIRECTION[side];
    for (let r = 0; r < REELS; r++) {
      for (let c = 0; c < ROWS; c++) {
        const sym = board[r][c];
        if (!CASTERS.includes(sym)) continue;
        for (let k = 1; k <= flame; k++) {
          const tr = r + dr * k;
          const tc = c + dc * k;
          if (tr < 0 || tr >= REELS || tc < 0 || tc >= ROWS) break;
          arrivals[tr][tc].push(sym);
          rays.push({ from: [r, c], to: [tr, tc], sym, side });
        }
      }
    }
  }

  const shadow = grid<Sym | null>(null);
  const inkGain = grid(0);
  for (let r = 0; r < REELS; r++) {
    for (let c = 0; c < ROWS; c++) {
      const a = arrivals[r][c];
      if (a.length === 0) continue;
      const base = board[r][c];
      if (LOW.includes(base)) {
        let winner = a[0];
        for (const s of a) if ((RANK[s] ?? 0) > (RANK[winner] ?? 0)) winner = s;
        shadow[r][c] = winner;
        inkGain[r][c] = a.filter((s) => s === winner).length > 1 ? 1 : 0;
      } else if (CASTERS.includes(base)) {
        inkGain[r][c] = a.includes('W') ? 1 : 0;
      }
    }
  }
  return { shadow, inkGain, rays };
}

/** Ink multiplier of a cell: depth 0 = no ink, depth 1 = ×2, depth 2 = ×3 … */
export function inkMultiplier(depth: number): number {
  return depth > 0 ? depth + 1 : 0;
}
