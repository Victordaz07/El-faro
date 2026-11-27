// Simulación de balance: un bot juega varias partidas en cada zona.
// Uso: npm run sim
import { Game } from '../src/game';
import { ZONES } from '../src/data';
import { fresh } from '../src/save';

const W: Record<string, number> = { dmg: 3, spd: 3, cc: 1, cf: 1, rng: 1, chain: 1, tA: 1.5, tR: 1, tN: 1.2, hp: 2, rep: 1, arm: 1, bar: 1, thorn: 1, vamp: 1, pk: 2, pw: 1, int: 1, ck: 1, cw: 1, fcd: 0.5 };

function play(zoneIdx: number, permLv: number, smart: boolean) {
  const save = fresh();
  for (const k of ['dmg', 'spd', 'hull', 'flash', 'pearl', 'coral', 'start', 'pcrit', 'prep', 'pbar']) save.perm[k] = permLv;
  const g = new Game(save, ZONES[zoneIdx]);
  if (smart) g.aim = 'peligro';
  let steps = 0;
  while (!g.over && steps < 60 * 60 * 30) {
    g.update(1 / 60);
    steps++;
    if (g.state === 'cards') g.pickCard(g.cardOpts[0].id);
    if (steps % 30 === 0) {
      if (smart) g.useFlash();
      for (let k = 0; k < 8; k++) {
        const ids = Object.keys(g.lv).filter(id => g.cost(id) <= g.pearls);
        if (!ids.length) break;
        const id = smart ? ids.sort((a, b) => g.cost(a) / W[a] - g.cost(b) / W[b])[0] : ids[Math.floor(Math.random() * ids.length)];
        g.buy(id);
      }
    }
  }
  return { elites: g.elites, wave: g.wave, min: +(steps / 3600).toFixed(1), coral: g.earned, kills: g.kills, bosses: g.bosses };
}

for (const [zi, perm] of [[0, 0], [0, 3], [1, 3], [2, 5], [3, 7], [4, 10]]) {
  const smart = [0, 1, 2, 3, 4].map(() => play(zi, perm, true));
  const rnd = play(zi, perm, false);
  console.log(`${ZONES[zi].name.padEnd(16)} taller Nv${String(perm).padEnd(2)} | bot listo: ${smart.map(r => 'ola ' + r.wave + ' (' + r.min + 'm, +' + r.coral + '◆)').join('  ')} | al azar: ola ${rnd.wave}`);
}
