import { FLAME_NAMES, SHOWS, type Flame, type ShowKind, type Side } from '../engine/config';
import { animate, ease, wait } from './tween';

export const STAKES = [0.1, 0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 3, 4, 5, 8, 10, 15, 20, 50, 100];

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

export function money(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  stakeIndex = STAKES.indexOf(1);
  onStake: () => void = () => {};
  private busy = false;

  constructor() {
    this.strip.className = 'seat-strip';
    this.roll.appendChild(this.strip);
    STAKES.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'stub';
      b.innerHTML = `<span><small>SEAT</small>${money(s)}</span>`;
      b.setAttribute('aria-label', `Stake ${money(s)}`);
      b.addEventListener('click', () => this.setStake(i));
      this.strip.appendChild(b);
    });
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
    this.setStake(this.stakeIndex, true);
  }

  get stake(): number {
    return STAKES[this.stakeIndex];
  }

  setStake(i: number, silent = false): void {
    if (this.busy) return;
    this.stakeIndex = Math.max(0, Math.min(STAKES.length - 1, i));
    const stubs = [...this.strip.children] as HTMLElement[];
    stubs.forEach((s, k) => s.classList.toggle('on', k === this.stakeIndex));
    const stubW = (stubs[0]?.offsetWidth || 104) + 6;
    const rollW = this.roll.offsetWidth || 210;
    this.strip.style.transform = `translateX(${rollW / 2 - stubW * this.stakeIndex - stubW / 2 + 3}px)`;
    this.down.disabled = this.stakeIndex === 0;
    this.up.disabled = this.stakeIndex === STAKES.length - 1;
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
