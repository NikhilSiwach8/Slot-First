import {
  FLAME_NAMES, INK_CAP_BASE, INK_CAP_SHOW, MAX_WIN, MODES, PAYTABLE, RETRIGGER_SPINS, RTP_TARGET, SCATTER_PAY, SHOWS,
  SYMBOL_NAMES, type Flame, type Mode, type ShowKind, type Side, type Sym,
} from '../engine/config';
import { cast } from '../engine/light';
import { url } from './assets';
import { sfx } from './sfx';
import { animate, ease, wait } from './tween';
import { money } from './ui';

const layer = document.querySelector('#layer') as HTMLElement;

function el(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

/** Opens a modal sheet. Resolves when it closes. */
export function modal(content: HTMLElement, opts: { dark?: boolean; label: string }): { close: () => void; done: Promise<void> } {
  const scrim = el(`<div class="scrim" role="dialog" aria-modal="true" aria-label="${opts.label}"></div>`);
  const sheet = el(`<div class="sheet${opts.dark ? ' dark-sheet' : ''}"><button class="close" aria-label="Close">✕</button></div>`);
  sheet.appendChild(content);
  scrim.appendChild(sheet);
  layer.appendChild(scrim);
  const prev = document.activeElement as HTMLElement | null;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const close = () => {
    scrim.remove();
    window.removeEventListener('keydown', onKey, true);
    prev?.focus?.();
    resolve();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === ' ') e.stopPropagation();
  };
  window.addEventListener('keydown', onKey, true);
  sheet.querySelector('.close')!.addEventListener('click', close);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  (sheet.querySelector('.close') as HTMLElement).focus();
  return { close, done };
}

export function modalOpen(): boolean {
  return layer.querySelector('.scrim') !== null;
}

// ------------------------------------------------------------------ the Programme

const ORDER: Sym[] = ['H1', 'H2', 'H3', 'H4', 'H5', 'L1', 'L2', 'L3', 'L4', 'L5'];

function demoWidget(): HTMLElement {
  const rows = [
    'L1 L3 L2 L5 L4 L2',
    'H1 L2 L4 L1 L3 L5',
    'L4 W  L1 H2 L2 L1',
    'L2 L5 L3 L4 H1 L3',
    'L5 L1 H4 L2 L5 L4',
  ].map((r) => r.split(/\s+/) as Sym[]);
  const board = Array.from({ length: 6 }, (_, r) => rows.map((row) => row[r]));
  let side: Side = 'left';
  let flame: Flame = 1;
  const root = el(`<div><div class="demo-controls"></div><div class="demo-board"></div><p class="lead" style="font-size:13px"></p></div>`);
  const controls = root.querySelector('.demo-controls')!;
  const grid = root.querySelector('.demo-board')!;
  const note = root.querySelector('p')!;
  const render = () => {
    const res = cast(board, [side], flame);
    grid.replaceChildren();
    for (let c = 0; c < 5; c++) for (let r = 0; r < 6; r++) {
      const s = board[r][c];
      const sh = res.shadow[r][c];
      const cell = el(`<div class="demo-cell${s[0] === 'L' ? ' low' : ''}${sh ? ' shaded' : ''}"><img class="base" src="${url(`symbols/${s}`)}" alt="${SYMBOL_NAMES[s]}"></div>`);
      if (sh) cell.appendChild(el(`<img class="shadow" src="${url(`shadows/${sh}`)}" alt="shadow of ${SYMBOL_NAMES[sh]}">`));
      if (res.inkGain[r][c] > 0) cell.appendChild(el(`<span class="ink">×2</span>`));
      grid.appendChild(cell);
    }
    const n = res.shadow.flat().filter(Boolean).length;
    note.textContent = `Light from the ${side}, ${FLAME_NAMES[flame]}: ${n} shadow${n === 1 ? '' : 's'} on the stage.`;
    controls.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.side === side || Number(b.dataset.flame) === flame));
  };
  for (const s of ['left', 'top', 'right', 'bottom'] as Side[]) {
    const b = el(`<button data-side="${s}">Light ${s}</button>`);
    b.addEventListener('click', () => { side = s; render(); });
    controls.appendChild(b);
  }
  for (const f of [1, 2, 3] as Flame[]) {
    const b = el(`<button data-flame="${f}">${FLAME_NAMES[f]}</button>`);
    b.addEventListener('click', () => { flame = f; render(); });
    controls.appendChild(b);
  }
  render();
  return root;
}

export function programme(stake: number): void {
  const pay = (v: number) => money(v * stake);
  const cards = ORDER.map((s) => `
    <div class="pay-card">
      <img src="${url(`symbols/${s}`)}" alt="">
      <div class="nm">${SYMBOL_NAMES[s]}</div>
      <table>${[6, 5, 4, 3].map((n) => `<tr><td>${n}×</td><td>${pay(PAYTABLE[s][n - 3])}</td></tr>`).join('')}</table>
    </div>`).join('');
  const content = el(`<div>
    <h2>The Programme</h2>
    <p class="lead">Every puppet casts a shadow. Tonight, the shadows pay.</p>
    <nav class="tabs">
      <a href="#p-overture">Overture</a><a href="#p-company">I · The Company</a><a href="#p-light">II · Light &amp; Shadow</a>
      <a href="#p-ink">III · Ink</a><a href="#p-encore">IV · Encore</a><a href="#p-shows">V · The Shows</a><a href="#p-box">Box Office</a><a href="#p-fine">Fine Print</a>
    </nav>

    <h3 id="p-overture">Overture</h3>
    <p>A 6-reel, 5-row stage that pays <b>15,625 ways</b> from the left. A Lantern lights the stage from one side and every puppet throws a shadow that counts as a real symbol. When a spin pays, the light moves and the same board can pay again.</p>
    <div class="stats">
      <div class="stat"><b>${(RTP_TARGET * 100).toFixed(1)}%</b><span>Target RTP</span></div>
      <div class="stat"><b>${MAX_WIN.toLocaleString('en-US')}×</b><span>Max win</span></div>
      <div class="stat"><b>High</b><span>Volatility</span></div>
      <div class="stat"><b>15,625</b><span>Ways</span></div>
    </div>

    <h3 id="p-company">Act I · The Company</h3>
    <p>Pays per way at your current stake of <b>${money(stake)}</b>, for 3 to 6 matching symbols on adjacent reels starting from reel 1. The <b>Moth</b> is wild: it lands on reels 2–6 and stands in for every paying symbol.</p>
    <div class="paytable">${cards}
      <div class="pay-card"><img src="${url('symbols/W')}" alt=""><div class="nm">Moth (Wild)</div><table><tr><td colspan="2">Substitutes for all paying symbols. Its shadow is wild too.</td></tr></table></div>
      <div class="pay-card"><img src="${url('symbols/S')}" alt=""><div class="nm">Ticket (Scatter)</div><table>${[6, 5, 4, 3].map((n) => `<tr><td>${n}×</td><td>${pay(SCATTER_PAY[n - 3])}</td></tr>`).join('')}</table></div>
    </div>

    <h3 id="p-light">Act II · Light &amp; Shadow</h3>
    <p>Each spin the Lantern settles on one side of the stage with a flame: <b>Candle</b> (shadows 1 cell long), <b>Lamp</b> (2) or <b>Bonfire</b> (3). Every puppet (the five high symbols) and every Moth throws a violet-ink copy of itself away from the light. A shadow counts as that symbol. Shadows only fall on Hand Shadow cells (the five low symbols); puppets, Moths and Tickets are never covered. Where shadows of different symbols meet, the higher-paying one takes the cell. Try it:</p>
    <div class="demo"></div>

    <h3 id="p-ink">Act III · Ink</h3>
    <p>Ink forms where light piles up: when two shadows of the same symbol land on one cell, or a Moth's shadow falls on a puppet. Each time, that cell's ink deepens by one step: ×2, ×3, ×4 and so on. <b>Every way pays the deepest ink it passes through.</b> Ink is capped at ×${INK_CAP_BASE} in the base game and ×${INK_CAP_SHOW} in the Shows.</p>

    <h3 id="p-encore">Act IV · Encore</h3>
    <p>If a spin pays, the Lantern moves clockwise to the next side and new shadows fall on the same board. Ink that has formed stays. An Encore pays only what the new shadows add, so nothing is paid twice. The curtain rises again only while each Encore's applause matches or beats the last one. If all four sides pay, it's a <b>Full Circle</b>: the Lantern returns to where it began as a <b>Bonfire</b> for a fifth Act.</p>

    <h3 id="p-shows">Act V · The Shows</h3>
    <div class="paytable">
      <div class="pay-card"><img src="${url('posters/matinee')}" alt="" style="height:120px;width:auto"><div class="nm">3 Tickets · ${SHOWS.matinee.name}</div><table><tr><td colspan="2">${SHOWS.matinee.spins} spins. Ink stays on its cell for the whole show.</td></tr></table></div>
      <div class="pay-card"><img src="${url('posters/midnight')}" alt="" style="height:120px;width:auto"><div class="nm">4 Tickets · ${SHOWS.midnight.name}</div><table><tr><td colspan="2">${SHOWS.midnight.spins} spins. Starts at Lamp with a ×2 ink cell on every reel.</td></tr></table></div>
      <div class="pay-card"><img src="${url('posters/lights_out')}" alt="" style="height:120px;width:auto"><div class="nm">5+ Tickets · ${SHOWS.lightsOut.name}</div><table><tr><td colspan="2">${SHOWS.lightsOut.spins} spins. Two Lanterns on opposite sides, plus a ×2 ink cell on every reel.</td></tr></table></div>
    </div>
    <p>During a show, <b>Match</b> symbols can land. Each one raises the flame for the rest of the show (Candle → Lamp → Bonfire); once the flame is a Bonfire, each further Match lights another Lantern, up to four. Three or more Tickets in a show add ${RETRIGGER_SPINS} spins.</p>

    <h3 id="p-box">Box Office</h3>
    <div class="paytable">${(Object.keys(MODES) as Mode[]).map((m) => `<div class="pay-card"><div class="nm">${MODES[m].name}</div><table><tr><td>Cost</td><td>${MODES[m].cost}× · ${money(MODES[m].cost * stake)}</td></tr></table></div>`).join('')}</div>
    <p>Extra Wick raises the chance of Tickets and of Lamp and Bonfire flames for 1.25× the stake. A show buy starts that show straight away. The target RTP is the same for every mode.</p>

    <h3 id="p-fine">Fine Print</h3>
    <ul>
      <li>Ways pay left to right on adjacent reels from reel 1. For each symbol, the longest set of ways is paid.</li>
      <li>Order on every spin: the reels stop, the Lantern settles, shadows are cast, ink forms, wins are paid. Then the Encore, if any. Tickets pay and trigger after all Acts.</li>
      <li>The total win of a round, base game and show together, is capped at ${MAX_WIN.toLocaleString('en-US')}× the stake. When the cap is reached the round ends immediately.</li>
      <li>Wins are shown in the currency of your stake. Malfunction voids all pays and plays.</li>
      <li>This is a demo build that plays with play credits. The odds are generated locally; the published game is served by the Stake Engine RGS.</li>
    </ul>
  </div>`);
  content.querySelector('.demo')!.replaceWith(demoWidget());
  modal(content, { label: 'Game rules' });
}

// ------------------------------------------------------------------ the Poster Wall

const POSTERS: { mode: Mode; img: string; desc: string }[] = [
  { mode: 'base', img: 'standard', desc: 'The standard performance.' },
  { mode: 'ante', img: 'extra_wick', desc: 'More Tickets, brighter flames.' },
  { mode: 'buyMatinee', img: 'matinee', desc: `${SHOWS.matinee.spins} spins, ink stays.` },
  { mode: 'buyMidnight', img: 'midnight', desc: `${SHOWS.midnight.spins} spins, Lamp, ×2 ink on every reel.` },
  { mode: 'buyLightsOut', img: 'lights_out', desc: `${SHOWS.lightsOut.spins} spins, two Lanterns.` },
];

export function posterWall(stake: number, ante: boolean, balance: number): Promise<Mode | null> {
  return new Promise((resolve) => {
    let picked: Mode | null = null;
    const content = el(`<div><h2>The Playbill</h2><p class="lead" style="color:var(--wax-dim)">Choose tonight's performance.</p><div class="posters"></div></div>`);
    const wall = content.querySelector('.posters')!;
    const m = modal(content, { dark: true, label: 'Bet modes and show buys' });
    for (const p of POSTERS) {
      const cost = MODES[p.mode].cost * stake;
      const on = (p.mode === 'ante') === ante && (p.mode === 'base' || p.mode === 'ante');
      const b = el(`<button class="poster${on ? ' on' : ''}"><img src="${url(`posters/${p.img}`)}" alt=""><span class="pt">${MODES[p.mode].name.replace('Buy: ', '')}</span><span class="pc">${MODES[p.mode].cost}× · ${money(cost)}</span><span class="pd">${p.desc}</span></button>`) as HTMLButtonElement;
      if (cost > balance && MODES[p.mode].buy) b.disabled = true;
      b.addEventListener('click', async () => {
        sfx.click();
        if (!MODES[p.mode].buy) { picked = p.mode; m.close(); return; }
        const ok = await confirmBuy(p.mode, cost);
        if (ok) { picked = p.mode; m.close(); }
      });
      wall.appendChild(b);
    }
    m.done.then(() => resolve(picked));
  });
}

function confirmBuy(mode: Mode, cost: number): Promise<boolean> {
  return new Promise((resolve) => {
    let ok = false;
    const content = el(`<div style="text-align:center"><h2>${MODES[mode].name}</h2><p>This starts the show straight away.</p><p style="font-size:22px;font-family:var(--serif)">Cost <b>${money(cost)}</b> (${MODES[mode].cost}× stake)</p><div class="row" style="justify-content:center"><button class="btn ghost" data-a="no">Cancel</button><button class="btn" data-a="yes">Confirm buy</button></div></div>`);
    const m = modal(content, { label: 'Confirm buy' });
    content.querySelector('[data-a="yes"]')!.addEventListener('click', () => { ok = true; m.close(); });
    content.querySelector('[data-a="no"]')!.addEventListener('click', () => m.close());
    m.done.then(() => resolve(ok));
  });
}

// ------------------------------------------------------------------ autoplay & settings

export interface AutoplaySettings {
  spins: number;
  stopOnShow: boolean;
  stopOnWin: number | null; // single win above this amount
  stopOnLoss: number | null; // balance down by this amount
}

export function autoplay(stake: number): Promise<AutoplaySettings | null> {
  return new Promise((resolve) => {
    let result: AutoplaySettings | null = null;
    let spins = 25;
    const content = el(`<div>
      <h2>Repertory</h2><p class="lead">Autoplay a run of spins. It stops early on the conditions you pick.</p>
      <h3>Spins</h3><div class="row spins">${[10, 25, 50, 100].map((n) => `<button class="btn ${n === spins ? '' : 'ghost'}" data-n="${n}">${n}</button>`).join('')}</div>
      <h3>Stop when</h3>
      <label class="check" style="color:#3a220e"><input type="checkbox" name="show" checked> any Show starts</label><br>
      <label class="check" style="color:#3a220e"><input type="checkbox" name="win" checked> a single win reaches <b>${money(stake * 50)}</b></label><br>
      <label class="check" style="color:#3a220e"><input type="checkbox" name="loss" checked> the balance drops by <b>${money(stake * 50)}</b></label>
      <div class="row" style="justify-content:center;margin-top:18px"><button class="btn" data-a="go">Start ${spins} spins</button></div>
    </div>`);
    const m = modal(content, { label: 'Autoplay' });
    const go = content.querySelector('[data-a="go"]') as HTMLButtonElement;
    content.querySelectorAll<HTMLButtonElement>('[data-n]').forEach((b) => b.addEventListener('click', () => {
      spins = Number(b.dataset.n);
      content.querySelectorAll('[data-n]').forEach((x) => x.classList.toggle('ghost', x !== b));
      go.textContent = `Start ${spins} spins`;
    }));
    go.addEventListener('click', () => {
      const v = (n: string) => (content.querySelector(`[name="${n}"]`) as HTMLInputElement).checked;
      result = { spins, stopOnShow: v('show'), stopOnWin: v('win') ? stake * 50 : null, stopOnLoss: v('loss') ? stake * 50 : null };
      m.close();
    });
    m.done.then(() => resolve(result));
  });
}

export interface Settings {
  turbo: boolean;
  reducedMotion: boolean;
  intro: boolean;
}

export function settings(s: Settings, onChange: (s: Settings) => void): void {
  const content = el(`<div><h2>Settings</h2>
    <label class="check" style="color:#3a220e"><input type="checkbox" name="turbo" ${s.turbo ? 'checked' : ''}> Quick Change (faster spins)</label><br>
    <label class="check" style="color:#3a220e"><input type="checkbox" name="reducedMotion" ${s.reducedMotion ? 'checked' : ''}> Reduced motion</label><br>
    <label class="check" style="color:#3a220e"><input type="checkbox" name="intro" ${s.intro ? 'checked' : ''}> Show tonight's programme on start</label>
    <h3>Keys</h3><p><b>Space</b> spins or skips · <b>← →</b> change the stake · <b>Esc</b> closes a window.</p>
  </div>`);
  content.querySelectorAll('input').forEach((i) => i.addEventListener('change', () => {
    onChange({ ...s, [i.name]: i.checked });
    s = { ...s, [i.name]: i.checked };
  }));
  modal(content, { label: 'Settings' });
}

// ------------------------------------------------------------------ splash & show cards

export function intro(): Promise<boolean> {
  return new Promise((resolve) => {
    const scrim = el(`<div class="scrim"><div class="intro">
      <img class="logo" src="${url('ui/logo')}" alt="Shadowplay">
      <div class="intro-posters">
        <figure><img src="${url('fx/intro_light_casts')}" alt=""><figcaption>THE LIGHT CASTS</figcaption><p>Every puppet throws a shadow away from the Lantern. Shadows pay as real symbols.</p></figure>
        <figure><img src="${url('fx/intro_ink_deepens')}" alt=""><figcaption>THE INK DEEPENS</figcaption><p>Where shadows overlap, ink forms. Each way pays the deepest ink it touches.</p></figure>
        <figure><img src="${url('fx/intro_encore')}" alt=""><figcaption>ENCORE!</figcaption><p>A win moves the light. The same board pays again from a new side.</p></figure>
      </div>
      <div class="row" style="justify-content:center;gap:22px"><label class="check"><input type="checkbox" name="skip"> Don't show again</label><button class="btn" data-a="play">PLAY</button></div>
    </div></div>`);
    layer.appendChild(scrim);
    const btn = scrim.querySelector('[data-a="play"]') as HTMLButtonElement;
    btn.focus();
    const done = () => {
      const skip = (scrim.querySelector('[name="skip"]') as HTMLInputElement).checked;
      scrim.remove();
      window.removeEventListener('keydown', onKey, true);
      resolve(!skip);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); } };
    window.addEventListener('keydown', onKey, true);
    btn.addEventListener('click', done);
  });
}

const POSTER_OF: Record<ShowKind, string> = { matinee: 'matinee', midnight: 'midnight', lightsOut: 'lights_out' };
const SHOW_LINE: Record<ShowKind, string> = {
  matinee: 'The house lights dim. Ink stays on the stage for the whole show.',
  midnight: 'The moon rises. The flame starts at Lamp, with ink on every reel.',
  lightsOut: 'Total darkness. Then two Lanterns light at once.',
};

/** Full-screen card that waits for a tap (or times out during autoplay). */
function card(html: string, autoMs: number | null): Promise<void> {
  return new Promise((resolve) => {
    const scrim = el(`<div class="scrim"><div class="show-card">${html}<div class="row" style="justify-content:center"><button class="btn">Continue</button></div></div></div>`);
    layer.appendChild(scrim);
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      scrim.remove();
      window.removeEventListener('keydown', onKey, true);
      resolve();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(); } };
    window.addEventListener('keydown', onKey, true);
    scrim.querySelector('button')!.addEventListener('click', done);
    (scrim.querySelector('button') as HTMLElement).focus();
    if (autoMs !== null) wait(autoMs).then(done);
  });
}

export function showIntro(kind: ShowKind, spins: number, auto: boolean): Promise<void> {
  sfx.fanfare();
  return card(`<img class="poster-img" src="${url(`posters/${POSTER_OF[kind]}`)}" alt=""><h2>${SHOWS[kind].name}</h2><p>${spins} spins · ${SHOW_LINE[kind]}</p>`, auto ? 2600 : null);
}

export function showEnd(kind: ShowKind, total: number, deepestInk: number, encores: number, fullCircles: number, auto: boolean): Promise<void> {
  return card(`<h2>${SHOWS[kind].name}: curtain</h2>
    <p style="font-size:clamp(30px,5vw,56px);font-family:var(--serif);color:#fff;margin:8px 0 14px">${money(total)}</p>
    <div class="stats" style="max-width:520px;margin:0 auto 18px">
      <div class="stat"><b>${deepestInk ? `×${deepestInk}` : '–'}</b><span>Deepest ink</span></div>
      <div class="stat"><b>${encores}</b><span>Encores</span></div>
      <div class="stat"><b>${fullCircles}</b><span>Full Circles</span></div>
    </div>`, auto ? 2600 : null);
}

// ------------------------------------------------------------------ celebrations

/** The Applause Ladder. Tap or Space skips straight to the final amount. */
export function celebrate(tier: string, amount: number, level: number, finalBow: boolean): Promise<void> {
  return new Promise((resolve) => {
    const root = el(`<div class="celebrate" role="status"><div>
      ${finalBow ? `<img class="final-bow" src="${url('fx/final_bow')}" alt="">` : ''}
      <div class="tier">${tier}</div><div class="amt">0.00</div></div>
      <div class="hint">Tap to continue</div></div>`);
    if (level >= 2 && !finalBow) root.appendChild(el(`<img class="audience" src="${url('fx/audience_row')}" alt="">`));
    layer.appendChild(root);
    const amt = root.querySelector('.amt')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const falling = finalBow ? 'fx/gold_leaf' : 'fx/rose';
    if (!reduced) for (let i = 0; i < 12 + level * 10; i++) {
      const f = el(`<img class="fall" src="${url(i % 3 === 0 || finalBow ? falling : 'fx/rose')}" alt="">`);
      f.style.left = `${Math.random() * 100}%`;
      f.style.width = `${40 + Math.random() * 50}px`;
      f.style.animationDuration = `${2.6 + Math.random() * 2.4}s`;
      f.style.animationDelay = `${Math.random() * 2}s`;
      f.style.setProperty('--spin', `${(Math.random() - 0.5) * 720}deg`);
      root.appendChild(f);
    }
    sfx.fanfare();
    sfx.applause(1600 + level * 600);
    let stop = false;
    const total = 1800 + level * 700;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stop = true;
      amt.textContent = money(amount);
      setTimeout(() => { root.remove(); resolve(); }, 180);
      window.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); } };
    window.addEventListener('keydown', onKey, true);
    root.addEventListener('click', finish);
    (async () => {
      await animate(total, (p) => { if (!stop) amt.textContent = money(amount * p); }, ease.outCubic);
      amt.textContent = money(amount);
      if (!stop) await wait(1300);
      finish();
    })();
  });
}
