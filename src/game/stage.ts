import { Application, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { REELS, ROWS, type Flame, type ShowKind, type Side, type Sym } from '../engine/config';
import type { Board, Cell, Grid, ShadowRay } from '../engine/light';
import { inkMultiplier } from '../engine/light';
import { tex } from './assets';
import { animate, clock, ease, tween, wait } from './tween';

// Everything is laid out in "scene units". Inside the grid one cell is 100 × 100 units and
// the grid container is scaled to the cell size the current layout wants.

const U = 100;
const GRID_W = REELS * U;
const GRID_H = ROWS * U;

type Orientation = 'landscape' | 'portrait';

interface SceneSpec {
  w: number;
  h: number;
  cell: number;
  gx: number;
  gy: number;
}

const SCENES: Record<Orientation, SceneSpec> = {
  landscape: { w: 1672, h: 941, cell: 105, gx: 521, gy: 254 },
  portrait: { w: 941, h: 1672, cell: 126, gx: 92, gy: 400 },
};

const PLATE: Partial<Record<Sym, number>> = {
  H1: 0xffb648, H2: 0xff5a2a, H3: 0xff7aa8, H4: 0x3fd9c2, H5: 0x9fd18b, W: 0x8a5cff, S: 0xffd27a, B: 0xff9a3a,
};
const FLAME_TEX: Record<Flame, string> = { 1: 'lanterns/candle', 2: 'lanterns/lamp', 3: 'lanterns/bonfire' };
const FLAME_GLOW: Record<Flame, number> = { 1: 0.9, 2: 1.25, 3: 1.7 };

/** Rail around the grid, in grid units; t = 0 left, 1 top, 2 right, 3 bottom (clockwise). */
let RAIL = { l: -60, t: -66, r: GRID_W + 60, b: GRID_H + 46 };
const RAILS: Record<Orientation, typeof RAIL> = {
  landscape: RAIL,
  portrait: { l: -34, t: -60, r: GRID_W + 34, b: GRID_H + 40 },
};
const SIDE_T: Record<Side, number> = { left: 0, top: 1, right: 2, bottom: 3 };

function railPoint(t: number): { x: number; y: number } {
  const cx = GRID_W / 2;
  const cy = GRID_H / 2;
  const pts = [
    { x: RAIL.l, y: cy }, { x: RAIL.l, y: RAIL.t }, { x: cx, y: RAIL.t }, { x: RAIL.r, y: RAIL.t },
    { x: RAIL.r, y: cy }, { x: RAIL.r, y: RAIL.b }, { x: cx, y: RAIL.b }, { x: RAIL.l, y: RAIL.b },
  ];
  const u = (((t % 4) + 4) % 4) * 2;
  const i = Math.floor(u);
  const f = u - i;
  const a = pts[i % 8];
  const b = pts[(i + 1) % 8];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function radialTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return Texture.from(c);
}

function fit(sprite: Sprite, w: number, h: number): void {
  const t = sprite.texture;
  const s = Math.min(w / t.width, h / t.height);
  sprite.scale.set(s);
}

const isLow = (s: Sym) => s[0] === 'L';

class CellView {
  readonly root = new Container();
  readonly plate: Sprite;
  readonly ink: Sprite;
  readonly sym: Sprite;
  readonly shadow: Sprite;
  readonly label: Text;
  readonly frame: Sprite;
  symbol: Sym = 'L1';
  inkDepth = 0;
  baseScale = 1;
  shadowScale = 1;

  constructor(radial: Texture, labelStyle: TextStyle) {
    this.plate = new Sprite(radial);
    this.plate.anchor.set(0.5);
    this.plate.width = this.plate.height = 132;
    this.ink = new Sprite(tex['fx/ink_faint']);
    this.ink.anchor.set(0.5);
    this.ink.alpha = 0;
    this.sym = new Sprite(Texture.EMPTY);
    this.sym.anchor.set(0.5);
    this.shadow = new Sprite(Texture.EMPTY);
    this.shadow.anchor.set(0.5);
    this.shadow.alpha = 0;
    this.label = new Text({ text: '', style: labelStyle });
    this.label.anchor.set(1, 1);
    this.label.position.set(48, 50);
    this.frame = new Sprite(tex['fx/win_frame']);
    this.frame.anchor.set(0.5);
    fit(this.frame, 108, 108);
    this.frame.alpha = 0;
    this.root.addChild(this.plate, this.ink, this.sym, this.shadow, this.label, this.frame);
  }

  setSymbol(s: Sym): void {
    this.symbol = s;
    this.sym.texture = tex[`symbols/${s}`];
    const size = isLow(s) ? 80 : s === 'S' ? 98 : 94;
    fit(this.sym, size, size);
    this.baseScale = this.sym.scale.x;
    this.sym.tint = isLow(s) ? 0xd7cdc2 : 0xffffff;
    this.sym.alpha = 1;
    const color = PLATE[s];
    this.plate.visible = color !== undefined;
    if (color !== undefined) this.plate.tint = color;
    this.plate.alpha = s === 'W' ? 0.75 : 0.5;
  }

  setShadow(s: Sym | null): void {
    if (!s) {
      this.shadow.alpha = 0;
      this.sym.alpha = 1;
      return;
    }
    this.shadow.texture = tex[`shadows/${s}`];
    fit(this.shadow, 104, 104);
    this.shadowScale = this.shadow.scale.x;
  }

  setInk(depth: number): void {
    this.inkDepth = depth;
    const m = inkMultiplier(depth);
    if (m === 0) {
      this.ink.alpha = 0;
      this.label.text = '';
      return;
    }
    this.ink.texture = tex[m <= 3 ? 'fx/ink_faint' : m <= 6 ? 'fx/ink_medium' : 'fx/ink_deep'];
    fit(this.ink, 124, 124);
    this.ink.alpha = 0.9;
    this.label.text = `×${m}`;
  }
}

interface LanternView {
  root: Container;
  body: Sprite;
  glow: Sprite;
  t: number;
}

export class Stage {
  readonly app: Application;
  private orientation: Orientation = 'landscape';
  private readonly backdrop = new Container();
  /** Sky, hills, trees and grass: cover the whole screen behind the stage. */
  private readonly back = new Container();
  private readonly backShow = new Sprite();
  private readonly scene = new Container();
  private readonly layers = {
    sky: new Sprite(), hills: new Sprite(), trees: new Sprite(), prosc: new Sprite(), fore: new Sprite(), show: new Sprite(),
  };
  private readonly gridC = new Container();
  private readonly scrim = new Graphics();
  private readonly rail = new Graphics();
  private readonly wash: Sprite;
  private readonly cellLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly lanternLayer = new Container();
  private readonly ambient = new Container();
  private readonly cells: CellView[][] = [];
  private lanterns: LanternView[] = [];
  private readonly radial: Texture;
  private flame: Flame = 1;
  private show: ShowKind | null = null;
  private parallax = { x: 0, y: 0 };
  private texturesApplied = false;

  constructor(app: Application) {
    this.app = app;
    this.radial = radialTexture();
    this.wash = new Sprite(this.radial);
    this.wash.anchor.set(0.5);
    this.wash.blendMode = 'add';
    this.wash.alpha = 0;

    const { sky, hills, trees, prosc, fore, show } = this.layers;
    this.back.addChild(sky, hills, trees, fore);
    this.backdrop.addChild(this.back, this.backShow);
    this.scene.addChild(show, prosc, this.gridC, this.ambient);
    show.alpha = 0;
    this.backShow.alpha = 0;
    this.backShow.tint = 0x8a8090;

    const labelStyle = new TextStyle({
      fontFamily: 'Fraunces', fontStyle: 'italic', fontWeight: '800', fontSize: 34, fill: 0xf1eaff,
      stroke: { color: 0x22104f, width: 6 },
      dropShadow: { color: 0x6b3cff, blur: 10, distance: 0, alpha: 1 },
    });
    for (let r = 0; r < REELS; r++) {
      this.cells.push([]);
      for (let c = 0; c < ROWS; c++) {
        const v = new CellView(this.radial, labelStyle);
        v.root.position.set(r * U + U / 2, c * U + U / 2);
        this.cellLayer.addChild(v.root);
        this.cells[r].push(v);
      }
    }
    this.scrim.roundRect(-16, -16, GRID_W + 32, GRID_H + 32, 26).fill({ color: 0x0b0710, alpha: 0.55 });
    this.scrim.roundRect(-16, -16, GRID_W + 32, GRID_H + 32, 26).stroke({ color: 0xe2b25a, alpha: 0.35, width: 2 });
    for (let r = 1; r < REELS; r++) this.scrim.moveTo(r * U, 6).lineTo(r * U, GRID_H - 6).stroke({ color: 0xe2b25a, alpha: 0.08, width: 2 });
    this.rail.roundRect(RAIL.l, RAIL.t, RAIL.r - RAIL.l, RAIL.b - RAIL.t, 40).stroke({ color: 0xc8954a, alpha: 0.22, width: 2 });

    this.gridC.addChild(this.scrim, this.rail, this.wash, this.cellLayer, this.fxLayer, this.lanternLayer);
    app.stage.addChild(this.backdrop, this.scene);
    this.setLanterns(['left'], 1, true);
    this.startAmbient();

    app.stage.eventMode = 'static';
    window.addEventListener('pointermove', (e) => {
      this.parallax.x = e.clientX / window.innerWidth - 0.5;
      this.parallax.y = e.clientY / window.innerHeight - 0.5;
    });
    app.ticker.add(() => this.drift());
  }

  // ---------------------------------------------------------------- layout

  private last = { w: 0, h: 0, reserve: 0 };

  private relayoutBackdrop(): void {
    this.layout(this.last.w, this.last.h, this.last.reserve);
  }

  layout(width: number, height: number, bottomReserve: number): void {
    this.last = { w: width, h: height, reserve: bottomReserve };
    const o: Orientation = width / height < 0.9 ? 'portrait' : 'landscape';
    if (o !== this.orientation || !this.texturesApplied) {
      this.texturesApplied = true;
      RAIL = RAILS[o];
      this.rail.clear().roundRect(RAIL.l, RAIL.t, RAIL.r - RAIL.l, RAIL.b - RAIL.t, 40).stroke({ color: 0xc8954a, alpha: 0.22, width: 2 });
      this.lanterns.forEach((l) => { l.root.scale.set(o === 'portrait' ? 0.72 : 1); this.placeLantern(l, l.t); });
      this.orientation = o;
      this.applyTextures();
    }
    const spec = SCENES[o];
    const avail = height - bottomReserve;

    // Focus: the part of the scene that must stay on screen (grid, rail, Lanterns).
    const focus = o === 'landscape'
      ? { x: spec.gx - 80, y: 30, w: spec.cell * 6 + 160, h: spec.gy + spec.cell * 5.75 - 30 }
      : { x: spec.gx - 54, y: spec.gy - 170, w: spec.cell * 6 + 108, h: spec.cell * 5 + 250 };
    // Fit the focus area above the bet bar, but never zoom in past "cover".
    const scale = Math.min(width / focus.w, avail / focus.h, Math.max(width / spec.w, height / spec.h));
    this.scene.scale.set(scale);
    this.scene.x = width / 2 - (focus.x + focus.w / 2) * scale;
    this.scene.y = avail / 2 - (focus.y + focus.h / 2) * scale;

    this.gridC.position.set(spec.gx, spec.gy);
    this.gridC.scale.set(spec.cell / U);

    // The backdrop covers the whole screen.
    const cover = Math.max(width / spec.w, height / spec.h) * 1.04;
    for (const c of [this.back, this.backShow]) {
      c.scale.set(cover * (c === this.backShow ? spec.w / Math.max(1, this.backShow.texture.width) : 1));
      c.position.set(width / 2 - (spec.w * cover) / 2, height / 2 - (spec.h * cover) / 2);
    }
  }

  private applyTextures(): void {
    const L = this.layers;
    const o = this.orientation;
    const spec = SCENES[o];
    const set = (sp: Sprite, key: string | null) => {
      sp.texture = key ? tex[key] : Texture.EMPTY;
      sp.visible = !!key;
      sp.width = spec.w;
      sp.height = spec.h;
    };
    set(L.sky, o === 'landscape' ? 'bg/p1_sky' : 'bg/m_sky');
    set(L.hills, o === 'landscape' ? 'bg/p2_hills' : null);
    set(L.trees, o === 'landscape' ? 'bg/p3_trees' : null);
    set(L.prosc, o === 'landscape' ? 'bg/p4_proscenium' : 'bg/m_proscenium');
    set(L.fore, o === 'landscape' ? 'bg/p5_foreground' : 'bg/m_foreground');
    if (o === 'portrait') {
      // The mobile grass sits along the bottom of the stage floor.
      L.fore.height = spec.h * 0.42;
      L.fore.y = spec.h * 0.62;
    } else L.fore.y = 0;
    this.applyShowTexture();
  }

  private applyShowTexture(): void {
    const sp = this.layers.show;
    const spec = SCENES[this.orientation];
    if (this.show) {
      sp.texture = tex[`bg/${this.show}${this.orientation === 'portrait' ? '_m' : ''}`];
      sp.width = spec.w;
      sp.height = spec.h;
      this.backShow.texture = sp.texture;
      this.backShow.scale.set(1);
    }
  }

  private drift(): void {
    if (clock.reducedMotion) return;
    const { x, y } = this.parallax;
    this.layers.hills.x = -x * 6;
    this.layers.trees.x = -x * 12;
    this.layers.fore.x = -x * 20;
    this.layers.hills.y = -y * 3;
    this.layers.trees.y = -y * 5;
  }

  // ---------------------------------------------------------------- ambience

  private startAmbient(): void {
    if (clock.reducedMotion) return;
    const motes: { s: Sprite; vx: number; vy: number; ph: number }[] = [];
    const spec = () => SCENES[this.orientation];
    for (let i = 0; i < 26; i++) {
      const s = new Sprite(tex['particles/dust_mote']);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.scale.set(0.05 + Math.random() * 0.08);
      s.position.set(Math.random() * spec().w, Math.random() * spec().h);
      this.ambient.addChild(s);
      motes.push({ s, vx: (Math.random() - 0.5) * 0.15, vy: -0.05 - Math.random() * 0.2, ph: Math.random() * 6 });
    }
    this.app.ticker.add((t) => {
      const { w, h } = spec();
      for (const m of motes) {
        m.ph += 0.02 * t.deltaTime;
        m.s.x += (m.vx + Math.sin(m.ph) * 0.15) * t.deltaTime;
        m.s.y += m.vy * t.deltaTime;
        m.s.alpha = 0.35 + Math.sin(m.ph * 1.7) * 0.25;
        if (m.s.y < -20) { m.s.y = h + 10; m.s.x = Math.random() * w; }
      }
    });
    const flyMoth = async () => {
      await wait(6000 + Math.random() * 9000);
      if (!this.show) await this.mothFlight();
      flyMoth();
    };
    flyMoth();
  }

  private async mothFlight(): Promise<void> {
    const { w, h } = SCENES[this.orientation];
    const s = new Sprite(tex['particles/moth_up']);
    s.anchor.set(0.5);
    s.scale.set(0.22);
    const fromLeft = Math.random() < 0.5;
    s.position.set(fromLeft ? -40 : w + 40, h * (0.15 + Math.random() * 0.35));
    if (!fromLeft) s.scale.x *= -1;
    this.ambient.addChild(s);
    const frames = ['particles/moth_up', 'particles/moth_level', 'particles/moth_down', 'particles/moth_level'];
    let f = 0;
    const tx = fromLeft ? w + 60 : -60;
    const ty = s.y - 80 + Math.random() * 160;
    const x0 = s.x;
    const y0 = s.y;
    await animate(5200, (p) => {
      s.x = x0 + (tx - x0) * p;
      s.y = y0 + (ty - y0) * p + Math.sin(p * 18) * 14;
      const nf = Math.floor(p * 70) % 4;
      if (nf !== f) { f = nf; s.texture = tex[frames[f]]; }
    }, ease.linear);
    s.destroy();
  }

  // ---------------------------------------------------------------- shows

  async setShow(kind: ShowKind | null): Promise<void> {
    const sp = this.layers.show;
    if (kind) {
      this.show = kind;
      this.applyShowTexture();
      this.relayoutBackdrop();
      await Promise.all([tween(sp, { alpha: 1 }, 700), tween(this.backShow, { alpha: 1 }, 700)]);
      this.layers.prosc.alpha = 0;
      this.back.alpha = 0;
    } else {
      this.layers.prosc.alpha = 1;
      this.back.alpha = 1;
      await Promise.all([tween(sp, { alpha: 0 }, 700), tween(this.backShow, { alpha: 0 }, 700)]);
      this.show = null;
    }
  }

  // ---------------------------------------------------------------- board

  showBoard(board: Board): void {
    for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) this.cells[r][c].setSymbol(board[r][c]);
  }

  setInkGrid(ink: Grid<number>): void {
    for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) this.cells[r][c].setInk(ink[r][c]);
  }

  /** Spin: old flats slide out, new ones drop in reel by reel, while the Lantern swings. */
  async reveal(board: Board, keepInk: boolean): Promise<void> {
    this.clearShadows(true);
    if (!keepInk) this.setInkGrid(Array.from({ length: REELS }, () => Array(ROWS).fill(0)));
    const drops: Promise<void>[] = [];
    for (let r = 0; r < REELS; r++) {
      drops.push((async () => {
        await wait(r * 75);
        const col = this.cells[r];
        await Promise.all(col.map((v) => tween(v.sym, { y: 46, alpha: 0 }, 150, ease.inCubic)));
        col.forEach((v, c) => {
          v.setSymbol(board[r][c]);
          v.sym.y = -70;
          v.sym.alpha = 0;
          v.plate.alpha = 0;
        });
        await Promise.all(col.map((v, c) => (async () => {
          await wait(c * 22);
          await Promise.all([
            tween(v.sym, { y: 0, alpha: 1 }, 300, ease.outBack),
            tween(v.plate, { alpha: v.symbol === 'W' ? 0.75 : 0.5 }, 300),
          ]);
        })()));
      })());
    }
    await Promise.all(drops);
  }

  // ---------------------------------------------------------------- lanterns

  setLanterns(sides: Side[], flame: Flame, instant = false): Promise<void> {
    this.flame = flame;
    while (this.lanterns.length < sides.length) this.lanterns.push(this.makeLantern(SIDE_T[sides[this.lanterns.length]]));
    while (this.lanterns.length > sides.length) this.lanterns.pop()!.root.destroy({ children: true });
    this.lanterns.forEach((l) => {
      l.body.texture = tex[FLAME_TEX[flame]];
      fit(l.body, 74, 140);
      l.glow.scale.set(FLAME_GLOW[flame] * 1.7);
    });
    return Promise.all(sides.map((s, i) => this.moveLantern(this.lanterns[i], SIDE_T[s], instant))).then(() => this.paintWash(sides));
  }

  /** The Lanterns swing a full lap around the rail while the reels spin. */
  async lap(): Promise<void> {
    this.wash.alpha = 0;
    await Promise.all(this.lanterns.map((l) => {
      const from = l.t;
      return animate(720, (p) => this.placeLantern(l, from + p * 4), ease.inOutCubic);
    }));
  }

  private makeLantern(t: number): LanternView {
    const root = new Container();
    const glow = new Sprite(this.radial);
    glow.anchor.set(0.5);
    glow.tint = 0xffa040;
    glow.blendMode = 'add';
    glow.alpha = 0.55;
    const body = new Sprite(tex[FLAME_TEX[this.flame]]);
    body.anchor.set(0.5, 0.42);
    root.addChild(glow, body);
    this.lanternLayer.addChild(root);
    root.scale.set(this.orientation === 'portrait' ? 0.72 : 1);
    const l = { root, body, glow, t };
    this.placeLantern(l, t);
    this.app.ticker.add(() => {
      if (root.destroyed) return;
      const k = performance.now() / 1000;
      glow.alpha = 0.5 + Math.sin(k * 9) * 0.04 + Math.sin(k * 23) * 0.03 + (this.flame - 1) * 0.08;
      body.rotation = Math.sin(k * 1.3 + t) * 0.035;
    });
    return l;
  }

  private placeLantern(l: LanternView, t: number): void {
    const p = railPoint(t);
    l.root.position.set(p.x, p.y);
  }

  private async moveLantern(l: LanternView, target: number, instant: boolean): Promise<void> {
    let to = target;
    while (to < l.t - 1e-6) to += 4; // always travel clockwise
    if (instant || Math.abs(to - l.t) < 1e-6) {
      l.t = to % 4;
      this.placeLantern(l, l.t);
      return;
    }
    const from = l.t;
    await animate(380 + (to - from) * 220, (p) => this.placeLantern(l, from + (to - from) * p), ease.inOutCubic);
    l.t = to % 4;
  }

  private paintWash(sides: Side[]): void {
    const w = this.wash;
    w.tint = this.flame === 3 ? 0xff7a2a : 0xffb060;
    const p = railPoint(SIDE_T[sides[0]]);
    w.position.set(p.x, p.y);
    w.width = w.height = GRID_W * (0.9 + this.flame * 0.25);
    w.alpha = 0.16 + this.flame * 0.06;
  }

  // ---------------------------------------------------------------- light & shadow

  clearShadows(instant = false): Promise<void> {
    const all: Promise<void>[] = [];
    for (const col of this.cells) for (const v of col) {
      if (v.shadow.alpha > 0 || v.sym.alpha < 1) {
        if (instant) { v.shadow.alpha = 0; v.sym.alpha = 1; } else all.push(tween(v.shadow, { alpha: 0 }, 250), tween(v.sym, { alpha: 1 }, 250));
      }
      v.frame.alpha = 0;
    }
    return Promise.all(all).then(() => {});
  }

  /** Shadows slide out of each caster and settle on their cells; ink blooms where they overlap. */
  async cast(rays: ShadowRay[], shadow: Grid<Sym | null>, inkGain: Grid<number>, ink: Grid<number>): Promise<void> {
    const flights = rays.map((ray, i) => (async () => {
      await wait(Math.min(i * 6, 160));
      const s = new Sprite(tex[`shadows/${ray.sym}`]);
      s.anchor.set(0.5);
      fit(s, 100, 100);
      s.alpha = 0.0;
      const [fr, fc] = ray.from;
      const [tr, tc] = ray.to;
      s.position.set(fr * U + U / 2, fc * U + U / 2);
      this.fxLayer.addChild(s);
      await animate(340, (p) => {
        s.x = (fr + (tr - fr) * p) * U + U / 2;
        s.y = (fc + (tc - fc) * p) * U + U / 2;
        s.alpha = Math.sin(p * Math.PI) * 0.7;
      }, ease.outCubic);
      s.destroy();
    })());
    await Promise.all(flights);

    const settle: Promise<void>[] = [];
    for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) {
      const v = this.cells[r][c];
      const s = shadow[r][c];
      if (s) {
        v.setShadow(s);
        settle.push(tween(v.shadow, { alpha: 0.95 }, 220), tween(v.sym, { alpha: 0.2 }, 220));
      }
      if (inkGain[r][c] > 0) settle.push(this.bloom(v, ink[r][c]));
    }
    await Promise.all(settle);
  }

  private async bloom(v: CellView, depth: number): Promise<void> {
    v.setInk(depth);
    const target = v.ink.scale.x;
    v.ink.scale.set(target * 0.2);
    v.label.scale.set(0.2);
    await Promise.all([
      tween(v.ink.scale, { x: target, y: target }, 420, ease.outBack),
      tween(v.label.scale, { x: 1, y: 1 }, 420, ease.outElastic),
    ]);
  }

  /** Pulse the winning cells and dim the rest for a moment. */
  async showWin(cells: Cell[], ms = 950): Promise<void> {
    const on = new Set(cells.map(([r, c]) => r * 10 + c));
    const all: Promise<void>[] = [];
    for (let r = 0; r < REELS; r++) for (let c = 0; c < ROWS; c++) {
      const v = this.cells[r][c];
      if (on.has(r * 10 + c)) {
        const sprite = v.shadow.alpha > 0 ? v.shadow : v.sym;
        const s0 = sprite === v.shadow ? v.shadowScale : v.baseScale;
        all.push(animate(ms, (p) => {
          sprite.scale.set(s0 * (1 + Math.sin(p * Math.PI * 2) * 0.08));
          v.frame.alpha = 0.6 + Math.sin(p * Math.PI * 6) * 0.4;
        }, ease.linear).then(() => { sprite.scale.set(s0); v.frame.alpha = 0.5; }));
      } else {
        const a = v.root.alpha;
        all.push(tween(v.root, { alpha: 0.4 }, 200).then(() => wait(ms - 400)).then(() => tween(v.root, { alpha: a }, 200)));
      }
    }
    await Promise.all(all);
  }

  clearFrames(): void {
    for (const col of this.cells) for (const v of col) v.frame.alpha = 0;
  }

  /** Small jolt of the whole stage, like a curtain being yanked. */
  async jolt(): Promise<void> {
    if (clock.reducedMotion) return;
    const x0 = this.gridC.x;
    await animate(320, (p) => { this.gridC.x = x0 + Math.sin(p * Math.PI * 7) * (1 - p) * 9; }, ease.linear);
    this.gridC.x = x0;
  }

  /** Matches and Tickets flare in place. */
  async flare(cells: Cell[]): Promise<void> {
    await Promise.all(cells.map(([r, c]) => {
      const v = this.cells[r][c];
      const s0 = v.baseScale;
      v.frame.alpha = 1;
      return animate(800, (p) => v.sym.scale.set(s0 * (1 + Math.sin(p * Math.PI) * 0.35)), ease.outCubic).then(() => v.sym.scale.set(s0));
    }));
  }

  /** Embers rise from the grid when a Bonfire burns. */
  embers(count = 18): void {
    if (clock.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const s = new Sprite(tex['particles/paper_ember']);
      s.anchor.set(0.5);
      s.scale.set(0.08 + Math.random() * 0.08);
      s.blendMode = 'add';
      s.position.set(Math.random() * GRID_W, GRID_H + 20);
      this.fxLayer.addChild(s);
      const dx = (Math.random() - 0.5) * 120;
      const x0 = s.x;
      animate(1400 + Math.random() * 900, (p) => {
        s.y = GRID_H + 20 - p * (GRID_H + 120);
        s.x = x0 + dx * p + Math.sin(p * 10) * 10;
        s.alpha = Math.sin(p * Math.PI);
        s.rotation = p * 4;
      }, ease.linear).then(() => s.destroy());
    }
  }

  /** Screen position (CSS px) of the grid centre, for DOM overlays. */
  gridCenter(): { x: number; y: number } {
    const p = this.gridC.toGlobal({ x: GRID_W / 2, y: GRID_H / 2 });
    return { x: p.x, y: p.y };
  }
}
