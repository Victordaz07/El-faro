// Bot del Modo Costa: abre huecos, mejora armas y compra mejoras globales.
// Uso: npm run sim:costa   (N=partidas, PERM=nivel de investigación, ARMAS=canon,ballesta,mortero,luz)
import { Game } from '../src/game';
import { ZONES, COSTA, WEAPONS, WeaponId } from '../src/data';
import { fresh } from '../src/save';

const W: Record<string, number> = { dmg: 3, spd: 3, cc: 1, cf: 1, rng: 1, tap: 0.001, hp: 2, rep: 1, arm: 1, bar: 1, thorn: 1, vamp: 1, pk: 2, pw: 1, int: 1, ck: 1, cw: 1, fcd: 1 };
const N = +(process.env.N || 6), PERMS = (process.env.PERM || '0,3').split(',').map(Number);
if (process.env.HP) COSTA.hp = +process.env.HP;
if (process.env.SC) COSTA.slotCost.splice(0, 7, ...process.env.SC.split(',').map(Number));
if (process.env.WC) WEAPONS.forEach((w, i) => (w.cost = +process.env.WC!.split(',')[i]));
const ORDER = ((process.env.ARMAS || 'canon,ballesta,mortero,luz,canon,ballesta,mortero').split(',')) as WeaponId[];

function play(perm: number) {
  const save = fresh();
  for (const k of ['dmg', 'spd', 'hull', 'flash', 'pearl', 'coral', 'start', 'pcrit', 'prep', 'pbar']) save.perm[k] = perm;
  const g = new Game(save, ZONES[0], () => {}, () => 330, { mode: 'costa' });
  g.aim = 'peligro';
  let steps = 0, minHp = 1;
  while (!g.over && steps < 60 * 60 * 25) {
    g.update(1 / 60); steps++;
    minHp = Math.min(minHp, g.hp / g.st.hp);
    if (g.state === 'cards') g.pickCard(g.cardOpts[0].id);
    if (steps % 30 === 0) {
      g.useFlash();
      for (let k = 0; k < 12; k++) {
        let did = false;
        // 1) abrir el siguiente hueco si ya se puede y alcanza
        for (let i = 0; i < g.slots.length && !did; i++) if (g.slotAvail(i) && g.pearls >= g.openCost(i, ORDER[i])) did = g.openSlot(i, ORDER[i]);
        // Si hay un hueco nuevo disponible y todavía no alcanza, se ahorra para él (un jugador atento hace lo mismo)
        const saving = g.slots.some((_, i) => g.slotAvail(i) && g.pearls < g.openCost(i, ORDER[i])) && g.wave < 10;
        if (saving) break;
        // 2) mejorar el hueco de menor nivel
        if (!did) {
          const open = g.slots.map((s, i) => ({ s, i })).filter(o => o.s.open && o.s.lv < COSTA.maxLv).sort((a, b) => a.s.lv - b.s.lv || g.upCost(a.i) - g.upCost(b.i));
          if (open.length && g.pearls >= g.upCost(open[0].i) && (g.slots.every(s => s.open) || g.wave < 1 || open[0].s.lv < 1 + g.wave / 3)) did = g.upSlot(open[0].i);
        }
        // 3) mejoras globales por valor
        if (!did) {
          const ids = Object.keys(g.lv).filter(id => g.isOpen(id) && g.cost(id) <= g.pearls);
          if (ids.length) { g.buy(ids.sort((a, b) => g.cost(a) / (W[a] || 1e-3) - g.cost(b) / (W[b] || 1e-3))[0]); did = true; }
        }
        if (!did) break;
      }
    }
  }
  const open = g.slots.filter(s => s.open).length;
  return { won: g.won, wave: g.wave, hp: Math.round(minHp * 100), open, lv: g.slots.reduce((a, s) => a + s.lv, 0) };
}
void WEAPONS;
for (const perm of PERMS) {
  const r = Array.from({ length: N }, () => play(perm));
  console.log(`costa taller Nv${perm}: gana ${r.filter(x => x.won).length}/${N} · olas ${r.map(x => x.wave).join(',')} · huecos ${r.map(x => x.open).join(',')} · niveles ${r.map(x => x.lv).join(',')} · vida mín ${r.map(x => x.hp).join(',')}%`);
}
