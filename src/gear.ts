/* ---------- Arsenal del farero: equipo que se gana en los modos y ayuda en la campaña ----------
   Cada modo es un "taller" que fabrica un tipo de equipo:
   - Travesía → reliquias (pasivas, se equipan en ranuras; los jefes sueltan una legendaria por mundo)
   - Asedio pirata → herramientas (botones activos junto al Destello: Buque, Andanada, Barril, Red)
   - Escolta → provisiones (de un solo uso: se gastan al empezar una partida)
   - Costa → planos (siempre activos, suben de nivel)
   Lógica pura sin DOM: la usa game.ts (efectos) y main.ts (pantalla y recompensas). */
import { localize } from './i18n';

export type GearKind = 'relic' | 'tool' | 'prov' | 'plan';
export type Rarity = 'comun' | 'rara' | 'epica' | 'legendaria';
/** Bonos que suman las reliquias y los planos (por nivel). */
export type Bonus = Partial<Record<'dmg' | 'spd' | 'hp' | 'cc' | 'rng' | 'pk' | 'fcd' | 'arm' | 'tur' | 'tap' | 'rep', number>>;
export interface GearDef { id: string; kind: GearKind; icon: string; name: string; desc: string; rarity?: Rarity; fx?: Bonus; boss?: number; }

export const GEAR_MAX_LV = 3;
export const RARITY: Record<Rarity, { name: string; col: string; w: number }> = {
  comun: { name: 'Común', col: '#c9d2e0', w: 55 },
  rara: { name: 'Rara', col: '#5fb3ff', w: 30 },
  epica: { name: 'Épica', col: '#c084fc', w: 15 },
  legendaria: { name: 'Legendaria', col: '#ffb35c', w: 0 },
};
localize(Object.values(RARITY), ['name']);

export const GEAR: GearDef[] = [
  // Reliquias de la Travesía (el efecto se multiplica por el nivel 1-3)
  { id: 'brujula', kind: 'relic', rarity: 'comun', icon: '🧭', name: 'Brújula de coral', desc: '+8% perlas por nivel', fx: { pk: 0.08 } },
  { id: 'caracola', kind: 'relic', rarity: 'comun', icon: '🐚', name: 'Caracola del viento', desc: '+4% cadencia por nivel', fx: { spd: 0.04 } },
  { id: 'ancla', kind: 'relic', rarity: 'comun', icon: '⚓', name: 'Ancla de piedra', desc: '+8% vida por nivel', fx: { hp: 0.08 } },
  { id: 'lente', kind: 'relic', rarity: 'rara', icon: '🔍', name: 'Lente del naufragio', desc: '+6% daño por nivel', fx: { dmg: 0.06 } },
  { id: 'farol', kind: 'relic', rarity: 'rara', icon: '🏮', name: 'Farol de reserva', desc: '−8% recarga del Destello por nivel', fx: { fcd: 0.08 } },
  { id: 'perla', kind: 'relic', rarity: 'rara', icon: '⚫', name: 'Perla negra', desc: '+2% crítico por nivel', fx: { cc: 0.02 } },
  { id: 'nacar', kind: 'relic', rarity: 'epica', icon: '🦪', name: 'Coraza de nácar', desc: '+4% armadura y +0.3 reparación/s por nivel', fx: { arm: 0.04, rep: 0.3 } },
  { id: 'timon', kind: 'relic', rarity: 'epica', icon: '☸️', name: 'Timón del capitán', desc: '+5% alcance y +4% daño por nivel', fx: { rng: 0.05, dmg: 0.04 } },
  // Reliquias legendarias: las suelta el jefe de cada mundo (nivel 10)
  { id: 'ojo-kraken', kind: 'relic', rarity: 'legendaria', boss: 0, icon: '👁️', name: 'Ojo del Kraken', desc: '+7% daño y +7% vida por nivel', fx: { dmg: 0.07, hp: 0.07 } },
  { id: 'pinza-rey', kind: 'relic', rarity: 'legendaria', boss: 1, icon: '🦀', name: 'Pinza del Rey Cangrejo', desc: '+5% armadura y +10% daño de torretas por nivel', fx: { arm: 0.05, tur: 0.1 } },
  { id: 'escama-hielo', kind: 'relic', rarity: 'legendaria', boss: 2, icon: '❄️', name: 'Escama de hielo', desc: '+6% cadencia y +3% crítico por nivel', fx: { spd: 0.06, cc: 0.03 } },
  { id: 'nucleo-magma', kind: 'relic', rarity: 'legendaria', boss: 3, icon: '🌋', name: 'Núcleo de magma', desc: '+10% daño por nivel', fx: { dmg: 0.1 } },
  { id: 'perla-abismo', kind: 'relic', rarity: 'legendaria', boss: 4, icon: '🔮', name: 'Perla del abismo', desc: '+6% daño, +6% vida y +4% alcance por nivel', fx: { dmg: 0.06, hp: 0.06, rng: 0.04 } },
  // Herramientas del Asedio (botones; el nivel baja la recarga y sube la fuerza)
  { id: 'buque', kind: 'tool', icon: '⛵', name: 'Buque de guerra', desc: 'Llama al buque: rodea el faro disparando de costado.' },
  { id: 'andanada', kind: 'tool', icon: '💥', name: 'Andanada', desc: 'Toca el mar: seis cañonazos caen en esa zona.' },
  { id: 'barril', kind: 'tool', icon: '🛢️', name: 'Barril explosivo', desc: 'Toca el mar: un barril flota ahí y estalla en un área grande, aturdiendo.' },
  { id: 'red', kind: 'tool', icon: '🕸️', name: 'Red gigante', desc: 'Toca el mar: atrapa a todo lo que cae dentro unos segundos.' },
  // Provisiones de la Escolta (se gasta 1 al empezar una partida con ella equipada)
  { id: 'cofre', kind: 'prov', icon: '🧰', name: 'Cofre de provisiones', desc: 'Empiezas con 30% más de perlas (o +60).' },
  { id: 'sacos', kind: 'prov', icon: '🧱', name: 'Sacos de arena', desc: '+40 de barrera durante toda la partida.' },
  { id: 'llama', kind: 'prov', icon: '🕯️', name: 'Llama de repuesto', desc: 'Si el faro cae, revive una vez al 40%.' },
  { id: 'brea', kind: 'prov', icon: '🪣', name: 'Brea hirviente', desc: 'Las criaturas tienen 12% menos de vida en esta partida.' },
  // Planos de la Costa (siempre activos)
  { id: 'p-canon', kind: 'plan', icon: '💣', name: 'Planos del cañón', desc: '+12% daño de las torretas por nivel', fx: { tur: 0.12 } },
  { id: 'p-ballesta', kind: 'plan', icon: '🏹', name: 'Planos de la ballesta', desc: '+4% cadencia del faro por nivel', fx: { spd: 0.04 } },
  { id: 'p-mortero', kind: 'plan', icon: '🧨', name: 'Planos del mortero', desc: '+15% daño de tus toques por nivel', fx: { tap: 0.15 } },
  { id: 'p-luz', kind: 'plan', icon: '🔦', name: 'Planos de la luz de costa', desc: '+5% alcance del haz por nivel', fx: { rng: 0.05 } },
];
localize(GEAR, ['name', 'desc']);

export const gearDef = (id: string) => GEAR.find(g => g.id === id);
/** Ranuras: reliquias (2, la 3.ª al nivel 10 de farero), herramientas (2) y una provisión. */
export const relicSlots = (farero: number) => (farero >= 10 ? 3 : 2);
export const TOOL_SLOTS = 2;

/** Herramientas: recarga (s) y fuerza por nivel. */
export const TOOLS = {
  buque: { cd: 45, first: 15 },
  andanada: { cd: 28, first: 8, n: 6, R: 30, dmg: 2.2 },
  barril: { cd: 24, first: 8, R: 58, dmg: 6, stun: 1.2, fuse: 1.3 },
  red: { cd: 26, first: 8, R: 52, hold: 2.6 },
} as const;
export type ToolId = keyof typeof TOOLS;
export const toolCd = (id: ToolId, lv: number) => TOOLS[id].cd * Math.pow(0.88, Math.max(0, lv - 1));
export const toolPow = (lv: number) => 1 + 0.25 * Math.max(0, lv - 1);

/** Lo que el jugador tiene y lo que lleva puesto. */
export interface GearSave {
  own: Record<string, number>; // id → nivel (reliquias, herramientas, planos)
  prov: Record<string, number>; // id → cantidad
  relics: string[]; tools: string[]; use: string | null; // equipo puesto
  seen?: string[]; // equipo ya mostrado como nuevo
}
export const freshGear = (): GearSave => ({ own: {}, prov: {}, relics: [], tools: [], use: null });

/** Lo que la partida recibe: niveles de las reliquias puestas y de todos los planos, herramientas y la provisión. */
export interface Loadout { relics: Record<string, number>; plans: Record<string, number>; tools: Record<string, number>; prov: string | null; }
export const emptyLoadout = (): Loadout => ({ relics: {}, plans: {}, tools: {}, prov: null });

export function loadoutOf(gs: GearSave | undefined, farero: number): Loadout {
  const L = emptyLoadout();
  if (!gs) return L;
  for (const id of gs.relics.slice(0, relicSlots(farero))) if (gs.own[id]) L.relics[id] = gs.own[id];
  for (const g of GEAR) if (g.kind === 'plan' && gs.own[g.id]) L.plans[g.id] = gs.own[g.id];
  for (const id of gs.tools.slice(0, TOOL_SLOTS)) if (gs.own[id]) L.tools[id] = gs.own[id];
  if (gs.use && (gs.prov[gs.use] || 0) > 0) L.prov = gs.use;
  return L;
}

/** Suma de bonos de reliquias y planos. */
export function gearBonus(L: Loadout): Required<Bonus> {
  const b: Required<Bonus> = { dmg: 0, spd: 0, hp: 0, cc: 0, rng: 0, pk: 0, fcd: 0, arm: 0, tur: 0, tap: 0, rep: 0 };
  const add = (id: string, lv: number) => {
    const d = gearDef(id);
    if (!d?.fx) return;
    for (const k of Object.keys(d.fx) as (keyof Bonus)[]) b[k] += (d.fx[k] || 0) * lv;
  };
  for (const [id, lv] of Object.entries(L.relics)) add(id, lv);
  for (const [id, lv] of Object.entries(L.plans)) add(id, lv);
  return b;
}

/* ---------- Recompensas ---------- */
export interface Drop { id: string; lv: number; isNew: boolean; n?: number; }
/** Da una pieza (o sube su nivel); las provisiones suman cantidad. Devuelve lo que se dio. */
export function grant(gs: GearSave, id: string, n = 1): Drop {
  const d = gearDef(id)!;
  if (d.kind === 'prov') {
    const isNew = !(id in gs.prov);
    gs.prov[id] = (gs.prov[id] || 0) + n;
    if (!gs.use) gs.use = id;
    return { id, lv: 0, isNew, n };
  }
  const isNew = !gs.own[id];
  gs.own[id] = Math.min(GEAR_MAX_LV, (gs.own[id] || 0) + 1);
  // Lo nuevo se equipa solo si hay ranura libre
  if (isNew && d.kind === 'relic' && gs.relics.length < 3) gs.relics.push(id);
  if (isNew && d.kind === 'tool' && gs.tools.length < TOOL_SLOTS) gs.tools.push(id);
  return { id, lv: gs.own[id], isNew };
}
const pickW = <T>(items: T[], w: (x: T) => number, r: () => number) => {
  const tot = items.reduce((s, x) => s + w(x), 0);
  let k = r() * tot;
  for (const x of items) { k -= w(x); if (k <= 0) return x; }
  return items[items.length - 1];
};
/** Una reliquia al azar de la Travesía (prefiere las que no están al máximo). */
export function rollRelic(gs: GearSave, r: () => number = Math.random) {
  const pool = GEAR.filter(g => g.kind === 'relic' && g.rarity !== 'legendaria' && (gs.own[g.id] || 0) < GEAR_MAX_LV);
  if (!pool.length) return null;
  return grant(gs, pickW(pool, g => RARITY[g.rarity!].w, r).id);
}
const TOOL_ORDER: ToolId[] = ['buque', 'andanada', 'barril', 'red'];
/** El Asedio da la siguiente herramienta que falta; si ya están todas, sube una. */
export function rollTool(gs: GearSave, r: () => number = Math.random) {
  const miss = TOOL_ORDER.find(id => !gs.own[id]);
  if (miss) return grant(gs, miss);
  const up = TOOL_ORDER.filter(id => gs.own[id] < GEAR_MAX_LV);
  return up.length ? grant(gs, up[Math.floor(r() * up.length)]) : null;
}
export function rollProv(gs: GearSave, r: () => number = Math.random) {
  const pool = GEAR.filter(g => g.kind === 'prov');
  return grant(gs, pool[Math.floor(r() * pool.length)].id);
}
export function rollPlan(gs: GearSave, r: () => number = Math.random) {
  const pool = GEAR.filter(g => g.kind === 'plan' && (gs.own[g.id] || 0) < GEAR_MAX_LV);
  return pool.length ? grant(gs, pool[Math.floor(r() * pool.length)].id) : null;
}

/** Resultado de una partida, para decidir las recompensas. */
export interface RunResult { mode: string; won: boolean; wave: number; progress?: number; deliveries?: number; chests?: number; boss?: number; firstBoss?: boolean; }
/** Recompensas de equipo según el modo jugado (muta gs). */
export function gearRewards(gs: GearSave, R: RunResult, r: () => number = Math.random): Drop[] {
  const out: Drop[] = [];
  const push = (d: Drop | null) => { if (d) out.push(d); };
  switch (R.mode) {
    case 'travesia': {
      // Una reliquia si llegaste a la mitad, otra al llegar, y otra si juntaste 2+ cofres
      if ((R.progress || 0) >= 0.5 || R.won) push(rollRelic(gs, r));
      if (R.won) push(rollRelic(gs, r));
      if ((R.chests || 0) >= 2) push(rollRelic(gs, r));
      break;
    }
    case 'asedio':
      if (R.won) push(rollTool(gs, r));
      else if (R.wave >= 6 && !gs.own.buque) push(grant(gs, 'buque')); // el primer Buque llega antes
      break;
    case 'escolta': {
      // Una provisión por entrega, y dos más si ganas
      const n = (R.deliveries || 0) + (R.won ? 2 : 0);
      for (let i = 0; i < n; i++) push(rollProv(gs, r));
      break;
    }
    case 'costa': {
      // Un plano cada 5 oleadas aguantadas y otro al ganar
      const n = Math.floor(R.wave / 5) + (R.won ? 1 : 0);
      for (let i = 0; i < n; i++) push(rollPlan(gs, r));
      break;
    }
    case 'campaign':
      if (R.won && R.boss !== undefined) {
        const leg = GEAR.find(g => g.boss === R.boss);
        if (leg && (R.firstBoss || (gs.own[leg.id] || 0) < GEAR_MAX_LV)) push(grant(gs, leg.id));
      }
      break;
  }
  // Agrupa provisiones repetidas
  const merged: Drop[] = [];
  for (const d of out) {
    const m = merged.find(x => x.id === d.id && gearDef(d.id)!.kind === 'prov');
    if (m) m.n = (m.n || 1) + (d.n || 1); else merged.push({ ...d });
  }
  return merged;
}
