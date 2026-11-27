// Verifica que las perlas cuadren en todo momento:
// perlas = iniciales + ganadas − gastadas, nunca negativas ni con decimales.
// Uso: npm test
import { Game } from '../src/game';
import { ZONES, DEFS } from '../src/data';
import { fresh } from '../src/save';

let fails = 0;
for (let run = 0; run < 12; run++) {
  const save = fresh();
  save.perm = { start: run % 4, pearl: run % 3, cards: run % 2 };
  const g = new Game(save, ZONES[run % ZONES.length]);
  for (let step = 0; step < 60 * 60 * 15 && !g.over; step++) {
    g.update(1 / 60);
    if (g.state === 'cards') {
      if (step % 2) g.reroll();
      g.pickCard(g.cardOpts[0].id);
    }
    if (step % 20 === 0) {
      const id = DEFS[Math.floor(Math.random() * DEFS.length)].id;
      const before = g.pearls, c = g.cost(id), ok = g.buy(id);
      if (ok && g.pearls !== before - c) { fails++; console.log('compra mal descontada', id, before, c, g.pearls); }
      if (!ok && g.pearls !== before) { fails++; console.log('compra fallida cambió perlas', id); }
    }
    const expect = g.pearlsStart + g.pearlsEarned - g.pearlsSpent;
    if (g.pearls !== expect || g.pearls < 0 || !Number.isInteger(g.pearls)) {
      fails++;
      console.log('descuadre', { run, step, pearls: g.pearls, expect });
      break;
    }
  }
  console.log(`partida ${run + 1}: ${ZONES[run % ZONES.length].name}, oleada ${g.wave}, ganadas ${g.pearlsEarned}, gastadas ${g.pearlsSpent}, quedan ${g.pearls}`);
}
console.log(fails ? `FALLÓ (${fails})` : 'OK: las perlas cuadran en todas las partidas');
process.exit(fails ? 1 : 0);
