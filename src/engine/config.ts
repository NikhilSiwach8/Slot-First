// Every number the maths and the info page share lives here, so the Programme can
// never drift from the game.

export const REELS = 6;
export const ROWS = 5;
export const MAX_WIN = 50_000; // × stake, hard cap for one round (base game + show)
export const RTP_TARGET = 0.962;

export type Sym =
  | 'H1' | 'H2' | 'H3' | 'H4' | 'H5'
  | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  | 'W' | 'S' | 'B';

export type Side = 'left' | 'top' | 'right' | 'bottom';
export type Flame = 1 | 2 | 3; // Candle, Lamp, Bonfire = shadow length in cells
export type ShowKind = 'matinee' | 'midnight' | 'lightsOut';
export type Mode = 'base' | 'ante' | 'buyMatinee' | 'buyMidnight' | 'buyLightsOut';

export const HIGH: Sym[] = ['H1', 'H2', 'H3', 'H4', 'H5'];
export const LOW: Sym[] = ['L1', 'L2', 'L3', 'L4', 'L5'];
export const PAYING: Sym[] = [...HIGH, ...LOW];
/** Symbols that cast shadows. */
export const CASTERS: Sym[] = ['W', ...HIGH];

export const SIDES: Side[] = ['left', 'top', 'right', 'bottom']; // clockwise order
export const FLAME_NAMES: Record<Flame, string> = { 1: 'Candle', 2: 'Lamp', 3: 'Bonfire' };

export const SYMBOL_NAMES: Record<Sym, string> = {
  H1: 'The Moth Widow', H2: 'The Gourd King', H3: 'The Stilt Wraith', H4: 'The Crow Courier',
  H5: 'The Familiar', L1: 'Wolf', L2: 'Raven', L3: 'Hare', L4: 'Spider', L5: 'Stag',
  W: 'Moth (Wild)', S: 'Ticket', B: 'Match',
};

/**
 * Pay per way, in × total stake, for 3, 4, 5 and 6 of a kind.
 * Tuned with scripts/simulate.ts.
 */
export const PAYTABLE: Record<string, [number, number, number, number]> = {
  H1: [0.065, 0.1, 0.145, 0.2],
  H2: [0.05, 0.08, 0.115, 0.16],
  H3: [0.04, 0.065, 0.09, 0.125],
  H4: [0.035, 0.05, 0.075, 0.1],
  H5: [0.03, 0.045, 0.065, 0.085],
  L1: [0.02, 0.03, 0.045, 0.065],
  L2: [0.018, 0.028, 0.04, 0.055],
  L3: [0.016, 0.024, 0.035, 0.048],
  L4: [0.014, 0.022, 0.032, 0.044],
  L5: [0.013, 0.02, 0.029, 0.04],
};

/** Ticket pays anywhere, × total stake, for 3, 4, 5 and 6 Tickets. */
export const SCATTER_PAY = [2, 5, 20, 100];

/** Relative weight of each symbol in a cell. Tickets are placed separately (one per reel at most). */
export interface ReelSet {
  weights: Partial<Record<Sym, number>>;
  /** Run lengths (stack heights) used when building the reel strips. */
  stack: Record<'1' | '2' | '3', number>;
  /** Chance that a reel shows one Ticket. */
  ticket: number;
  /** Chance that a reel shows one Match (shows only). */
  match?: number;
  /** Chance of Candle, Lamp, Bonfire. */
  flame: [number, number, number];
}

export const REELSETS: Record<'base' | 'ante' | ShowKind, ReelSet> = {
  base: {
    weights: { H1: 2, H2: 2.5, H3: 3, H4: 3.5, H5: 4, L1: 12, L2: 13, L3: 14, L4: 15, L5: 16, W: 1.2 },
    stack: { 1: 3, 2: 3, 3: 4 },
    ticket: 0.0595,
    flame: [0.8, 0.17, 0.03],
  },
  ante: {
    weights: { H1: 2, H2: 2.5, H3: 3, H4: 3.5, H5: 4, L1: 12, L2: 13, L3: 14, L4: 15, L5: 16, W: 1.2 },
    stack: { 1: 3, 2: 3, 3: 4 },
    ticket: 0.0675,
    flame: [0.74, 0.22, 0.04],
  },
  matinee: {
    weights: { H1: 2.5, H2: 3, H3: 3.5, H4: 4, H5: 4.5, L1: 12, L2: 13, L3: 14, L4: 15, L5: 16, W: 2.6 },
    stack: { 1: 3, 2: 3, 3: 4 },
    ticket: 0.035,
    match: 0.02,
    flame: [0.8, 0.17, 0.03],
  },
  midnight: {
    weights: { H1: 2.5, H2: 3, H3: 3.5, H4: 4, H5: 4.5, L1: 12, L2: 13, L3: 14, L4: 15, L5: 16, W: 1.3 },
    stack: { 1: 3, 2: 3, 3: 4 },
    ticket: 0.035,
    match: 0.02,
    flame: [0.8, 0.17, 0.03],
  },
  lightsOut: {
    weights: { H1: 2.5, H2: 3, H3: 3.5, H4: 4, H5: 4.5, L1: 12, L2: 13, L3: 14, L4: 15, L5: 16, W: 1.3 },
    stack: { 1: 3, 2: 3, 3: 4 },
    ticket: 0.035,
    match: 0.02,
    flame: [0.8, 0.17, 0.03],
  },
};

export interface ShowRules {
  name: string;
  spins: number;
  flame: Flame;
  lanterns: number;
  /** One random ×2 ink cell on each reel when the show starts. */
  startInk: boolean;
}

export const SHOWS: Record<ShowKind, ShowRules> = {
  matinee: { name: 'The Matinee', spins: 10, flame: 1, lanterns: 1, startInk: false },
  midnight: { name: 'The Midnight Show', spins: 12, flame: 2, lanterns: 1, startInk: true },
  lightsOut: { name: 'Lights Out', spins: 15, flame: 1, lanterns: 2, startInk: true },
};

export const RETRIGGER_SPINS = 5;
export const INK_CAP_BASE = 10;
export const INK_CAP_SHOW = 100;

export interface ModeRules {
  name: string;
  /** Bet-mode name in the Stake Engine index.json and in /wallet/play. */
  rgs: string;
  cost: number; // × stake
  reelset: 'base' | 'ante';
  buy?: ShowKind;
}

export const MODES: Record<Mode, ModeRules> = {
  base: { name: 'Standard', rgs: 'base', cost: 1, reelset: 'base' },
  ante: { name: 'Extra Wick', rgs: 'ante', cost: 1.25, reelset: 'ante' },
  buyMatinee: { name: 'Buy: The Matinee', rgs: 'buy_matinee', cost: 88, reelset: 'base', buy: 'matinee' },
  buyMidnight: { name: 'Buy: The Midnight Show', rgs: 'buy_midnight', cost: 270, reelset: 'base', buy: 'midnight' },
  buyLightsOut: { name: 'Buy: Lights Out', rgs: 'buy_lights_out', cost: 600, reelset: 'base', buy: 'lightsOut' },
};

export function showForTickets(n: number): ShowKind | null {
  if (n >= 5) return 'lightsOut';
  if (n === 4) return 'midnight';
  if (n === 3) return 'matinee';
  return null;
}

/** The Applause Ladder, in × stake. */
export const WIN_TIERS = [
  { name: 'BRAVO', at: 20 },
  { name: 'BRAVISSIMO', at: 50 },
  { name: 'STANDING OVATION', at: 100 },
  { name: 'SHOWSTOPPER', at: 500 },
] as const;
