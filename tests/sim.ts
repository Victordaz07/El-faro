// Simulación de balance: un bot juega varias partidas en cada zona.
// Uso: npm run sim
import { Game } from '../src/game';
import { ZONES } from '../src/data';
import { fresh } from '../src/save';

const W: Record<string, number> = { dmg: 3, spd: 3, cc: 1, cf: 1, rng: 1, chain: 1, tA: 1.5, tR: 1, tN: 1.2, hp: 2, rep: 1, arm: 1, bar: 1, thorn: 1, vamp: 1, pk: 2, pw: 1, int: 1, ck: 1, cw: 1, fcd: 0.5, tap: 0 };

function play(zoneIdx: number, permLv: number, smart: boolean, tapper = false) {
  const save = fresh();
  for (const k of ['dmg', 'spd', 'hull', 'flash', 'pearl', 'coral', 'start', 'pcrit', 'prep', 'pbar']) save.perm[k] = permLv;
  const g = new Game(save, ZONES[zoneIdx]);
  if (smart) g.aim = 'peligro';
  let steps = 0;
  while (!g.over && steps < 60 * 60 * 30) {
    g.update(1 / 60);
    steps++;
    if (g.state === 'cards') g.pickCard(g.cardOpts[0].id);
    // Bot que toca: usa una carga cada medio segundo sobre la criatura más peligrosa o la bola de fuego
    if (tapper && steps % 30 === 15) {
      const f = g.fireballs[0];
      if (f) { const p = g.fireballPos(f); g.tapAt(p.x, p.y - p.h); }
      else {
        const T: Record<string, number> = { seahorse: 5, narwhal: 4, lobster: 4, seal: 3, angler: 4, ghost: 3, puffer: 3 };
        const e = g.enemies.filter(x => !x.dead).sort((a, b) => (T[b.type] || 0) - (T[a.type] || 0) || Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0];
        if (e) g.tapAt(e.x, e.y);
      }
    }
    if (steps % 30 === 0) {
      if (smart) { g.useFlash(); if (g.enemies.length > 4) g.callFleet(); }
      for (let k = 0; k < 8; k++) {
        const ids = Object.keys(g.lv).filter(id => g.isOpen(id) && g.cost(id) <= g.pearls);
        if (!ids.length) break;
        const w = (k: string) => (k === 'tap' ? (tapper ? 0.4 : 0) : W[k]);
        const id = smart ? ids.sort((a, b) => g.cost(a) / w(a) - g.cost(b) / w(b))[0] : ids[Math.floor(Math.random() * ids.length)];
        g.buy(id);
      }
    }
  }
  return { elites: g.elites, wave: g.wave, min: +(steps / 3600).toFixed(1), coral: g.earned, kills: g.kills, bosses: g.bosses };
}

for (const [zi, perm] of [[0, 0], [0, 3], [1, 3], [2, 5], [3, 7], [4, 10]]) {
  const smart = [0, 1, 2, 3, 4].map(() => play(zi, perm, true));
  const rnd = play(zi, perm, false);
  const tap = [0, 1, 2].map(() => play(zi, perm, true, true).wave);
  console.log(`${ZONES[zi].name.padEnd(16)} taller Nv${String(perm).padEnd(2)} | bot listo: ${smart.map(r => 'ola ' + r.wave + ' (' + r.min + 'm, +' + r.coral + '◆)').join('  ')} | al azar: ola ${rnd.wave} | tocando: ${tap.join(', ')}`);
}
