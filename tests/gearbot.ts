// Equipo típico para los bots según cuánto han avanzado (0 = nada, 1 = poco, 2 = medio, 3 = mucho).
// GEAR=n lo fuerza; si no, sale del nivel de investigación.
import { Save } from '../src/save';
import { freshGear } from '../src/gear';
import { Game } from '../src/game';
export function botGear(save: Save, perm: number) {
  const n = process.env.GEAR !== undefined ? +process.env.GEAR : perm <= 0 ? 0 : perm <= 2 ? 1 : perm <= 5 ? 2 : 3;
  const gs = freshGear();
  if (n >= 1) { gs.own = { brujula: 1, lente: 1, 'p-canon': 1, buque: 1 }; gs.relics = ['lente', 'brujula']; gs.tools = ['buque']; }
  if (n >= 2) { gs.own = { lente: 2, caracola: 2, ancla: 2, 'p-canon': 2, 'p-ballesta': 1, 'p-luz': 1, buque: 2, andanada: 1 }; gs.relics = ['lente', 'caracola']; gs.tools = ['buque', 'andanada']; }
  if (n >= 3) { gs.own = { lente: 3, timon: 2, 'ojo-kraken': 2, 'p-canon': 3, 'p-ballesta': 2, 'p-luz': 2, 'p-mortero': 2, buque: 3, andanada: 2, barril: 2 }; gs.relics = ['lente', 'ojo-kraken', 'timon']; gs.tools = ['buque', 'andanada']; save.xp = 4000; }
  save.gear = gs;
}
/** El bot usa sus herramientas: el buque si hay varias criaturas; las que apuntan, a la criatura más cercana al faro. */
export function botTools(g: Game) {
  if (g.enemies.length > 4) g.callFleet();
  const near = g.enemies.filter(e => !e.dead).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0];
  if (!near) return;
  for (const id of g.toolList) if (id !== 'buque' && (g.toolCds[id] || 0) <= 0 && g.enemies.length > 3) g.useTool(id, near.x, near.y);
}
