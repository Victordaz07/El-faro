// Prueba de humo: juega cada modo y los niveles clave de la campaña con un bot simple
// y comprueba que nada se rompa: sin errores, sin NaN, sin fugas de entidades,
// con el estado final coherente.
// Uso: npm test (se ejecuta junto con las demás pruebas)
import { Game, Mode } from '../src/game';
import { ZONES, LEVELS_PER_WORLD, DEFS } from '../src/data';
import { fresh } from '../src/save';

let fails = 0;
const bad = (msg: string) => { fails++; console.log('  FALLO:', msg); };
const fin = (...v: number[]) => v.every(Number.isFinite);

function play(name: string, make: () => Game, seconds: number) {
  const g = make();
  g.aim = 'peligro';
  let steps = 0, maxEn = 0, maxFx = 0;
  try {
    while (!g.over && steps < 60 * seconds) {
      g.update(1 / 60); steps++;
      if (g.state === 'cards') g.pickCard(g.cardOpts[0].id);
      if (steps === 30) g.skipPrep();
      if (steps % 30 === 0) {
        g.useFlash();
        for (let k = 0; k < 6; k++) {
          const ids = DEFS.map(d => d.id).filter(id => id !== 'tap' && g.isOpen(id) && g.cost(id) <= g.pearls);
          if (!ids.length) break;
          g.buy(ids[Math.floor(Math.random() * ids.length)]);
        }
      }
      if (steps % 40 === 0) for (const p of g.pickups) { g.tapAt(p.x, p.y); break; }
      if (steps % 10 === 0) {
        if (!fin(g.hp, g.pearls, g.wave)) { bad(`${name}: hp/perlas/oleada no finitos (${g.hp}, ${g.pearls}, ${g.wave})`); break; }
        for (const e of g.enemies) if (!fin(e.x, e.y, e.hp)) { bad(`${name}: criatura ${e.type} con valores no finitos`); steps = 1e9; break; }
        for (const p of g.pickups) if (!fin(p.x, p.y)) { bad(`${name}: objeto ${p.kind} no finito`); steps = 1e9; break; }
        if (g.ship && !fin(g.ship.x, g.ship.y, g.ship.hp)) { bad(`${name}: barco no finito`); steps = 1e9; break; }
        maxEn = Math.max(maxEn, g.enemies.length); maxFx = Math.max(maxFx, g.fx.length);
      }
    }
  } catch (err) { bad(`${name}: error ${(err as Error).stack?.split('\n').slice(0, 3).join(' | ')}`); }
  if (maxEn > 500) bad(`${name}: demasiadas criaturas a la vez (${maxEn})`);
  if (maxFx > 4000) bad(`${name}: demasiados efectos a la vez (${maxFx})`);
  if (g.over && !g.won && g.hp > 0 && g.mode !== 'escolta') bad(`${name}: terminó sin ganar y con vida (${g.hp})`);
  console.log(`  ${name.padEnd(34)} ${g.over ? (g.won ? 'ganó' : 'perdió') : 'sigue'} · ola ${g.wave} · ${(steps / 60).toFixed(0)}s · máx ${maxEn} criaturas, ${maxFx} efectos`);
}

console.log('modos');
for (const mode of ['endless', 'aguante', 'escolta', 'travesia', 'asedio'] as Mode[]) {
  for (let r = 0; r < 2; r++) {
    play(`${mode} #${r + 1}`, () => { const s = fresh(); s.xp = 600 * r; return new Game(s, ZONES[r], () => {}, () => 260, { mode }); }, 240);
  }
}
console.log('campaña (nivel 1, 5 y 10 de cada mundo)');
ZONES.forEach((z, zi) => {
  for (const n of [1, 5, LEVELS_PER_WORLD]) play(`${z.id} nivel ${n}`, () => new Game(fresh(), z, () => {}, () => 260, { level: { zi, n } }), 180);
});
console.log(fails ? `FALLÓ (${fails})` : 'OK: todos los modos y niveles corren sin errores');
process.exit(fails ? 1 : 0);
