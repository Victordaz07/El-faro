// Música procedural: acordes de fondo, arpegio y, con un jefe en pantalla, bajo y percusión.
// Todo se genera con Web Audio: no hay pistas con derechos de autor.
import { audioContext } from './audio';

type Level = 0 | 1 | 2; // 0 menú, 1 partida, 2 jefe

// La menor: Am – F – C – G (frecuencias de las fundamentales)
const PROG = [
  [220.0, 261.63, 329.63], // Am
  [174.61, 220.0, 261.63], // F
  [196.0, 261.63, 329.63], // C (inversión)
  [196.0, 246.94, 293.66], // G
];
const BASS = [110, 87.31, 130.81, 98];

let ac: AudioContext | null = null;
let out: GainNode | null = null;
let timer = 0;
let level: Level = 0;
let enabled = true;
let step = 0;
let nextT = 0;

function bpm() { return level === 2 ? 128 : level === 1 ? 96 : 72; }

export function setMusicEnabled(on: boolean) {
  enabled = on;
  if (out && ac) out.gain.setTargetAtTime(on ? 0.32 : 0, ac.currentTime, 0.3);
}

export function setMusicLevel(l: Level) { level = l; }

export function startMusic() {
  ac = audioContext();
  if (!ac || timer) return;
  out = ac.createGain();
  out.gain.value = enabled ? 0.32 : 0;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2600;
  out.connect(lp).connect(ac.destination);
  nextT = ac.currentTime + 0.1;
  timer = window.setInterval(schedule, 60);
}

function note(f: number, t: number, dur: number, type: OscillatorType, vol: number, attack = 0.02) {
  if (!ac || !out) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function kick(t: number) {
  if (!ac || !out) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + 0.25);
}

let hatBuf: AudioBuffer | null = null;
function hat(t: number, vol: number) {
  if (!ac || !out) return;
  if (!hatBuf) {
    hatBuf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
    const d = hatBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = hatBuf;
  f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  s.connect(f).connect(g).connect(out);
  s.start(t); s.stop(t + 0.06);
}

/** Programa notas con un poco de anticipación (8 pasos por compás). */
function schedule() {
  if (!ac || !enabled) { if (ac) nextT = ac.currentTime + 0.1; return; }
  const stepDur = 60 / bpm() / 2;
  while (nextT < ac.currentTime + 0.25) {
    const bar = Math.floor(step / 8) % PROG.length, s = step % 8, ch = PROG[bar];
    // Acordes de fondo al empezar cada compás
    if (s === 0) for (const f of ch) { note(f, nextT, stepDur * 8.5, 'triangle', 0.045, 0.4); note(f * 1.004, nextT, stepDur * 8.5, 'sine', 0.035, 0.6); }
    // Arpegio
    if (level >= 1) {
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      const f = ch[pat[s]] * (s % 4 === 3 ? 2 : 1) * 2;
      note(f, nextT, stepDur * 0.9, level === 2 ? 'sawtooth' : 'square', level === 2 ? 0.018 : 0.014);
    } else if (s === 4) {
      note(ch[2] * 2, nextT, stepDur * 3, 'sine', 0.025, 0.05);
    }
    // Jefe: bajo, bombo y platillos
    if (level === 2) {
      if (s % 2 === 0) note(BASS[bar], nextT, stepDur * 1.6, 'sawtooth', 0.06);
      if (s % 4 === 0) kick(nextT);
      hat(nextT, s % 2 ? 0.05 : 0.025);
    } else if (level === 1 && s === 0) {
      note(BASS[bar], nextT, stepDur * 7, 'sine', 0.07, 0.1);
    }
    nextT += stepDur;
    step++;
  }
}
