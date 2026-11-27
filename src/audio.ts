// Sonidos sintetizados con Web Audio: no hay archivos de audio que licenciar.
let ac: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let noiseBuf: AudioBuffer | null = null;
const lastT: Record<string, number> = {};
const VOL = 0.5;

export function initAudio() {
  if (!ac) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : VOL;
      master.connect(ac.destination);
      ambient();
    } catch { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}

export function audioContext() { return ac; }

export function setMuted(m: boolean) {
  muted = m;
  if (ac && master) master.gain.setTargetAtTime(m ? 0 : VOL, ac.currentTime, 0.05);
}

function gate(k: string, ms: number) {
  const n = performance.now();
  if (n - (lastT[k] || 0) < ms) return false;
  lastT[k] = n;
  return true;
}

function tone(f: number, dur: number, type: OscillatorType, vol: number, f2?: number, delay = 0) {
  if (!ac || !master || muted) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function buf() {
  if (!noiseBuf && ac) {
    const len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf!;
}

function noise(dur: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass', delay = 0) {
  if (!ac || !master || muted) return;
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = buf();
  f.type = type;
  f.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}

/** Lluvia de fondo muy suave. */
function ambient() {
  if (!ac || !master) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = buf();
  s.loop = true;
  f.type = 'bandpass';
  f.frequency.value = 1400;
  f.Q.value = 0.4;
  g.gain.value = 0.045;
  s.connect(f).connect(g).connect(master);
  s.start();
}

export const sfx = {
  shot() { if (gate('shot', 70)) tone(1100 + Math.random() * 200, 0.06, 'square', 0.025, 500); },
  crit() { if (gate('crit', 60)) tone(1500, 0.1, 'sawtooth', 0.05, 2600); },
  kill() { if (gate('kill', 45)) tone(320 + Math.random() * 80, 0.14, 'triangle', 0.12, 120); },
  hurt() { if (gate('hurt', 140)) { noise(0.18, 0.22, 700); tone(120, 0.18, 'sawtooth', 0.07, 60); } },
  buy() { if (gate('buy', 50)) tone(700, 0.07, 'sine', 0.12, 1100); },
  wave() { [523, 659, 784].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, undefined, i * 0.09)); },
  boss() { tone(90, 1.3, 'sawtooth', 0.16, 45); noise(1.1, 0.18, 200); },
  bossdown() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, undefined, i * 0.08)); },
  flash() { tone(300, 0.5, 'sine', 0.2, 1800); noise(0.4, 0.15, 3000, 'highpass'); },
  thunder() { noise(1.7, 0.3, 240, 'lowpass', 0.15); },
  over() { [440, 349, 262].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, undefined, i * 0.22)); },
  coin() { [880, 1320].forEach((f, i) => tone(f, 0.12, 'sine', 0.12, undefined, i * 0.07)); },
  click() { tone(900, 0.04, 'sine', 0.07); },
  zap() { if (gate('zap', 90)) { noise(0.22, 0.22, 3500, 'bandpass'); tone(180, 0.2, 'square', 0.06, 90); tone(1400, 0.08, 'sawtooth', 0.04, 600, 0.02); } },
  charge() { if (gate('charge', 200)) tone(300, 0.45, 'sine', 0.035, 1200); },
  bite() { if (gate('bite', 70)) { noise(0.05, 0.12, 2500, 'highpass'); tone(500, 0.05, 'square', 0.03, 300); } },
  harpoon() { if (gate('harp', 120)) { noise(0.12, 0.12, 1800, 'bandpass'); tone(260, 0.1, 'triangle', 0.06, 140); } },
  net() { noise(0.25, 0.1, 900, 'bandpass'); },
  slam() { if (gate('slam', 200)) { tone(80, 0.3, 'sine', 0.25, 40); noise(0.2, 0.15, 300); } },
  frost() { [1568, 2093, 2637].forEach((f, i) => tone(f, 0.3, 'sine', 0.05, undefined, i * 0.05)); noise(0.6, 0.1, 5000, 'highpass'); },
  warn() { [880, 880].forEach((f, i) => tone(f, 0.08, 'square', 0.05, undefined, i * 0.15)); },
  erupt() { if (gate('erupt', 150)) { noise(0.7, 0.3, 250); tone(60, 0.5, 'sawtooth', 0.12, 30); } },
  revive() { [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, undefined, i * 0.07)); },
  card() { [523, 784].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, undefined, i * 0.08)); },
  ach() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, undefined, i * 0.08)); },
  boom() { if (gate('boom', 80)) { noise(0.5, 0.35, 500); tone(160, 0.4, 'sawtooth', 0.12, 40); } },
  enrage() { tone(70, 1.0, 'sawtooth', 0.2, 140); noise(0.8, 0.2, 400); },
  elite() { if (gate('elite', 400)) [880, 660].forEach((f, i) => tone(f, 0.15, 'square', 0.05, undefined, i * 0.1)); },
};
