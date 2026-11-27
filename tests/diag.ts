import { Game } from '../src/game';
import { ZONES } from '../src/data';
import { fresh } from '../src/save';
const W: Record<string, number> = { dmg: 3, spd: 3, cc: 1, cf: 1, rng: 1, chain: 1, hp: 2, rep: 1, arm: 1, bar: 1, thorn: 1, vamp: 1, pk: 2, pw: 1, int: 1, ck: 1, cw: 1, fcd: 0.5 };
const g = new Game(fresh(), ZONES[0], (e) => { if (e === 'hurt') hurts++; });
let hurts = 0; g.aim = 'peligro'; let lw = -1, steps = 0;
while (!g.over && steps < 60 * 600) {
  g.update(1 / 60); steps++;
  if (steps % 30 === 0) { g.useFlash(); for (let k = 0; k < 8; k++) { const ids = Object.keys(g.lv).filter(id => g.cost(id) <= g.pearls); if (!ids.length) break; g.buy(ids.sort((a, b) => g.cost(a) / W[a] - g.cost(b) / W[b])[0]); } }
  if (g.wave !== lw) { lw = g.wave; console.log('w', g.wave, 't', (steps / 60) | 0, 'hp', g.hp | 0, '/', g.st.hp | 0, 'dmg', g.st.dmg.toFixed(0), 'spd', g.st.spd.toFixed(2), 'pearls', g.pearls, 'hurts', hurts, 'mod', g.mod?.id || '-', 'alive', g.enemies.length); hurts = 0; }
}
console.log('died wave', g.wave, 'enemies', g.enemies.map(e => e.type + ':' + Math.hypot(e.x, e.y).toFixed(0)).join(' '));
