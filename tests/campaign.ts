// Simulación de la campaña: el bot juega cada nivel de cada mundo y se mide cuántas veces gana.
// Uso: npm run sim:camp
import { Game } from '../src/game';
import { ZONES, LEVEL_WAVES } from '../src/data';
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
      if (smart) g.useFlash();
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
const N = +(process.env.N || 4);
// CASOS="0:0,1:3" (mundo:investigación) para correr solo algunos
const CASOS: number[][] = process.env.CASOS ? process.env.CASOS.split(',').map(c => c.split(':').map(Number)) : [[0, 0], [0, 3], [1, 3], [1, 6], [2, 6], [3, 8], [4, 10]];
for (const [zi, perm] of CASOS) {
  const SOLO = process.env.NIVELES ? process.env.NIVELES.split(',').map(Number) : null;
  const row = LEVEL_WAVES.map((_, i) => { if (SOLO && !SOLO.includes(i + 1)) return -1; let w = 0; for (let k = 0; k < N; k++) w += play(zi, i + 1, perm, true); return w; });
  const rnd = [1, 2, 3, 4].map(n => play(zi, n, perm, false));
  console.log(`${ZONES[zi].name.padEnd(16)} taller Nv${String(perm).padEnd(2)} | bot gana (de ${N}): ${row.map((w, i) => (w < 0 ? '' : `${i + 1}:${w}`)).filter(Boolean).join(' ')} | al azar niveles 1-4: ${rnd.join('')}`);
}
