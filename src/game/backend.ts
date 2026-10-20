import { hydrate, toPublished, type PubEvent } from '../engine/book';
import { MODES, type Mode } from '../engine/config';
import { Rng } from '../engine/rng';
import { playRound, type Book } from '../engine/round';

// Where rounds come from.
//   demo   — no sessionID in the URL: rounds are played locally with play credits.
//   rgs    — launched by Stake Engine (?sessionID=…&rgs_url=…): /wallet/authenticate, /play
//            and /end-round. The RGS picks the book; the game only animates it.
//   replay — ?replay=true&game=…&version=…&mode=…&event=…&rgs_url=…: one round fetched from
//            /bet/replay, with no wallet calls at all.
// Every book, wherever it comes from, goes through `hydrate`, which rebuilds the round with
// the game engine and refuses to show a book whose wins don't add up to its payout.

const API_MULTIPLIER = 1_000_000;

export interface Jurisdiction {
  socialCasino: boolean;
  disabledTurbo: boolean;
  disabledAutoplay: boolean;
  disabledSpacebar: boolean;
  disabledBuyFeature: boolean;
  displayRTP: boolean;
  /** Minimum duration of a round, in ms. */
  minimumRoundDuration: number;
}

export interface Session {
  balance: number;
  currency: string | null;
  stakes: number[];
  defaultStake: number;
  jurisdiction: Jurisdiction;
  /** An unfinished round found at start-up (play it, then it is closed). */
  resume: { mode: Mode; stake: number; book: Book } | null;
}

export interface PlayResult {
  book: Book;
  /** Balance right after the stake was taken. */
  balance: number;
}

export interface Backend {
  readonly kind: 'demo' | 'rgs' | 'replay';
  start(): Promise<Session>;
  play(mode: Mode, stake: number): Promise<PlayResult>;
  /** Close the round and return the balance after the win was paid. */
  finish(book: Book, stake: number): Promise<number>;
}

const NO_FLAGS: Jurisdiction = {
  socialCasino: false, disabledTurbo: false, disabledAutoplay: false, disabledSpacebar: false,
  disabledBuyFeature: false, displayRTP: true, minimumRoundDuration: 0,
};

export class RgsError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

const modeByRgs = (name: string): Mode => {
  const m = (Object.keys(MODES) as Mode[]).find((k) => MODES[k].rgs.toLowerCase() === name.toLowerCase());
  if (!m) throw new RgsError('ERR_MODE', `Unknown bet mode "${name}"`);
  return m;
};

/** Turn a book's events (as stored in the RGS) into a playable, verified round. */
export function bookFromState(mode: Mode, state: unknown, payoutMultiplier: number): Book {
  const events = (Array.isArray(state) ? state : (state as { events?: unknown })?.events) as PubEvent[] | undefined;
  if (!Array.isArray(events)) throw new RgsError('ERR_STATE', 'The round has no events');
  const h = hydrate(events, Math.round(payoutMultiplier * 100));
  return { mode, cost: MODES[mode].cost, events: h.events, payout: h.payout, capped: h.capped };
}

// ------------------------------------------------------------------ demo

export class DemoBackend implements Backend {
  readonly kind = 'demo';
  private balance = 1000;
  private readonly rng: Rng;

  constructor(seed: number) {
    this.rng = new Rng(seed);
  }

  async start(): Promise<Session> {
    const stakes = [0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 3, 4, 5, 8, 10, 15, 20, 50, 100];
    return { balance: this.balance, currency: null, stakes, defaultStake: 1, jurisdiction: NO_FLAGS, resume: null };
  }

  async play(mode: Mode, stake: number): Promise<PlayResult> {
    this.balance -= MODES[mode].cost * stake;
    // Same path as a real book: publish, then hydrate and verify.
    const pub = toPublished(playRound(this.rng, mode), 0);
    return { book: bookFromState(mode, pub.events, pub.payoutMultiplier / 100), balance: this.balance };
  }

  async finish(book: Book, stake: number): Promise<number> {
    this.balance += book.payout * stake;
    return this.balance;
  }
}

// ------------------------------------------------------------------ Stake Engine RGS

interface RgsRound {
  active?: boolean;
  mode?: string;
  amount?: number;
  payoutMultiplier?: number;
  state?: unknown;
}

export class RgsBackend implements Backend {
  readonly kind = 'rgs';
  private readonly base: string;
  private readonly sessionID: string;
  private readonly lang: string;

  constructor(params: URLSearchParams) {
    this.sessionID = params.get('sessionID') ?? '';
    const host = params.get('rgs_url') ?? '';
    this.base = /^https?:\/\//.test(host) ? host.replace(/\/$/, '') : `https://${host.replace(/\/$/, '')}`;
    this.lang = params.get('lang') ?? 'en';
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionID: this.sessionID, ...body }),
      });
    } catch {
      throw new RgsError('ERR_NETWORK', 'Connection lost. Reload the game to finish any uncompleted round.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new RgsError(data?.error ?? data?.code ?? `HTTP_${res.status}`, data?.message ?? 'The game server refused the request.');
    return data as T;
  }

  async start(): Promise<Session> {
    const data = await this.post<{
      balance: { amount: number; currency: string };
      config: { minBet: number; maxBet: number; stepBet: number; defaultBetLevel: number; betLevels: number[]; jurisdiction?: Partial<Jurisdiction> };
      round: RgsRound | null;
    }>('/wallet/authenticate', { language: this.lang });
    const c = data.config;
    const levels = (c.betLevels ?? []).filter((l) => l >= c.minBet && l <= c.maxBet && (!c.stepBet || l % c.stepBet === 0)).sort((a, b) => a - b);
    const j = c.jurisdiction ?? {};
    let resume: Session['resume'] = null;
    if (data.round?.active && data.round.mode) {
      const mode = modeByRgs(data.round.mode);
      resume = { mode, stake: (data.round.amount ?? c.defaultBetLevel) / API_MULTIPLIER, book: bookFromState(mode, data.round.state, data.round.payoutMultiplier ?? 0) };
    }
    return {
      balance: data.balance.amount / API_MULTIPLIER,
      currency: data.balance.currency,
      stakes: levels.map((l) => l / API_MULTIPLIER),
      defaultStake: c.defaultBetLevel / API_MULTIPLIER,
      jurisdiction: { ...NO_FLAGS, ...j, displayRTP: j.displayRTP ?? true, minimumRoundDuration: j.minimumRoundDuration ?? 0 },
      resume,
    };
  }

  async play(mode: Mode, stake: number): Promise<PlayResult> {
    const data = await this.post<{ balance: { amount: number }; round: RgsRound }>('/wallet/play', {
      amount: Math.round(stake * API_MULTIPLIER),
      mode: MODES[mode].rgs,
    });
    const book = bookFromState(mode, data.round.state, data.round.payoutMultiplier ?? 0);
    return { book, balance: data.balance.amount / API_MULTIPLIER };
  }

  async finish(book: Book): Promise<number> {
    // Zero-payout rounds are closed by the RGS on its own.
    if (book.payout <= 0) return NaN;
    const data = await this.post<{ balance: { amount: number } }>('/wallet/end-round', {});
    return data.balance.amount / API_MULTIPLIER;
  }
}

// ------------------------------------------------------------------ replay

export class ReplayBackend implements Backend {
  readonly kind = 'replay';
  private book: Book | null = null;
  readonly mode: Mode;
  readonly stake: number;

  constructor(private readonly params: URLSearchParams) {
    this.mode = modeByRgs(params.get('mode') ?? 'base');
    this.stake = params.has('amount') ? Number(params.get('amount')) / API_MULTIPLIER : 1;
  }

  async start(): Promise<Session> {
    const p = this.params;
    const host = p.get('rgs_url') ?? '';
    const base = /^https?:\/\//.test(host) ? host : `https://${host}`;
    const path = ['game', 'version', 'mode', 'event'].map((k) => encodeURIComponent(p.get(k) ?? '')).join('/');
    let data: { payoutMultiplier?: number; state?: unknown };
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/bet/replay/${path}`);
      if (!res.ok) throw new Error(String(res.status));
      data = await res.json();
    } catch {
      throw new RgsError('ERR_REPLAY', 'This round could not be loaded.');
    }
    this.book = bookFromState(this.mode, data.state, data.payoutMultiplier ?? 0);
    return { balance: 0, currency: p.get('currency'), stakes: [this.stake], defaultStake: this.stake, jurisdiction: NO_FLAGS, resume: null };
  }

  async play(): Promise<PlayResult> {
    return { book: this.book!, balance: 0 };
  }

  async finish(): Promise<number> {
    return 0;
  }
}

export function pickBackend(params: URLSearchParams, seed: number): Backend {
  if (params.get('replay') === 'true') return new ReplayBackend(params);
  if (params.has('sessionID') && params.has('rgs_url')) return new RgsBackend(params);
  return new DemoBackend(seed);
}
