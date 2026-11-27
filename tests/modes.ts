import { botGear, botTools } from './gearbot';
// Simulación de los modos de juego (Aguante, Escolta, Travesía, Asedio).
// Uso: npm run sim:modes
import { Game, Mode } from '../src/game';
import { ZONES } from '../src/data';
import { fresh } from '../src/save';

const W: Record<string, number> = { dmg: 3, spd: 3, cc: 1, cf: 1, rng: 1, chain: 1, tA: 1.5, tR: 1, tN: 1.2, hp: 2, rep: 1, arm: 1, bar: 1, thorn: 1, vamp: 1, pk: 2, pw: 1, int: 1, ck: 1, cw: 1, fcd: 0.5, tap: 0 };
function play(mode: Mode, perm: number, xp: number) {
  const save = fresh();
  save.xp = xp;
  for (const k of ['dmg', 'spd', 'hull', 'flash', 'pearl', 'coral', 'start', 'pcrit', 'prep', 'pbar']) save.perm[k] = perm;
  botGear(save, perm);
  const g = new Game(save, ZONES[0], () => {}, () => 260, { mode });
  g.aim = 'peligro';
  let steps = 0, minShip = 1;
  while (!g.over && steps < 60 * 60 * 20) {
    g.update(1 / 60); steps++;
    if (g.ship && g.ship.phase !== 'gap') minShip = Math.min(minShip, g.ship.hp / g.ship.max);
    if (g.state === 'cards') g.pickCard(g.cardOpts[0].id);
    if (steps % 20 === 0) for (const p of g.pickups) if (Math.abs(p.y) < 220) { g.tapAt(p.x, p.y); break; }
    if (steps % 30 === 0) {
      g.useFlash(); botTools(g);
      for (let k = 0; k < 10; k++) {
        const ids = Object.keys(g.lv).filter(id => id !== 'tap' && g.isOpen(id) && g.cost(id) <= g.pearls);
        if (!ids.length) break;
        g.buy(ids.sort((a, b) => g.cost(a) / (W[a] || 1e-3) - g.cost(b) / (W[b] || 1e-3))[0]);
      }
    }
  }
  return g.mode === 'aguante' ? `ola ${g.wave}` : g.mode === 'escolta' ? `${g.won ? 'GANA' : 'pierde'} (${g.deliveries} entregas, barco mín ${Math.round(minShip * 100)}%, ola ${g.wave})` : g.mode === 'travesia' ? `${g.won ? 'GANA' : 'pierde'} (${Math.floor(g.missionProgress * 100)}%, ${g.found} mejoras)` : `${g.won ? 'GANA' : 'pierde'} (ola ${g.wave})`;
}
const MODOS = (process.env.MODOS || 'aguante,escolta,travesia,asedio').split(',') as Mode[];
const NIV = process.env.NIV ? process.env.NIV.split(',').map(v => v.split(':').map(Number)) : [[0, 300], [3, 1500]];
const RUNS = +(process.env.N || 4);
for (const mode of MODOS) for (const [perm, xp] of NIV) {
  console.log(`${mode.padEnd(9)} taller Nv${perm} xp ${xp}: ${Array.from({ length: RUNS }, () => play(mode as Mode, perm, xp)).join(' | ')}`);
}
