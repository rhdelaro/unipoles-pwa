// Tiny synthesized sound effects via WebAudio — no audio assets needed.

let ctx: AudioContext | null = null;
let muted = typeof localStorage !== 'undefined' && localStorage.getItem('unipoles-muted') === '1';

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  delay = 0,
  slideTo?: number,
): void {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const isMuted = () => muted;

export function toggleMuted(): boolean {
  muted = !muted;
  try {
    localStorage.setItem('unipoles-muted', muted ? '1' : '0');
  } catch {
    /* ignore */
  }
  return muted;
}

export const playClick = () => tone(440, 0.06, 'sine', 0.1);
export const playPlace = () => {
  tone(523, 0.12, 'sine', 0.22);
  tone(784, 0.14, 'sine', 0.14, 0.05);
};
export const playRemove = () => tone(320, 0.1, 'sine', 0.16, 0, 170);
export const playMark = () => tone(660, 0.05, 'square', 0.06);
export const playError = () => tone(150, 0.18, 'sawtooth', 0.14, 0, 95);
export const playWin = () => {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.24, 'triangle', 0.2, i * 0.1));
};
