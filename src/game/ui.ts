import { FLAME_NAMES, SHOWS, type Flame, type ShowKind, type Side } from '../engine/config';
import { animate, ease, wait } from './tween';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

// Currency display, as in Stake Engine's ts-client: symbol, decimals and placement.
const CURRENCIES: Record<string, { symbol: string; decimals: number; after?: boolean }> = {
  USD: { symbol: '$', decimals: 2 }, CAD: { symbol: 'CA$', decimals: 2 }, JPY: { symbol: '¥', decimals: 0 },
  EUR: { symbol: '€', decimals: 2 }, RUB: { symbol: '₽', decimals: 2 }, CNY: { symbol: 'CN¥', decimals: 2 },
  PHP: { symbol: '₱', decimals: 2 }, INR: { symbol: '₹', decimals: 2 }, IDR: { symbol: 'Rp', decimals: 0 },
  KRW: { symbol: '₩', decimals: 0 }, BRL: { symbol: 'R$', decimals: 2 }, MXN: { symbol: 'MX$', decimals: 2 },
  DKK: { symbol: 'KR', decimals: 2, after: true }, PLN: { symbol: 'zł', decimals: 2, after: true },
  VND: { symbol: '₫', decimals: 0, after: true }, TRY: { symbol: '₺', decimals: 2 }, CLP: { symbol: 'CLP', decimals: 0, after: true },
  ARS: { symbol: 'ARS', decimals: 2, after: true }, PEN: { symbol: 'S/', decimals: 2, after: true }, NGN: { symbol: '₦', decimals: 0 },
  SAR: { symbol: 'SAR', decimals: 2, after: true }, ILS: { symbol: 'ILS', decimals: 2, after: true }, AED: { symbol: 'AED', decimals: 2, after: true },
  TWD: { symbol: 'NT$', decimals: 2 }, NOK: { symbol: 'kr', decimals: 2 }, KWD: { symbol: 'KD', decimals: 2 },
  JOD: { symbol: 'JD', decimals: 2 }, CRC: { symbol: '₡', decimals: 2 }, TND: { symbol: 'TND', decimals: 2, after: true },
  SGD: { symbol: 'SG$', decimals: 2 }, MYR: { symbol: 'RM', decimals: 2 }, OMR: { symbol: 'OMR', decimals: 2, after: true },
  QAR: { symbol: 'QAR', decimals: 2, after: true }, BHD: { symbol: 'BD', decimals: 2 },
  XGC: { symbol: 'GC', decimals: 0, after: true }, XSC: { symbol: 'SC', decimals: 2, after: true },
};
let currency: { symbol: string; decimals: number; after?: boolean } | null = null;

/** Set the display currency (null = play credits, plain numbers). Unknown codes show the code after the amount. */
export function setCurrency(code: string | null): void {
  currency = code ? (CURRENCIES[code.toUpperCase()] ?? { symbol: code.toUpperCase(), decimals: 2, after: true }) : null;
}

export function money(v: number): string {
  // Amounts below the currency's precision (tiny wins on small stakes) still show their value.
  const d = currency?.decimals ?? 2;
  const decimals = v !== 0 && Math.abs(v) < 10 ** -d ? 4 : d;
  const n = v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (!currency) return n;
  return currency.after ? `${n} ${currency.symbol}` : `${currency.symbol}${n}`;
}

export class Ui {
  readonly spinBtn = $<HTMLButtonElement>('#spin');
  private readonly balanceEl = $('#balance');
  private readonly boxOffice = $('.box-office');
  private readonly roll = $('#seat-roll');
  private readonly strip = document.createElement('div');
  private readonly down = $<HTMLButtonElement>('#seat-down');
  private readonly up = $<HTMLButtonElement>('#seat-up');
  private readonly marqueeEl = $('#marquee');
  private readonly needle = $('.needle');
  private readonly hud = $('#show-hud');
  private readonly bannerEl = $('#banner');
  private readonly autoCount = $('.autoplay-count');
  readonly buttons = {
    autoplay: $<HTMLButtonElement>('#btn-autoplay'),
    turbo: $<HTMLButtonElement>('#btn-turbo'),
    playbill: $<HTMLButtonElement>('#btn-playbill'),
    sound: $<HTMLButtonElement>('#btn-sound'),
    info: $<HTMLButtonElement>('#btn-info'),
    settings: $<HTMLButtonElement>('#btn-settings'),
  };
  stakes: number[] = [1];
  stakeIndex = 0;
  onStake: () => void = () => {};
  private busy = false;

  constructor() {
    this.strip.className = 'seat-strip';
    this.roll.appendChild(this.strip);
    this.down.addEventListener('click', () => this.setStake(this.stakeIndex - 1));
    this.up.addEventListener('click', () => this.setStake(this.stakeIndex + 1));
    this.roll.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.setStake(this.stakeIndex + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1));
    }, { passive: false });
    let touchX = 0;
    this.roll.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    this.roll.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 24) this.setStake(this.stakeIndex + (dx < 0 ? 1 : -1));
    });
  }

  /** Build the ticket roll from the bet levels (from the RGS, or the demo list). */
  setStakes(levels: number[], preferred: number): void {
    this.stakes = levels.length ? levels : [preferred];
    this.strip.replaceChildren();
    this.stakes.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'stub';
      b.innerHTML = `<span><small>SEAT</small>${money(s)}</span>`;
      b.setAttribute('aria-label', `Stake ${money(s)}`);
      b.addEventListener('click', () => this.setStake(i));
      this.strip.appendChild(b);
    });
    let best = 0;
    this.stakes.forEach((s, i) => { if (Math.abs(s - preferred) < Math.abs(this.stakes[best] - preferred)) best = i; });
    this.stakeIndex = best;
    this.setStake(best, true);
  }

  get stake(): number {
    return this.stakes[this.stakeIndex];
  }

  setStake(i: number, silent = false): void {
    if (this.busy) return;
    this.stakeIndex = Math.max(0, Math.min(this.stakes.length - 1, i));
    const stubs = [...this.strip.children] as HTMLElement[];
    stubs.forEach((s, k) => s.classList.toggle('on', k === this.stakeIndex));
    const stubW = (stubs[0]?.offsetWidth || 104) + 6;
    const rollW = this.roll.offsetWidth || 210;
    this.strip.style.transform = `translateX(${rollW / 2 - stubW * this.stakeIndex - stubW / 2 + 3}px)`;
    this.down.disabled = this.stakeIndex === 0;
    this.up.disabled = this.stakeIndex === this.stakes.length - 1;
    if (!silent) this.onStake();
  }

  /** Re-centre the ticket roll after a resize. */
  relayout(): void {
    this.setStake(this.stakeIndex, true);
  }

  setBalance(v: number, affordable: boolean): void {
    this.balanceEl.textContent = money(v);
    this.boxOffice.classList.toggle('short', !affordable);
  }

  setBusy(busy: boolean): void {
    this.busy = busy;
    this.spinBtn.classList.toggle('busy', busy);
    this.spinBtn.setAttribute('aria-label', busy ? 'Skip' : 'Spin');
    for (const b of [this.down, this.up, this.buttons.playbill]) b.disabled = busy;
    if (!busy) this.setStake(this.stakeIndex, true);
  }

  setSpinEnabled(on: boolean): void {
    this.spinBtn.classList.toggle('off', !on);
  }

  setAutoplayCount(n: number | null): void {
    this.autoCount.hidden = n === null;
    this.autoCount.textContent = n === null ? '' : String(n);
  }

  marquee(label: string, amount: string, lit = false): void {
    this.marqueeEl.querySelector('.label')!.textContent = label;
    this.marqueeEl.querySelector('.amount')!.textContent = amount;
    this.marqueeEl.classList.toggle('lit', lit);
  }

  /** Count the marquee up to a value. */
  async countUp(label: string, from: number, to: number, ms: number, lit: boolean): Promise<void> {
    await animate(ms, (p) => this.marquee(label, money(from + (to - from) * p), lit), ease.outCubic);
  }

  compass(side: Side): void {
    const deg: Record<Side, number> = { top: 0, right: 90, bottom: 180, left: 270 };
    this.needle.style.transform = `rotate(${deg[side]}deg)`;
  }

  showHud(kind: ShowKind, spinsLeft: number, total: string, flame: Flame, lanterns: number): void {
    this.hud.hidden = false;
    this.hud.querySelector('.show-name')!.textContent = SHOWS[kind].name;
    this.hud.querySelector('.spins-left .n')!.textContent = String(spinsLeft);
    this.hud.querySelector('.show-total .n')!.textContent = total;
    this.hud.querySelector('.flame-label')!.textContent = `${FLAME_NAMES[flame]}${lanterns > 1 ? ` · ${lanterns} lanterns` : ''}`;
  }

  hideHud(): void {
    this.hud.hidden = true;
  }

  async banner(big: string, small = '', cls = '', ms = 1100): Promise<void> {
    const el = document.createElement('div');
    el.className = `banner ${cls}`;
    el.innerHTML = `<div class="big">${big}</div>${small ? `<div class="small">${small}</div>` : ''}`;
    this.bannerEl.replaceChildren(el);
    await wait(ms);
    el.classList.add('out');
    await wait(300);
    el.remove();
  }

  setModeChip(text: string | null): void {
    const chip = $('#mode-chip');
    chip.hidden = !text;
    chip.textContent = text ?? '';
  }
}
