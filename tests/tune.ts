// Afinador: busca por cada nivel el multiplicador de perlas iniciales (LEVEL_PEARL_MULT) con el que el bot
// sin investigación gana un porcentaje objetivo en Bahía. Imprime la tabla para pegar en data.ts.
// Uso: npm run sim:tune
import { Game } from '../src/game';
import { ZONES, LEVEL_WAVES, LEVEL_PEARL_MULT } from '../src/data';
import { fresh } from '../src/save';

const W: Record<string, number> = { dmg: 3, spd: 3, cc: 1, cf: 1, rng: 1, chain: 1, tA: 1.5, tR: 1, tN: 1.2, hp: 2, rep: 1, arm: 1, bar: 1, thorn: 1, vamp: 1, pk: 2, pw: 1, int: 1, ck: 1, cw: 1, fcd: 0.5, tap: 0 };
function play(zi: number, n: number, perm: number, smart: boolean) {
  const save = fresh();
  for (const k of ['dmg', 'spd', 'hull', 'flash', 'pearl', 'coral', 'start', 'pcrit', 'prep', 'pbar']) save.perm[k] = perm;
  const g = new Game(save, ZONES[zi], () => {}, () => 260, { level: { zi, n } });
  if (smart) g.aim = 'peligro';
  let steps = 0;
  while (!g.over && steps < 60 * 60 * 20) {
    g.update(1 / 60); steps++;
    if (g.state === 'cards') g.pickCard(g.cardOpts[0].id);
    if (steps % 30 === 0) {
      if (smart) { g.useFlash(); if (g.enemies.length > 4) g.callFleet(); }
      for (let k = 0; k < 10; k++) {
        const ids = Object.keys(g.lv).filter(id => id !== 'tap' && g.isOpen(id) && g.cost(id) <= g.pearls);
        if (!ids.length) break;
        const id = smart ? ids.sort((a, b) => g.cost(a) / (W[a] || 1e-3) - g.cost(b) / (W[b] || 1e-3))[0] : ids[Math.floor(Math.random() * ids.length)];
        g.buy(id);
      }
    }
  }
  return g.won ? 1 : 0;
}
const OBJETIVO = (process.env.OBJ || '1,.95,.85,.7,.6,.55,.5,.45,.4,.12').split(',').map(Number);
const N = +(process.env.N || 60);
const rate = (n: number) => { let w = 0; for (let k = 0; k < N; k++) w += play(0, n, 0, true); return w / N; };
const out: number[] = [];
for (let n = 1; n <= LEVEL_WAVES.length; n++) {
  let lo = 0.1, hi = 6, m = 1, r = 0;
  for (let it = 0; it < 8; it++) {
    m = (lo + hi) / 2; LEVEL_PEARL_MULT[n - 1] = m; r = rate(n);
    if (r < OBJETIVO[n - 1]) lo = m; else hi = m;
  }
  out.push(+m.toFixed(2));
  console.log(`nivel ${n}: mult ${m.toFixed(2)} → gana ${(r * 100).toFixed(0)}% (objetivo ${(OBJETIVO[n - 1] * 100).toFixed(0)}%)`);
}
console.log('LEVEL_PEARL_MULT =', JSON.stringify(out));
