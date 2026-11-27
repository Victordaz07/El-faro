// Datos de diseño: mejoras, taller, zonas y misiones. Los textos se escriben en español;
// localize() (al final) los traduce al leerlos según el idioma elegido.
import { localize, L, t } from './i18n';

export interface UpDef {
  id: string;
  tab: number;
  name: string;
  base: number;
  fmt: (v: number) => string;
  /** Oleada en la que aparece en el panel (al principio solo hay unas pocas mejoras). */
  at: number;
}

export const TABS = ['LUZ', 'MURALLA', 'MAREAS', 'ISLA'];

export const DEFS: UpDef[] = [
  { id: 'dmg', tab: 0, name: 'Daño', base: 10, at: 1, fmt: v => v.toFixed(1) },
  { id: 'spd', tab: 0, name: 'Cadencia', base: 8, at: 1, fmt: v => v.toFixed(2) + '/s' },
  { id: 'cc', tab: 0, name: 'Crítico', base: 7, at: 2, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'cf', tab: 0, name: 'Mult. crítico', base: 10, at: 5, fmt: v => '×' + v.toFixed(2) },
  { id: 'rng', tab: 0, name: 'Alcance', base: 14, at: 3, fmt: v => Math.round(v) + '' },
  { id: 'chain', tab: 0, name: 'Rebote', base: 16, at: 7, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'tap', tab: 0, name: 'Toque', base: 9, at: 2, fmt: v => v.toFixed(1) },
  { id: 'hp', tab: 1, name: 'Integridad', base: 8, at: 1, fmt: v => Math.round(v) + '' },
  { id: 'rep', tab: 1, name: 'Reparación', base: 9, at: 2, fmt: v => v.toFixed(1) + '/s' },
  { id: 'arm', tab: 1, name: 'Armadura', base: 10, at: 4, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'bar', tab: 1, name: 'Barrera', base: 8, at: 4, fmt: v => Math.round(v) + '' },
  { id: 'thorn', tab: 1, name: 'Espinas', base: 12, at: 9, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'vamp', tab: 1, name: 'Vida/baja', base: 14, at: 7, fmt: v => '+' + v.toFixed(1) },
  { id: 'pk', tab: 2, name: 'Perlas/baja', base: 10, at: 3, fmt: v => '×' + v.toFixed(2) },
  { id: 'pw', tab: 2, name: 'Perlas/oleada', base: 12, at: 3, fmt: v => '+' + Math.round(v) },
  { id: 'int', tab: 2, name: 'Interés', base: 15, at: 10, fmt: v => (v * 100).toFixed(0) + '%' },
  { id: 'ck', tab: 2, name: 'Coral/baja', base: 12, at: 6, fmt: v => '×' + v.toFixed(2) },
  { id: 'cw', tab: 2, name: 'Coral/oleada', base: 14, at: 8, fmt: v => '+' + v.toFixed(1) },
  { id: 'fcd', tab: 2, name: 'Destello', base: 12, at: 5, fmt: v => Math.round(v) + 's' },
  { id: 'tA', tab: 3, name: 'Arponero', base: 60, at: 6, fmt: v => (v ? Math.round(v) + L(' daño', ' dmg') : L('Construir', 'Build')) },
  { id: 'tR', tab: 3, name: 'Lanzarredes', base: 70, at: 8, fmt: v => (v ? Math.round(v) + L(' daño', ' dmg') : L('Construir', 'Build')) },
  { id: 'tN', tab: 3, name: 'Ancla', base: 90, at: 11, fmt: v => (v ? Math.round(v) + L(' daño', ' dmg') : L('Construir', 'Build')) },
];

/** Descripción corta que se muestra al mantener presionada la mejora. */
export const HINTS: Record<string, string> = {
  rng: 'Dispara más lejos',
  tap: 'Daño y recarga de tus toques sobre las criaturas',
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

/* ---------- Campaña: 10 niveles por mundo ---------- */
export const LEVELS_PER_WORLD = 10;
/** Oleadas de cada nivel (el 10 termina con el jefe del mundo). */
export const LEVEL_WAVES = [5, 6, 6, 7, 7, 8, 8, 9, 9, 10];
/** Oleada de dificultad con la que empieza cada nivel (la dificultad sigue la de una partida larga). */
export const LEVEL_START = [1, 2, 4, 6, 8, 10, 12, 14, 17, 20];
/** Perlas que junta un buen jugador hasta el inicio de cada oleada (medido con el bot de la simulación). */
const PEARL_CURVE = [0, 0, 16, 37, 62, 106, 160, 253, 383, 566, 743, 960, 1177, 1570, 1872, 2308, 2949, 3542, 4414, 5254, 6285, 6985];
/** Perlas iniciales de un nivel: una parte de lo que habrías juntado hasta ahí, para no empezar de cero. */
export const levelPearls = (n: number) => Math.round(1.0 * (PEARL_CURVE[LEVEL_START[n - 1]] || 0));
/** Coral por superar un nivel por primera vez (índice global 1-50). */
export const levelClearCoral = (g: number) => 8 + 4 * g;
/** Estrellas según la vida que quede al ganar. */
export const starsFor = (hpRatio: number) => (hpRatio >= 0.7 ? 3 : hpRatio >= 0.35 ? 2 : 1);

/* ---------- Modos de juego ---------- */
/** Reglas de cada modo. unlock = nivel de campaña ('mundo-nivel') que hay que superar para abrirlo. */
export const MODE_RULES = {
  aguante: { unlock: '0-2' },
  escolta: { unlock: '0-4', total: 6, shipHp: 40, speed: 30, dock: 70, unload: 10, gap: 3, aggro: 0.7 },
  travesia: { unlock: '0-6', speed: 16, total: 2600 },
  asedio: { unlock: '0-8', waves: 12 },
  endless: { unlock: '0-10' },
};
export interface ModeInfo { id: 'aguante' | 'escolta' | 'travesia' | 'asedio' | 'endless'; icon: string; name: string; desc: string; }
export const MODES: ModeInfo[] = [
  { id: 'aguante', icon: '⏳', name: 'Aguante', desc: 'Sin comprar nada: juegas con tu investigación y tu nivel de farero. ¿Cuántas oleadas aguantas?' },
  { id: 'escolta', icon: '⚓', name: 'Escolta', desc: 'Llegan barcos con comida y suministros. Protégelos hasta que descarguen: si hunden uno, pierdes. Gana con 6 entregas.' },
  { id: 'travesia', icon: '⛵', name: 'Travesía', desc: 'Navega hasta una isla lejana. No hay tienda: mejora tu barco tocando barriles, restos y cofres a la deriva.' },
  { id: 'asedio', icon: '🏴', name: 'Asedio pirata', desc: 'Barcos piratas cañonean la bahía y sus botes intentan abordar, junto con monstruos. Resiste 12 oleadas y al capitán.' },
  { id: 'endless', icon: '♾️', name: 'Infinito', desc: 'Oleadas sin fin, con todas las mejoras desde el principio. Llega lo más lejos que puedas.' },
];

/* ---------- Progresión del farero, colección y premios diarios ---------- */
/** Experiencia que pide el nivel lv para pasar al siguiente. */
export const xpNeed = (lv: number) => 80 + 55 * (lv - 1);
/** Experiencia que da una partida. */
export const runXp = (wave: number, kills: number, bosses: number) => wave * 12 + Math.floor(kills / 4) + bosses * 60;
/** Coral al subir al nivel lv. */
export const levelCoral = (lv: number) => 10 + 5 * lv;
/** Nivel y experiencia dentro del nivel a partir de la experiencia total. */
export function levelOf(xp: number) {
  let lv = 1, rest = xp;
  while (rest >= xpNeed(lv)) { rest -= xpNeed(lv); lv++; }
  return { lv, rest, need: xpNeed(lv) };
}

/** Faros: recolorean las franjas rojas del sprite. hue = tono nuevo (grados), sat y lum multiplican. */
export interface SkinDef { id: string; name: string; lv: number; hue: number; sat: number; lum: number; }
export const SKINS: SkinDef[] = [
  { id: 'clasico', name: 'Faro clásico', lv: 1, hue: 0, sat: 1, lum: 1 },
  { id: 'marino', name: 'Faro marino', lv: 2, hue: 212, sat: 1, lum: 1 },
  { id: 'esmeralda', name: 'Faro esmeralda', lv: 4, hue: 150, sat: 0.9, lum: 1 },
  { id: 'nocturno', name: 'Faro nocturno', lv: 6, hue: 220, sat: 0.15, lum: 0.45 },
  { id: 'coral', name: 'Faro coral', lv: 9, hue: 340, sat: 0.85, lum: 1.25 },
  { id: 'aurora', name: 'Faro aurora', lv: 12, hue: 275, sat: 0.95, lum: 1.05 },
  { id: 'solar', name: 'Faro solar', lv: 16, hue: 38, sat: 1, lum: 1.2 },
];
/** Color de la luz del faro (haz, rayos y reflejo en el agua). */
export interface BeamDef { id: string; name: string; lv: number; rgb: string; }
export const BEAMS: BeamDef[] = [
  { id: 'calida', name: 'Luz cálida', lv: 1, rgb: '255,236,160' },
  { id: 'turquesa', name: 'Luz turquesa', lv: 3, rgb: '140,250,230' },
  { id: 'rosa', name: 'Luz de coral', lv: 5, rgb: '255,170,200' },
  { id: 'verde', name: 'Luz de bengala', lv: 7, rgb: '170,255,150' },
  { id: 'violeta', name: 'Luz violeta', lv: 10, rgb: '205,170,255' },
  { id: 'helada', name: 'Luz helada', lv: 14, rgb: '215,240,255' },
];
/** Premio diario: 7 días que se repiten; perder un día no reinicia la racha. */
export const STREAK = [10, 15, 20, 30, 40, 55, 100];
/** Cofre del faro: coral por hora sin jugar, según tu mejor oleada; se llena en 8 horas. */
export const chestRate = (bestWave: number) => 2 + bestWave * 0.25;
export const CHEST_HOURS = 8;

/* ---------- Criaturas nuevas por mundo ---------- */
/** Ficha que se muestra la primera vez que aparece cada criatura especial. */
export interface CreatureInfo { id: string; name: string; desc: string; zone: number; }
export const CREATURES: CreatureInfo[] = [
  { id: 'seahorse', zone: 0, name: 'Caballito sanador', desc: 'Se queda lejos y cura a las criaturas cercanas. Elimínalo primero: tócalo o pon el objetivo en PELIGRO.' },
  { id: 'star', zone: 0, name: 'Estrella de mar', desc: 'Al hundirse se parte en dos estrellas pequeñas.' },
  { id: 'lobster', zone: 1, name: 'Langosta acorazada', desc: 'Su caparazón resiste la luz del faro. Tócala, o usa el Arponero y el Ancla, para romperlo.' },
  { id: 'lionfish', zone: 1, name: 'Pez león', desc: 'Sus púas envenenan el faro: pierde vida durante unos segundos después de cada picadura.' },
  { id: 'narwhal', zone: 2, name: 'Narval', desc: 'Se detiene, apunta y embiste con fuerza. Tócalo mientras apunta para aturdirlo.' },
  { id: 'seal', zone: 2, name: 'Foca', desc: 'Se sumerge y la luz no la alcanza. Tócala bajo el agua para sacarla a la superficie.' },
  { id: 'firefish', zone: 3, name: 'Pez ígneo', desc: 'Lanza bolas de fuego desde lejos. Toca las bolas en el aire para apagarlas.' },
  { id: 'volturtle', zone: 3, name: 'Tortuga volcánica', desc: 'Muy resistente. Al hundirse suelta cuatro cangrejitos de lava.' },
  { id: 'angler', zone: 4, name: 'Rape abisal', desc: 'Su farolillo debilita tu luz: el faro dispara más lento mientras esté cerca.' },
  { id: 'ghost', zone: 4, name: 'Medusa fantasma', desc: 'A ratos se vuelve intangible y la luz la atraviesa. Tus toques sí la alcanzan.' },
  { id: 'pirate', zone: 0, name: 'Barco pirata', desc: 'Se queda lejos y dispara cañonazos en arco. Toca las balas en el aire para desviarlas.' },
  { id: 'raider', zone: 0, name: 'Bote de abordaje', desc: 'Rápido y frágil: rema directo a tu isla. Que no se junten muchos.' },
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
  { kind: 'kills', text: n => L(`Hunde ${n} criaturas`, `Sink ${n} creatures`), goals: [80, 160, 260], rewards: [8, 14, 22] },
  { kind: 'wave', text: n => L(`Llega a la oleada ${n}`, `Reach wave ${n}`), goals: [8, 12, 18], rewards: [8, 14, 24] },
  { kind: 'boss', text: n => L(`Derrota ${n} jefe${n > 1 ? 's' : ''}`, `Defeat ${n} boss${n > 1 ? 'es' : ''}`), goals: [1, 2], rewards: [12, 22] },
  { kind: 'buys', text: n => L(`Compra ${n} mejoras`, `Buy ${n} upgrades`), goals: [30, 60], rewards: [8, 14] },
  { kind: 'crits', text: n => L(`Asesta ${n} críticos`, `Land ${n} crits`), goals: [25, 70], rewards: [8, 15] },
  { kind: 'runs', text: n => L(`Juega ${n} partidas`, `Play ${n} runs`), goals: [2, 4], rewards: [6, 12] },
  { kind: 'flash', text: n => L(`Usa el Destello ${n} veces`, `Use the Flash ${n} times`), goals: [3, 8], rewards: [6, 12] },
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

/* ---------- Traducción: los textos de estas listas se leen en el idioma activo ---------- */
localize(DEFS, ['name']);
localize(MODS, ['name', 'desc']);
localize(PERM, ['name', 'desc']);
localize(BLESSINGS, ['name', 'desc']);
localize(ZONES, ['name', 'desc', 'boss', 'bossTitle']);
localize(ACHIEVEMENTS, ['name', 'desc']);
localize(CREATURES, ['name', 'desc']);
localize(SKINS, ['name']);
localize(BEAMS, ['name']);
localize(MODES, ['name', 'desc']);
for (const k of Object.keys(HINTS)) { const es = HINTS[k]; Object.defineProperty(HINTS, k, { get: () => t(es), enumerable: true }); }
/** Nombre de pestaña / rama en el idioma activo. */
export const tabName = (i: number) => t(TABS[i]);
export const branchName = (i: number) => t(BRANCHES[i]);
