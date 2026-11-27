// Datos de diseño: mejoras, taller, zonas y misiones.

export interface UpDef {
  id: string;
  tab: number;
  name: string;
  base: number;
  fmt: (v: number) => string;
}

export const TABS = ['LUZ', 'MURALLA', 'MAREAS', 'ISLA'];

export const DEFS: UpDef[] = [
  { id: 'dmg', tab: 0, name: 'Daño', base: 10, fmt: v => v.toFixed(1) },
  { id: 'spd', tab: 0, name: 'Cadencia', base: 8, fmt: v => v.toFixed(2) + '/s' },
  { id: 'cc', tab: 0, name: 'Crítico', base: 7, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'cf', tab: 0, name: 'Mult. crítico', base: 10, fmt: v => '×' + v.toFixed(2) },
  { id: 'rng', tab: 0, name: 'Alcance', base: 14, fmt: v => Math.round(v) + '' },
  { id: 'chain', tab: 0, name: 'Rebote', base: 16, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'hp', tab: 1, name: 'Integridad', base: 8, fmt: v => Math.round(v) + '' },
  { id: 'rep', tab: 1, name: 'Reparación', base: 9, fmt: v => v.toFixed(1) + '/s' },
  { id: 'arm', tab: 1, name: 'Armadura', base: 10, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'bar', tab: 1, name: 'Barrera', base: 8, fmt: v => Math.round(v) + '' },
  { id: 'thorn', tab: 1, name: 'Espinas', base: 12, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'vamp', tab: 1, name: 'Vida/baja', base: 14, fmt: v => '+' + v.toFixed(1) },
  { id: 'pk', tab: 2, name: 'Perlas/baja', base: 10, fmt: v => '×' + v.toFixed(2) },
  { id: 'pw', tab: 2, name: 'Perlas/oleada', base: 12, fmt: v => '+' + Math.round(v) },
  { id: 'int', tab: 2, name: 'Interés', base: 15, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'ck', tab: 2, name: 'Coral/baja', base: 12, fmt: v => '×' + v.toFixed(2) },
  { id: 'cw', tab: 2, name: 'Coral/oleada', base: 14, fmt: v => '+' + v.toFixed(1) },
  { id: 'fcd', tab: 2, name: 'Destello', base: 12, fmt: v => Math.round(v) + 's' },
  { id: 'tA', tab: 3, name: 'Arponero', base: 60, fmt: v => (v ? Math.round(v) + ' daño' : 'Construir') },
  { id: 'tR', tab: 3, name: 'Lanzarredes', base: 70, fmt: v => (v ? Math.round(v) + ' daño' : 'Construir') },
  { id: 'tN', tab: 3, name: 'Ancla', base: 90, fmt: v => (v ? Math.round(v) + ' daño' : 'Construir') },
];

/** Descripción corta que se muestra al mantener presionada la mejora. */
export const HINTS: Record<string, string> = {
  rng: 'Dispara más lejos',
  chain: 'Probabilidad de que el rayo rebote a otra criatura',
  thorn: 'Devuelve daño a quien golpea el faro',
  vamp: 'Repara el faro con cada baja',
  int: 'Al final de cada oleada ganas un % de tus perlas guardadas',
  fcd: 'Recarga del Destello',
  tA: 'Torreta que lanza arpones pesados a la criatura con más vida',
  tR: 'Lanza redes al grupo más denso: frena y daña',
  tN: 'Golpe en área alrededor de la isla cada pocos segundos',
};

export interface ModDef { id: string; name: string; desc: string; good?: boolean; }
export const MODS: ModDef[] = [
  { id: 'niebla', name: 'NIEBLA', desc: 'Alcance −35%' },
  { id: 'corriente', name: 'CORRIENTE', desc: 'Todos llegan por un lado' },
  { id: 'marea', name: 'MAREA ALTA', desc: '+40% criaturas' },
  { id: 'frenesi', name: 'FRENESÍ', desc: 'Criaturas +30% veloces' },
  { id: 'caparazon', name: 'CAPARAZÓN', desc: 'Criaturas +35% vida' },
  { id: 'tregua', name: 'CALMA', desc: '+60% perlas esta oleada', good: true },
];

/* ---------- Investigación (árbol permanente) ---------- */
export interface PermDef {
  id: string;
  branch: number; // 0 Luz, 1 Muralla, 2 Mareas
  name: string;
  desc: string;
  base: number;
  max: number;
  req?: string;
  big?: boolean; // desbloquea una habilidad
}

export const BRANCHES = ['LUZ', 'MURALLA', 'MAREAS'];

export const PERM: PermDef[] = [
  { id: 'dmg', branch: 0, name: 'Lente pulida', desc: '+10% daño', base: 8, max: 15 },
  { id: 'spd', branch: 0, name: 'Engranaje ligero', desc: '+5% cadencia', base: 10, max: 15 },
  { id: 'pcrit', branch: 0, name: 'Prisma de cuarzo', desc: '+2% crítico', base: 14, max: 10, req: 'dmg' },
  { id: 'twin', branch: 0, name: 'Haz gemelo', desc: '+5% de disparar doble', base: 30, max: 5, req: 'spd' },
  { id: 'turret', branch: 0, name: 'Planos del arponero', desc: 'Empiezas con un Arponero construido', base: 120, max: 1, req: 'pcrit', big: true },
  { id: 'hull', branch: 1, name: 'Muros de piedra', desc: '+10% integridad', base: 8, max: 15 },
  { id: 'prep', branch: 1, name: 'Argamasa', desc: '+0.3 reparación/s', base: 12, max: 10, req: 'hull' },
  { id: 'pbar', branch: 1, name: 'Barrera inicial', desc: '+15 barrera', base: 14, max: 10, req: 'hull' },
  { id: 'flash', branch: 1, name: 'Bobina de destello', desc: '−8% recarga del Destello', base: 12, max: 10, req: 'prep' },
  { id: 'revive', branch: 1, name: 'Segunda llama', desc: 'Una vez por partida, el faro revive al 40%', base: 150, max: 1, req: 'pbar', big: true },
  { id: 'pearl', branch: 2, name: 'Buzo experto', desc: '+10% perlas', base: 9, max: 15 },
  { id: 'coral', branch: 2, name: 'Cazador de coral', desc: '+10% coral', base: 10, max: 15 },
  { id: 'start', branch: 2, name: 'Reservas del faro', desc: '+25 perlas al empezar', base: 7, max: 15 },
  { id: 'interest', branch: 2, name: 'Banquero', desc: '+1% interés por oleada', base: 20, max: 5, req: 'pearl' },
  { id: 'cards', branch: 2, name: 'Cartógrafo', desc: 'Eliges entre 4 cartas en vez de 3', base: 100, max: 1, req: 'start', big: true },
  { id: 'reroll', branch: 2, name: 'Brújula', desc: '+1 re-tirada de cartas por partida', base: 60, max: 3, req: 'cards' },
];

export const permCost = (p: PermDef, lv: number) => Math.ceil(p.base * Math.pow(1.6, lv));

/* ---------- Bendiciones (cartas cada 5 oleadas) ---------- */
export interface Blessing { id: string; name: string; desc: string; icon: string; max: number; }
export const BLESSINGS: Blessing[] = [
  { id: 'fuego', name: 'Rayos ígneos', desc: 'Tus rayos queman: +40% del golpe como daño en 2 s', icon: '🔥', max: 3 },
  { id: 'prisma', name: 'Prisma', desc: '+20% de rebote', icon: '🔷', max: 3 },
  { id: 'doble', name: 'Haz gemelo', desc: '+20% de disparar un rayo extra', icon: '✨', max: 3 },
  { id: 'voraz', name: 'Destello voraz', desc: 'Cada baja recarga 0.25 s el Destello', icon: '⚡', max: 3 },
  { id: 'gigante', name: 'Lente gigante', desc: '+20% de alcance', icon: '🔭', max: 2 },
  { id: 'coral', name: 'Coraza de coral', desc: '+12% de armadura', icon: '🪸', max: 3 },
  { id: 'marea', name: 'Marea curativa', desc: 'Al terminar cada oleada, recuperas 20% de vida', icon: '🌊', max: 3 },
  { id: 'escudo', name: 'Escudo vivo', desc: '+30 barrera que se regenera durante la oleada', icon: '🛡️', max: 3 },
  { id: 'avaricia', name: 'Avaricia', desc: '+35% perlas, pero −15% vida máxima', icon: '💰', max: 2 },
  { id: 'verdugo', name: 'Verdugo', desc: 'Las criaturas con menos de 12% de vida mueren al instante', icon: '💀', max: 1 },
  { id: 'torretas', name: 'Taller de campo', desc: 'Torretas +40% de daño', icon: '🔧', max: 3 },
  { id: 'hielo', name: 'Rayos helados', desc: 'Los críticos frenan a la criatura 50%', icon: '❄️', max: 1 },
  { id: 'tormenta', name: 'Hijo de la tormenta', desc: 'Los relámpagos caen más seguido y golpean criaturas', icon: '🌩️', max: 2 },
  { id: 'cofre', name: 'Cofre hundido', desc: 'Recibes un montón de perlas ahora', icon: '🧰', max: 9 },
  { id: 'vampiro', name: 'Sangre de kraken', desc: '+1.5 de vida por cada baja', icon: '🩸', max: 3 },
  { id: 'furia', name: 'Furia del farero', desc: '+20% de cadencia', icon: '🔥', max: 3 },
];

/* ---------- Zonas ---------- */
export type Mech = 'none' | 'ice' | 'lava' | 'dark';
export type Weather = 'rain' | 'snow' | 'ash';
export interface Zone {
  id: string;
  name: string;
  desc: string;
  hp: number;
  dmg: number;
  reward: number;
  boss: string;
  sky0: string;
  sky1: string;
  ring: string; // "r,g,b"
  tint: string;
  minion: string;
  bossTitle: string;
  mech: Mech;
  weather: Weather;
}

export const UNLOCK_WAVE = 15;

export const ZONES: Zone[] = [
  {
    id: 'bahia', name: 'Bahía Tranquila', desc: 'Donde empieza todo.',
    hp: 1, dmg: 1, reward: 1, boss: 'KRAKEN', bossTitle: 'Señor de la Bahía', mech: 'none', weather: 'rain',
    sky0: '#10405a', sky1: '#04101c', ring: '120,200,255', tint: '#4b2377', minion: 'jelly',
  },
  {
    id: 'arrecife', name: 'Arrecife Rojo', desc: 'Criaturas más duras. Coral ×1.8',
    hp: 1.7, dmg: 1.4, reward: 1.8, boss: 'REY CANGREJO', bossTitle: 'Tirano del Arrecife', mech: 'none', weather: 'rain',
    sky0: '#4a1e2e', sky1: '#12060c', ring: '255,160,140', tint: '#8a2a1a', minion: 'crab',
  },
  {
    id: 'helado', name: 'Mar Helado', desc: 'La escarcha congela tu faro. Coral ×2.4',
    hp: 2.2, dmg: 1.6, reward: 2.4, boss: 'SERPIENTE DE HIELO', bossTitle: 'Guardiana del Hielo Eterno', mech: 'ice', weather: 'snow',
    sky0: '#2d5a78', sky1: '#08141f', ring: '200,235,255', tint: '#2f7fa6', minion: 'turtle',
  },
  {
    id: 'volcan', name: 'Volcán Submarino', desc: 'Erupciones que dañan a todos. Coral ×2.8',
    hp: 2.6, dmg: 1.8, reward: 2.8, boss: 'TITÁN DE MAGMA', bossTitle: 'Corazón del Volcán', mech: 'lava', weather: 'ash',
    sky0: '#4a2410', sky1: '#120604', ring: '255,170,90', tint: '#b3401a', minion: 'puffer',
  },
  {
    id: 'abismo', name: 'El Abismo', desc: 'Solo ves lo que alumbra tu faro. Coral ×3.5',
    hp: 3.2, dmg: 2.2, reward: 3.5, boss: 'LEVIATÁN', bossTitle: 'Lo que vive en el fondo', mech: 'dark', weather: 'rain',
    sky0: '#1a1240', sky1: '#03020a', ring: '170,140,255', tint: '#1f6f6a', minion: 'eel',
  },
];

export type MKind = 'kills' | 'wave' | 'boss' | 'buys' | 'crits' | 'runs' | 'flash';

export interface MDef {
  kind: MKind;
  text: (n: number) => string;
  goals: number[];
  rewards: number[];
}

export const MPOOL: MDef[] = [
  { kind: 'kills', text: n => `Hunde ${n} criaturas`, goals: [80, 160, 260], rewards: [8, 14, 22] },
  { kind: 'wave', text: n => `Llega a la oleada ${n}`, goals: [8, 12, 18], rewards: [8, 14, 24] },
  { kind: 'boss', text: n => `Derrota ${n} jefe${n > 1 ? 's' : ''}`, goals: [1, 2], rewards: [12, 22] },
  { kind: 'buys', text: n => `Compra ${n} mejoras`, goals: [30, 60], rewards: [8, 14] },
  { kind: 'crits', text: n => `Asesta ${n} críticos`, goals: [25, 70], rewards: [8, 15] },
  { kind: 'runs', text: n => `Juega ${n} partidas`, goals: [2, 4], rewards: [6, 12] },
  { kind: 'flash', text: n => `Usa el Destello ${n} veces`, goals: [3, 8], rewards: [6, 12] },
];

export const DAILY_BONUS = 25;

/* ---------- Logros ---------- */
export interface LifeStats {
  kills: number; bosses: number; elites: number; puffers: number; crits: number;
  runs: number; cards: number; time: number; bestWave: number; flashes: number;
  dailyDone: number; noScratch10: boolean; allTurrets: boolean;
}
export interface AchDef { id: string; name: string; desc: string; reward: number; prog: (s: LifeStats, x: { research: number; zones: number }) => [number, number]; }
const n = (v: number, goal: number): [number, number] => [Math.min(v, goal), goal];
const b = (v: boolean): [number, number] => [v ? 1 : 0, 1];
export const ACHIEVEMENTS: AchDef[] = [
  { id: 'w5', name: 'Primera noche', desc: 'Llega a la oleada 5', reward: 5, prog: s => n(s.bestWave, 5) },
  { id: 'w20', name: 'Guardián', desc: 'Llega a la oleada 20', reward: 20, prog: s => n(s.bestWave, 20) },
  { id: 'w30', name: 'Leyenda del faro', desc: 'Llega a la oleada 30', reward: 40, prog: s => n(s.bestWave, 30) },
  { id: 'w40', name: 'Inmortal', desc: 'Llega a la oleada 40', reward: 80, prog: s => n(s.bestWave, 40) },
  { id: 'k500', name: 'Cazador', desc: 'Hunde 500 criaturas', reward: 15, prog: s => n(s.kills, 500) },
  { id: 'k5000', name: 'Exterminador', desc: 'Hunde 5000 criaturas', reward: 50, prog: s => n(s.kills, 5000) },
  { id: 'b1', name: 'Matakraken', desc: 'Derrota a tu primer jefe', reward: 10, prog: s => n(s.bosses, 1) },
  { id: 'b10', name: 'Domador de bestias', desc: 'Derrota 10 jefes', reward: 40, prog: s => n(s.bosses, 10) },
  { id: 'el10', name: 'Oro falso', desc: 'Hunde 10 élites', reward: 15, prog: s => n(s.elites, 10) },
  { id: 'puf', name: 'Desactivador', desc: 'Hunde 100 peces globo', reward: 15, prog: s => n(s.puffers, 100) },
  { id: 'crit', name: 'Ojo de halcón', desc: 'Asesta 1000 críticos', reward: 20, prog: s => n(s.crits, 1000) },
  { id: 'cards', name: 'Coleccionista', desc: 'Elige 20 bendiciones', reward: 15, prog: s => n(s.cards, 20) },
  { id: 'tur', name: 'Artillero', desc: 'Construye las 3 torretas en una partida', reward: 15, prog: s => b(s.allTurrets) },
  { id: 'clean', name: 'Sin un rasguño', desc: 'Llega a la oleada 10 sin perder vida', reward: 25, prog: s => b(s.noScratch10) },
  { id: 'runs', name: 'Farero de oficio', desc: 'Juega 25 partidas', reward: 15, prog: s => n(s.runs, 25) },
  { id: 'daily', name: 'Puntual', desc: 'Completa 3 desafíos diarios', reward: 20, prog: s => n(s.dailyDone, 3) },
  { id: 'res', name: 'Investigador', desc: 'Suma 25 niveles de investigación', reward: 20, prog: (_s, x) => n(x.research, 25) },
  { id: 'z3', name: 'Explorador', desc: 'Desbloquea el Mar Helado', reward: 20, prog: (_s, x) => n(x.zones, 3) },
  { id: 'z5', name: 'Hasta el fondo', desc: 'Desbloquea El Abismo', reward: 60, prog: (_s, x) => n(x.zones, 5) },
];
