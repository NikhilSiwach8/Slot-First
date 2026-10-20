import { Assets, Texture } from 'pixi.js';

const base = import.meta.env.BASE_URL + 'assets/';

const SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'H5', 'L1', 'L2', 'L3', 'L4', 'L5', 'W', 'S', 'B'];
const SHADOWS = ['H1', 'H2', 'H3', 'H4', 'H5', 'W'];

const PATHS: string[] = [
  ...SYMBOLS.map((s) => `symbols/${s}`),
  ...SHADOWS.map((s) => `shadows/${s}`),
  'lanterns/candle', 'lanterns/lamp', 'lanterns/bonfire',
  'fx/ink_faint', 'fx/ink_medium', 'fx/ink_deep', 'fx/win_frame',
  'bg/p1_sky', 'bg/p2_hills', 'bg/p3_trees', 'bg/p4_proscenium', 'bg/p5_foreground',
  'bg/m_sky', 'bg/m_proscenium', 'bg/m_foreground',
  'bg/matinee', 'bg/midnight', 'bg/lightsOut', 'bg/matinee_m', 'bg/midnight_m', 'bg/lightsOut_m',
  'particles/dust_mote', 'particles/paper_ember', 'particles/smoke_wisp', 'particles/gold_leaf',
  'particles/moth_up', 'particles/moth_level', 'particles/moth_down',
  ...Array.from({ length: 33 }, (_, i) => `particles/confetti_${String(i).padStart(2, '0')}`),
];

/** Images the DOM uses: preloaded so overlays never pop in. */
const DOM_IMAGES = [
  'posters/standard', 'posters/extra_wick', 'posters/matinee', 'posters/midnight', 'posters/lights_out',
  'fx/intro_light_casts', 'fx/intro_ink_deepens', 'fx/intro_encore', 'fx/rose', 'fx/audience_row', 'fx/final_bow', 'fx/gold_leaf',
  'ui/marquee', 'ui/apron_rail_desktop', 'ui/apron_stage_mobile', 'ui/ticket_stub', 'ui/flame_meter',
];

export const tex: Record<string, Texture> = {};

export function url(path: string): string {
  return `${base}${path}.webp`;
}

export async function loadAll(onProgress: (p: number) => void): Promise<void> {
  const total = PATHS.length + DOM_IMAGES.length;
  let done = 0;
  const bump = () => onProgress(++done / total);
  const dom = DOM_IMAGES.map(
    (p) => new Promise<void>((res) => {
      const img = new Image();
      img.onload = img.onerror = () => { bump(); res(); };
      img.src = url(p);
    }),
  );
  const pixi = PATHS.map(async (p) => {
    tex[p] = await Assets.load<Texture>(url(p));
    bump();
  });
  await Promise.all([...dom, ...pixi]);
}
