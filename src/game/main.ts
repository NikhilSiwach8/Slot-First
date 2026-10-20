import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/fraunces/800-italic.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/700.css';
import './styles.css';

import { Application } from 'pixi.js';
import { MODES, type Mode } from '../engine/config';
import { Rng } from '../engine/rng';
import { playRound } from '../engine/round';
import { loadAll } from './assets';
import { pickBackend, RgsError, type Jurisdiction, type Session } from './backend';
import { autoplay, errorCard, intro, modalOpen, posterWall, programme, settings, type AutoplaySettings, type Settings } from './overlays';
import { playBook } from './player';
import { isMuted, setMuted, sfx } from './sfx';
import { enableSocialMode } from './social';
import { Stage } from './stage';
import { clock, setSkipping, setTurbo, wait } from './tween';
import { setCurrency, Ui } from './ui';

const params = new URLSearchParams(location.search);

function store<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`shadowplay:${key}`);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown): void {
  try { localStorage.setItem(`shadowplay:${key}`, JSON.stringify(v)); } catch { /* storage blocked */ }
}

async function boot(): Promise<void> {
  const loader = document.querySelector('#loader') as HTMLElement;
  const burn = loader.querySelector('.fuse-burn') as HTMLElement;
  const spark = loader.querySelector('.fuse-spark') as HTMLElement;
  const progress = (p: number) => {
    burn.style.width = `${p * 100}%`;
    spark.style.left = `${p * 100}%`;
  };

  const app = new Application();
  await app.init({
    resizeTo: window, background: '#0b0a0d', antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
  });
  document.querySelector('#stage')!.appendChild(app.canvas);
  clock.ticker = app.ticker;
  app.ticker.minFPS = 5;
  if (import.meta.env.DEV && params.has('speed')) clock.base = Number(params.get('speed')); // dev: faster playback

  await Promise.all([loadAll(progress), document.fonts.load('800 italic 34px Fraunces'), document.fonts.load('700 20px Fraunces')]);
  progress(1);
  spark.hidden = true;

  const stage = new Stage(app);
  const ui = new Ui();
  const seed = params.has('seed') ? Number(params.get('seed')) : (Math.random() * 2 ** 32) >>> 0;
  const backend = pickBackend(params, seed);
  const replay = backend.kind === 'replay';

  let session: Session;
  try {
    session = await backend.start();
  } catch (e) {
    loader.remove();
    await errorCard(e instanceof RgsError ? e.message : 'The game could not start. Please reload.', false);
    return;
  }
  const flags: Jurisdiction = session.jurisdiction;
  if (flags.socialCasino || params.get('social') === 'true') enableSocialMode(document.querySelector('#app') as HTMLElement);
  setCurrency(session.currency);
  ui.setStakes(session.stakes, session.defaultStake);
  if (flags.disabledAutoplay || replay) ui.buttons.autoplay.hidden = true;
  if (flags.disabledTurbo) ui.buttons.turbo.hidden = true;
  if (replay) document.body.classList.add('replay');

  let prefs: Settings = { turbo: !flags.disabledTurbo && store('turbo', false), reducedMotion: store('reducedMotion', clock.reducedMotion), intro: store('intro', true) };
  let balance = session.balance;
  let ante = false;
  let busy = false;
  let auto: { left: number; cfg: AutoplaySettings; startBalance: number } | null = null;

  const applyPrefs = () => {
    setTurbo(prefs.turbo);
    clock.reducedMotion = prefs.reducedMotion;
    ui.buttons.turbo.setAttribute('aria-pressed', String(prefs.turbo));
  };
  applyPrefs();
  setMuted(store('muted', false));
  ui.buttons.sound.setAttribute('aria-pressed', String(!isMuted()));

  const cost = () => MODES[ante ? 'ante' : 'base'].cost * ui.stake;
  const refresh = () => {
    ui.setBalance(balance, replay || balance >= cost() - 1e-9);
    ui.setSpinEnabled(replay || busy || balance >= cost() - 1e-9);
    ui.setModeChip(ante ? 'Extra Wick lit · 1.25×' : null);
  };
  ui.onStake = () => { sfx.click(); refresh(); };

  const relayout = () => {
    const apron = document.querySelector('#apron') as HTMLElement;
    // Keep the grid clear of the bet bar and of the marquee when it sits above the bar.
    const m = (document.querySelector('#marquee') as HTMLElement).getBoundingClientRect();
    const reserve = m.top > window.innerHeight / 2 ? window.innerHeight - m.top - m.height * 0.2 : apron.offsetHeight;
    stage.layout(window.innerWidth, window.innerHeight, Math.max(apron.offsetHeight, reserve));
    ui.relayout();
  };
  window.addEventListener('resize', relayout);
  relayout();

  if (replay) {
    for (const b of [ui.buttons.playbill, ui.buttons.turbo]) b.hidden = true;
    ui.spinBtn.setAttribute('aria-label', 'Play the replay');
  }

  // A first board so the stage is never empty.
  const first = playRound(new Rng(seed ^ 0x51), 'base').events.find((e) => e.type === 'reveal'); // decorative only
  if (first && first.type === 'reveal') stage.showBoard(first.board);
  ui.marquee('Place your stake', '');
  refresh();

  /** Animate a round, then close it with the backend. */
  async function run(book: Parameters<typeof playBook>[0], stake: number): Promise<number> {
    const started = performance.now();
    const won = await playBook(book, stake, stage, ui, auto !== null);
    const left = flags.minimumRoundDuration - (performance.now() - started);
    if (left > 0) await wait(left);
    const after = await backend.finish(book, stake);
    if (!Number.isNaN(after)) balance = after;
    return won;
  }

  async function play(mode: Mode): Promise<void> {
    const price = MODES[mode].cost * ui.stake;
    if (busy || (!replay && balance < price - 1e-9)) return;
    busy = true;
    setSkipping(false);
    ui.setBusy(true);
    ui.marquee(replay ? 'Replay' : 'Good luck', '');
    try {
      const res = await backend.play(mode, ui.stake);
      if (!replay) balance = res.balance;
      refresh();
      const won = await run(res.book, replay ? (backend as unknown as { stake: number }).stake : ui.stake);
      if (auto) {
        auto.left--;
        const shows = res.book.events.some((e) => e.type === 'showStart');
        const stop = auto.left <= 0
          || (auto.cfg.stopOnShow && shows)
          || (auto.cfg.stopOnWin !== null && won >= auto.cfg.stopOnWin)
          || (auto.cfg.stopOnLoss !== null && auto.startBalance - balance >= auto.cfg.stopOnLoss);
        if (stop) auto = null;
      }
    } catch (e) {
      auto = null;
      await errorCard(e instanceof RgsError ? e.message : 'This round could not be shown. Please reload the game to finish it.', true);
    } finally {
      busy = false;
      setSkipping(false);
      ui.setBusy(false);
      ui.setAutoplayCount(auto ? auto.left : null);
      refresh();
      if (replay) ui.marquee('Replay finished', '');
    }
    if (auto && balance >= cost() - 1e-9) setTimeout(() => play(ante ? 'ante' : 'base'), 350);
    else auto = null;
    ui.setAutoplayCount(auto ? auto.left : null);
  }

  const spinOrSkip = () => {
    if (modalOpen()) return;
    if (busy) {
      setSkipping(true);
      if (auto) { auto = null; ui.setAutoplayCount(null); }
      return;
    }
    sfx.click();
    void play(replay ? (backend as unknown as { mode: Mode }).mode : ante ? 'ante' : 'base');
  };

  ui.spinBtn.addEventListener('click', spinOrSkip);
  window.addEventListener('keydown', (e) => {
    if (modalOpen()) return;
    if ((e.key === ' ' || e.code === 'Space') && !flags.disabledSpacebar) { e.preventDefault(); spinOrSkip(); }
    if (e.key === 'ArrowLeft') ui.setStake(ui.stakeIndex - 1);
    if (e.key === 'ArrowRight') ui.setStake(ui.stakeIndex + 1);
  });

  ui.buttons.turbo.addEventListener('click', () => {
    prefs = { ...prefs, turbo: !prefs.turbo };
    save('turbo', prefs.turbo);
    applyPrefs();
  });
  ui.buttons.sound.addEventListener('click', () => {
    setMuted(!isMuted());
    save('muted', isMuted());
    ui.buttons.sound.setAttribute('aria-pressed', String(!isMuted()));
    ui.buttons.sound.setAttribute('aria-label', isMuted() ? 'Sound off' : 'Sound on');
    sfx.click();
  });
  ui.buttons.info.addEventListener('click', () => programme(ui.stake, { displayRTP: flags.displayRTP, buys: !flags.disabledBuyFeature }));
  ui.buttons.settings.addEventListener('click', () => settings(prefs, (s) => {
    prefs = s;
    save('turbo', s.turbo);
    save('reducedMotion', s.reducedMotion);
    save('intro', s.intro);
    applyPrefs();
  }));
  ui.buttons.playbill.addEventListener('click', async () => {
    if (busy) return;
    const mode = await posterWall(ui.stake, ante, balance, !flags.disabledBuyFeature);
    if (mode === 'base' || mode === 'ante') { ante = mode === 'ante'; refresh(); }
    else if (mode) void play(mode);
  });
  ui.buttons.autoplay.addEventListener('click', async () => {
    if (busy) { auto = null; ui.setAutoplayCount(null); return; }
    const cfg = await autoplay(ui.stake);
    if (!cfg) return;
    auto = { left: cfg.spins, cfg, startBalance: balance };
    ui.setAutoplayCount(auto.left);
    void play(ante ? 'ante' : 'base');
  });

  // Loader → "Tap to raise the curtain" → intro.
  const raise = loader.querySelector('#raise-curtain') as HTMLButtonElement;
  raise.hidden = false;
  raise.focus();
  await new Promise<void>((res) => {
    const go = () => { window.removeEventListener('keydown', key, true); res(); };
    const key = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } };
    window.addEventListener('keydown', key, true);
    raise.addEventListener('click', go, { once: true });
  });
  sfx.fanfare();
  loader.classList.add('gone');
  setTimeout(() => loader.remove(), 700);
  if (session.resume) {
    // A round was left unfinished: show it, then close it.
    const { book, stake } = session.resume;
    busy = true;
    ui.setBusy(true);
    await ui.banner('WELCOME BACK', 'Finishing your last round', '', 1400);
    try { await run(book, stake); } catch (e) { await errorCard(e instanceof RgsError ? e.message : 'The last round could not be finished.', true); }
    busy = false;
    ui.setBusy(false);
    refresh();
  } else if (replay) {
    ui.marquee('Replay', 'Press play');
  } else if (prefs.intro && !params.has('nointro')) {
    const again = await intro();
    if (!again) { prefs = { ...prefs, intro: false }; save('intro', false); }
  }
  if (import.meta.env.DEV) (window as unknown as { __shadowplay: unknown }).__shadowplay = { play, stage, ui, get balance() { return balance; } };
}

void boot();
