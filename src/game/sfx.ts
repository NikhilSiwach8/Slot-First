// Small synthesized sound kit (Web Audio), so the demo has feedback before the real audio
// is recorded. Every sound respects the mute toggle.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.55;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.2, glideTo?: number, delay = 0): void {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + delay / 1000;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + ms / 1000);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + ms / 1000 + 0.05);
}

function noise(ms: number, gain = 0.12, filter = 1800, delay = 0): void {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + delay / 1000;
  const len = Math.floor((a.sampleRate * ms) / 1000);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filter;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  click: () => tone(880, 60, 'triangle', 0.08),
  spin: () => { noise(420, 0.1, 900); tone(140, 260, 'triangle', 0.08, 90); },
  drop: (i: number) => tone(220 + i * 30, 90, 'triangle', 0.07, 160),
  creak: () => { tone(95, 380, 'sawtooth', 0.025, 70); noise(260, 0.05, 400); },
  flame: (level: number) => noise(300 + level * 180, 0.08 + level * 0.05, 700 + level * 300),
  shadow: () => noise(240, 0.05, 2600),
  ink: () => { tone(300, 260, 'sine', 0.08, 180); noise(180, 0.04, 1200); },
  win: (big: boolean) => {
    const notes = big ? [523, 659, 784, 1047] : [659, 784];
    notes.forEach((n, i) => tone(n, 380, 'triangle', 0.12, undefined, i * 90));
  },
  encore: () => { noise(380, 0.12, 500); [392, 523].forEach((n, i) => tone(n, 300, 'square', 0.04, undefined, 120 + i * 110)); },
  ticket: () => { tone(1200, 120, 'square', 0.05); tone(1600, 160, 'square', 0.04, undefined, 90); },
  match: () => { noise(160, 0.2, 3000); tone(220, 500, 'sawtooth', 0.04, 600, 60); },
  fanfare: () => [392, 523, 659, 784, 1047, 1319].forEach((n, i) => tone(n, 520, 'triangle', 0.13, undefined, i * 110)),
  applause: (ms: number) => { for (let i = 0; i < ms / 40; i++) noise(60, 0.05, 1500 + Math.random() * 3000, i * 40); },
};
