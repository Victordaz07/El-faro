// Lógica pura de una partida (sin DOM): se puede simular en Node.
import { DEFS, MODS, ModDef, Zone, BLESSINGS, Blessing, ZONES, CREATURES, LEVEL_WAVES, LEVEL_START, levelPearls, levelOf, MODE_RULES, COSTA, WEAPONS, WeaponId, costaKind, WEAK, KIND_POOL, CostaKind, DIFFICULTY, FLEET } from './data';
import { localize, t, L } from './i18n';
import type { Save } from './save';

export interface Stats {
  dmg: number; spd: number; cc: number; cf: number; rng: number; chain: number; twin: number;
  hp: number; rep: number; arm: number; bar: number; thorn: number; vamp: number;
  pk: number; pw: number; int: number; ck: number; cw: number; fcd: number;
  tA: number; tR: number; tN: number;
  /** Daño del toque y segundos para recargar una carga. */
  tap: number; tapCd: number;
}
export type EType = 'crab' | 'jelly' | 'mini' | 'sardine' | 'eel' | 'puffer' | 'turtle' | 'hermit' | 'boss'
  | 'seahorse' | 'star' | 'starlet' | 'lobster' | 'lionfish' | 'narwhal' | 'seal' | 'firefish' | 'volturtle' | 'lavacrab' | 'angler' | 'ghost'
  | 'pirate' | 'raider' | 'captain';
export type Aim = 'cerca' | 'peligro' | 'fuerte' | 'debil';
export const AIMS: { id: Aim; name: string }[] = [
  { id: 'cerca', name: 'CERCANO' }, { id: 'peligro', name: 'PELIGRO' },
  { id: 'fuerte', name: 'FUERTE' }, { id: 'debil', name: 'DÉBIL' },
];
localize(AIMS, ['name']);

export interface Enemy {
  id: number; x: number; y: number; type: EType; hp: number; max: number; spd: number; r: number;
  dmg: number; rew: number; stop: number; atkRate: number; atk: number; armor: number;
  dead: boolean; wob: number; stun: number; hitT: number; elite: boolean;
  age: number; summonT: number; enraged: boolean; wakeT: number;
  slowT: number; burn: number; burnT: number;
  /** Carga de la descarga (anguila) y embestida al atacar (resto). */
  chargeT: number; lungeT: number;
  /** Caparazón de la langosta (se rompe antes de dañar la vida). */
  shell: number; shellMax: number;
  /** Reloj de ciclos: buceo de la foca, fase de la medusa fantasma. */
  phase: number;
  /** Foca bajo el agua: la luz no la apunta. */
  under: boolean;
  /** Narval: 0 se acerca, 1 apunta, 2 embiste, 3 ya embistió. */
  mode: number;
  /** Rumbo hacia su objetivo (para dibujarla) y si ataca al barco de suministros. */
  hd: number; toShip: boolean;
}
/** Bola de fuego del pez ígneo: vuela en arco hacia el faro y se puede apagar tocándola. */
export interface Fireball { sx: number; sy: number; tx: number; ty: number; t: number; max: number; d: number; ball?: boolean; toShip?: boolean; gone?: boolean; }
/** Modos de juego. */
export type Mode = 'campaign' | 'endless' | 'aguante' | 'escolta' | 'travesia' | 'asedio' | 'costa';
/** Barco de suministros (Escolta) o barco propio (Travesía). */
export interface Ship { x: number; y: number; hp: number; max: number; phase: 'gap' | 'in' | 'dock' | 'out'; t: number; ang: number; n: number; hitT: number; }
/** Objetos a la deriva en la Travesía. */
export interface Pickup { x: number; y: number; kind: 'barril' | 'restos' | 'cofre'; id: number; }
export interface Bolt {
  x: number; y: number; px: number; py: number; t: Enemy | null; d: number; crit: boolean; bounce: boolean;
  kind: 'light' | 'harpoon' | 'cball' | 'quarrel'; speed: number; gone?: boolean;
  /** Modo Costa: arma y rama que lo disparó (debilidades y especializaciones). */
  w?: WeaponId; br?: number;
  /** Modo Costa: dirección fija (las balas y virotes vuelan en línea recta) y distancia que les queda. */
  vx?: number; vy?: number; left?: number;
  /** Vuela en línea recta aunque no sea de la Costa (balas del buque de guerra). */
  straight?: boolean;
}
/** Hueco de la muralla (Modo Costa): arma, nivel y estado para dibujarla. */
export interface Slot { x: number; open: boolean; w: WeaponId | null; lv: number; cd: number; aim: number; fire: number; on: boolean; tx: number; ty: number; /** Rama elegida en el nivel 4 (0 = ninguna). */ br: number; pulse: number; /** Para no llenar de textos: último aviso de eficaz/resiste. */ say: number; }
/** Bomba de mortero en el aire: cae en (tx, ty) y explota en área. */
export interface Shell { sx: number; sy: number; tx: number; ty: number; t: number; max: number; R: number; d: number; gone?: boolean; /** mortar = mortero, volley = Andanada, bomblet = racimo. */ kind?: 'mortar' | 'volley' | 'bomblet'; burn?: boolean; cluster?: boolean; }
export interface EShot { x: number; y: number; d: number; c: string; gone?: boolean; }
export interface Fx {
  kind: 'p' | 'ring' | 'nova' | 'wake' | 'splash' | 'boom' | 'net' | 'slam' | 'warn' | 'strike' | 'sink'
    | 'zap' | 'bite' | 'sting' | 'bash' | 'netfly' | 'spray' | 'tap' | 'heal' | 'crack' | 'cannon' | 'smoke' | 'chip';
  /** Para 'zap' y 'netfly': punto de destino. */
  tx?: number; ty?: number;
  x: number; y: number; vx: number; vy: number; t: number; max: number; c: string; r?: number;
  /** Para 'sink': tipo de criatura y rumbo, para dibujarla hundiéndose. */
  et?: string; h?: number;
}
export interface Txt { x: number; y: number; s: string; c: string; t: number; max: number; big: boolean; }
export interface Hazard { x: number; y: number; t: number; r: number; }
export type GEvent = 'shot' | 'crit' | 'kill' | 'hurt' | 'wave' | 'boss' | 'bossdown' | 'over' | 'flash' | 'buy'
  | 'thunder' | 'boom' | 'enrage' | 'elite' | 'cards' | 'revive' | 'frostwarn' | 'frost' | 'erupt' | 'harpoon' | 'net' | 'slam'
  | 'zap' | 'charge' | 'bite' | 'combo' | 'reveal' | 'win' | 'delivery' | 'sunk' | 'pickup' | 'cannon' | 'tap' | 'tapmiss' | 'heal' | 'crack' | 'fire' | 'poison' | 'newtype' | 'early' | 'volley' | 'blind' | 'fleet';

interface Proto { hp: number; spd: number; r: number; dmg: number; rew: number; stop: number; atk: number; armor: number; }
const P: Record<EType, Proto> = {
  crab: { hp: 20, spd: 26, r: 10, dmg: 5, rew: 2, stop: 36, atk: 0.9, armor: 0 },
  jelly: { hp: 12, spd: 46, r: 9, dmg: 3.5, rew: 2, stop: 34, atk: 0.8, armor: 0 },
  mini: { hp: 4, spd: 64, r: 5, dmg: 1.5, rew: 1, stop: 32, atk: 0.7, armor: 0 },
  sardine: { hp: 5, spd: 80, r: 5, dmg: 1.2, rew: 1, stop: 32, atk: 0.7, armor: 0 },
  eel: { hp: 14, spd: 36, r: 9, dmg: 6, rew: 4, stop: 150, atk: 2.0, armor: 0 },
  puffer: { hp: 18, spd: 30, r: 11, dmg: 24, rew: 3, stop: 36, atk: 0, armor: 0 },
  turtle: { hp: 60, spd: 16, r: 13, dmg: 9, rew: 6, stop: 40, atk: 1.4, armor: 0 },
  hermit: { hp: 30, spd: 22, r: 11, dmg: 7, rew: 5, stop: 36, atk: 1.0, armor: 4 },
  boss: { hp: 160, spd: 15, r: 32, dmg: 15, rew: 40, stop: 72, atk: 2.2, armor: 0 },
  // Criaturas de cada mundo
  seahorse: { hp: 20, spd: 30, r: 9, dmg: 0, rew: 5, stop: 118, atk: 2.6, armor: 0 },
  star: { hp: 26, spd: 28, r: 10, dmg: 5, rew: 3, stop: 36, atk: 1.0, armor: 0 },
  starlet: { hp: 7, spd: 42, r: 6, dmg: 2, rew: 1, stop: 33, atk: 0.8, armor: 0 },
  lobster: { hp: 36, spd: 20, r: 12, dmg: 8, rew: 6, stop: 38, atk: 1.2, armor: 0 },
  lionfish: { hp: 21, spd: 34, r: 9, dmg: 3, rew: 4, stop: 34, atk: 1.0, armor: 0 },
  narwhal: { hp: 46, spd: 22, r: 12, dmg: 20, rew: 7, stop: 38, atk: 1.3, armor: 0 },
  seal: { hp: 29, spd: 36, r: 10, dmg: 6, rew: 5, stop: 35, atk: 1.0, armor: 0 },
  firefish: { hp: 19, spd: 32, r: 9, dmg: 7, rew: 5, stop: 155, atk: 2.6, armor: 0 },
  volturtle: { hp: 84, spd: 14, r: 14, dmg: 10, rew: 8, stop: 40, atk: 1.5, armor: 0 },
  lavacrab: { hp: 6, spd: 55, r: 6, dmg: 2, rew: 1, stop: 32, atk: 0.8, armor: 0 },
  angler: { hp: 34, spd: 26, r: 11, dmg: 6, rew: 7, stop: 36, atk: 1.2, armor: 0 },
  ghost: { hp: 23, spd: 38, r: 9, dmg: 5, rew: 5, stop: 34, atk: 0.9, armor: 0 },
  // Piratas (Asedio)
  pirate: { hp: 60, spd: 20, r: 16, dmg: 11, rew: 8, stop: 180, atk: 3.4, armor: 0 },
  raider: { hp: 13, spd: 58, r: 8, dmg: 4, rew: 3, stop: 34, atk: 0.9, armor: 0 },
  captain: { hp: 150, spd: 13, r: 26, dmg: 16, rew: 60, stop: 190, atk: 2.4, armor: 0 },
};
// [tipo, oleada mínima, peso, mundo donde aparece]. En su mundo salen a partir de esa oleada;
// en los mundos siguientes salen antes (3 oleadas antes, mínimo la 2) y con algo menos de peso.
const TABLE: [EType, number, number, number][] = [
  ['crab', 1, 10, 0], ['jelly', 1, 7, 0], ['sardine', 6, 3, 0], ['eel', 4, 4, 0],
  ['puffer', 5, 3, 0], ['turtle', 7, 3, 0], ['hermit', 9, 3, 0],
  ['seahorse', 5, 2, 0], ['star', 8, 3, 0],
  ['lobster', 4, 3, 1], ['lionfish', 6, 3, 1],
  ['narwhal', 5, 2.5, 2], ['seal', 4, 3, 2],
  ['firefish', 5, 3, 3], ['volturtle', 7, 2.5, 3],
  ['angler', 5, 2.5, 4], ['ghost', 4, 3, 4],
];
/** Máximo de cargas de toque. */
export const TAP_MAX = 5;
export const COLORS: Record<EType, string> = {
  crab: '#ff7a5c', jelly: '#d28bff', mini: '#e3b3ff', sardine: '#cfe3f2', eel: '#4ade80',
  puffer: '#ffd166', turtle: '#9be15d', hermit: '#e8c39e', boss: '#ffd27a',
  seahorse: '#7ef0c0', star: '#ff9f6b', starlet: '#ffbe8f', lobster: '#e0442e', lionfish: '#ff8c6b',
  narwhal: '#cfe6f5', seal: '#9fb3c4', firefish: '#ff8a3d', volturtle: '#6b5a4e', lavacrab: '#ff7a2e',
  angler: '#5ee7ff', ghost: '#e8e6ff', pirate: '#6b4a2c', raider: '#a0764a', captain: '#3b2a20',
};
export const LAMP_Y = -48;
/** Posición de cada torreta sobre la isla. */
export const TURRET_POS: Record<'tA' | 'tR' | 'tN', { x: number; y: number }> = {
  // Centros de las plataformas de isla-base.glb (mundo × 40, vistas con la cámara de 32°)
  tA: { x: -24, y: -2 }, tR: { x: 24, y: -2 }, tN: { x: 0, y: 5 },
};
const BOSS_ENRAGE = 40;

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nivel de la campaña: mundo (0-4) y número (1-10). Sin nivel = modo infinito. */
export interface GameOpts { seed?: number; daily?: boolean; level?: { zi: number; n: number }; mode?: Mode; }
export interface LevelInfo { zi: number; n: number; start: number; waves: number; boss: boolean; g: number; }

export class Game {
  lv: Record<string, number> = {};
  bl: Record<string, number> = {};
  perm: Record<string, number>;
  st: Stats;
  hp: number;
  shield = 0;
  pearls: number;
  coral = 0;
  wave = 0;
  enemies: Enemy[] = [];
  bolts: Bolt[] = [];
  eshots: EShot[] = [];
  fireballs: Fireball[] = [];
  /** Cargas de toque, recarga, veneno sobre el faro y rapes cerca (luz debilitada). */
  taps = TAP_MAX; tapT = 0; poisonT = 0; poisonDps = 0; dim = 0;
  /** Criaturas especiales vistas en esta partida (para mostrar su ficha una vez). */
  seenRun = new Set<string>();
  /** Redes en el aire: se aplican al caer. */
  nets: { x: number; y: number; R: number; t: number }[] = [];
  fx: Fx[] = [];
  texts: Txt[] = [];
  hazards: Hazard[] = [];
  aim: Aim = 'cerca';
  mod: ModDef | null = null;
  cd = 0; lamp = 0; hurtT = 0; shake = 0; t = 0; over = false;
  state: 'spawn' | 'clear' | 'pause' | 'cards' = 'pause';
  pauseT = 1.0;
  queue: EType[] = [];
  spawnT = 0;
  waveTotal = 1;
  waveDone = 0;
  current = 0;
  flashCd = 4;
  lightning = 0;
  nextLightning = 6;
  bolt: { x: number; y: number }[] = [];
  cardOpts: Blessing[] = [];
  rerolls: number;
  revived = false;
  frostT = 18; frozen = 0; frostWarned = false;
  eruptT = 10;
  tcd = { tA: 0, tR: 2, tN: 1 };
  tAim = { tA: -2.4, tR: -0.7 };
  slamT = 0;
  /** Solo para dibujar: tiempo desde el último disparo de cada torreta. */
  tFire = { tA: 0, tR: 0 };
  // estadísticas de la partida
  tapsUsed = 0;
  /** Combo: bajas seguidas con menos de 1.3 s entre una y otra. */
  combo = 0; comboT = 0; bestCombo = 0;
  kills = 0; crits = 0; buys = 0; bosses = 0; flashes = 0; earned = 0; elites = 0; puffers = 0; cards = 0;
  hpLost10 = 0;
  pearlsEarned = 0;
  pearlsSpent = 0;
  pearlsStart: number;
  seed: number;
  daily: boolean;
  /** Nivel de la campaña que se juega (null = modo infinito). */
  level: LevelInfo | null = null;
  /** Se ganó el nivel o la misión del modo. */
  won = false;
  mode: Mode = 'endless';
  /** Escolta: barco de suministros y entregas. Travesía: distancia recorrida. */
  ship: Ship | null = null;
  deliveries = 0;
  voyage = 0;
  pickups: Pickup[] = [];
  /** Modo Costa: huecos de la muralla y bombas de mortero en el aire. */
  slots: Slot[] = COSTA.slotX.map(x => ({ x, open: false, w: null, lv: 0, cd: 0.4, aim: -Math.PI / 2, fire: 0, on: false, tx: 0, ty: 0, br: 0, pulse: 2, say: 0 }));
  /** Modo Costa: la próxima oleada ya planeada (para el aviso) y por dónde entra cada criatura de la actual. */
  plan: { w: number; q: EType[]; xs: number[]; rng: () => number; theme: CostaKind | null } | null = null;
  costaXs: number[] = [];
  /** Andanada: recarga en segundos. */
  volleyCd = 6;
  /** Buque de guerra aliado: recorrido en U (s = metros recorridos) y cuándo llega el próximo. */
  fleet: { s: number; x: number; y: number; hd: number; cd: number; fire: number; side: number } | null = null;
  fleetAt = -1;
  shells: Shell[] = [];
  pickT = 3;
  /** Mejoras conseguidas en la Travesía (para la pantalla final). */
  found = 0;
  private nid = 1;
  private wr: () => number = Math.random; // azar de la oleada (sembrado)

  constructor(
    public save: Save,
    public zone: Zone,
    public emit: (e: GEvent, d?: number) => void = () => {},
    public spawnR: () => number = () => 260,
    opts: GameOpts = {},
  ) {
    this.daily = !!opts.daily;
    this.seed = opts.seed ?? Math.floor(Math.random() * 1e9);
    this.perm = this.daily ? {} : save.perm;
    DEFS.forEach(d => (this.lv[d.id] = 0));
    BLESSINGS.forEach(b => (this.bl[b.id] = 0));
    if (this.perm.turret) this.lv.tA = 1;
    this.rerolls = this.perm.reroll || 0;
    this.st = this.stats();
    this.hp = this.st.hp;
    this.pearls = 20 + 25 * (this.perm.start || 0);
    this.mode = opts.level ? 'campaign' : opts.mode || 'endless';
    const R0 = MODE_RULES[this.mode as keyof typeof MODE_RULES];
    if (this.mode === 'aguante') {
      // Juegas con lo que ya tienes: mejoras según tu nivel de farero, sin comprar
      const L = levelOf(save.xp || 0).lv, base = Math.min(12, 2 + Math.floor(L * 0.7));
      for (const k of ['dmg', 'spd', 'hp', 'rep', 'cc', 'rng', 'arm', 'bar']) this.lv[k] = base;
      for (const k of ['cf', 'chain', 'vamp', 'thorn', 'fcd']) this.lv[k] = Math.floor(base / 2);
      if (L >= 3) this.lv.tA = 1 + Math.floor(L / 5);
      if (L >= 6) this.lv.tN = 1 + Math.floor(L / 8);
      this.st = this.stats(); this.hp = this.st.hp;
    }
    if (this.mode === 'travesia') { this.lv.dmg = this.lv.spd = this.lv.hp = 2; this.st = this.stats(); this.hp = this.st.hp; }
    if (this.mode === 'costa') { const s0 = this.slots[0]; s0.open = true; s0.w = 'canon'; s0.lv = 1; this.pearls += 15; this.pauseT = 5; this.plan = this.costaPlan(1); }
    if (this.mode === 'escolta') this.ship = { x: 0, y: 0, hp: 0, max: 0, phase: 'gap', t: 4, ang: 0, n: 0, hitT: 0 };
    void R0;
    if (opts.level) {
      const { zi, n } = opts.level;
      this.level = { zi, n, start: LEVEL_START[n - 1], waves: LEVEL_WAVES[n - 1], boss: n === LEVEL_WAVES.length, g: zi * 10 + n };
      this.wave = this.level.start - 1;
      this.pearls += levelPearls(n);
      this.pauseT = this.pearls > 60 ? 6 : 1.2; // tiempo para comprar antes de la primera oleada
    }
    this.pearlsStart = this.pearls;
  }

  stats(lv: Record<string, number> = this.lv): Stats {
    const Q = (k: string) => this.perm[k] || 0, B = this.bl;
    const a = lv.arm * 0.04;
    const dmg = (12 + 3.5 * lv.dmg) * (1 + 0.1 * Q('dmg'));
    const tm = 1 + 0.4 * B.torretas;
    const turret = (l: number, k: number) => (l > 0 ? dmg * k * (1 + 0.35 * (l - 1)) * tm : 0);
    return {
      dmg,
      spd: (1.2 + 0.1 * lv.spd) * (1 + 0.05 * Q('spd')) * (1 + 0.2 * B.furia),
      cc: Math.min(0.75, 0.02 + 0.02 * lv.cc + 0.02 * Q('pcrit')),
      cf: 1.5 + 0.12 * lv.cf,
      rng: Math.min(340, 200 + 12 * lv.rng) * (1 + 0.2 * B.gigante),
      chain: Math.min(0.8, 0.07 * lv.chain + 0.2 * B.prisma),
      twin: Math.min(0.7, 0.05 * Q('twin') + 0.2 * B.doble),
      hp: (120 + 16 * lv.hp) * (1 + 0.1 * Q('hull')) * Math.max(0.5, 1 - 0.15 * B.avaricia),
      rep: 0.3 * lv.rep + 0.3 * Q('prep'),
      arm: Math.min(0.75, a / (1 + a) + 0.12 * B.coral),
      bar: 10 * lv.bar + 15 * Q('pbar') + 30 * B.escudo,
      thorn: 0.4 * lv.thorn,
      vamp: 0.5 * lv.vamp + 1.5 * B.vampiro,
      pk: (1 + 0.12 * lv.pk) * (1 + 0.1 * Q('pearl')) * (1 + 0.35 * B.avaricia),
      pw: 3 * lv.pw * (1 + 0.1 * Q('pearl')),
      int: Math.min(0.25, 0.02 * lv.int + 0.01 * Q('interest')),
      ck: (1 + 0.15 * lv.ck) * (1 + 0.1 * Q('coral')),
      cw: 0.3 * lv.cw * (1 + 0.1 * Q('coral')),
      fcd: 25 * Math.pow(0.92, Q('flash')) * Math.max(0.5, 1 - 0.06 * lv.fcd),
      tA: turret(lv.tA, 1.1), tR: turret(lv.tR, 0.35), tN: turret(lv.tN, 0.7),
      tap: dmg * (0.8 + 0.25 * (lv.tap || 0)),
      tapCd: Math.max(0.35, 0.75 - 0.04 * (lv.tap || 0)),
    };
  }

  private refresh() {
    const old = this.st.hp;
    this.st = this.stats();
    if (this.st.hp > old) this.hp += this.st.hp - old;
    this.hp = Math.min(this.hp, this.st.hp);
  }

  get flashMax() { return this.st.fcd; }
  get range() {
    return this.st.rng * (this.mod?.id === 'niebla' ? 0.65 : 1) * (this.zone.mech === 'dark' ? 0.85 : 1);
  }

  cost(id: string) {
    const d = DEFS.find(x => x.id === id)!;
    return Math.ceil(d.base * Math.pow(d.tab === 3 ? 1.6 : 1.3, this.lv[id]));
  }

  preview(id: string) { return this.stats({ ...this.lv, [id]: this.lv[id] + 1 }); }

  /** La mejora ya apareció en el panel (por oleada, o porque ya tiene nivel). */
  isOpen(id: string) {
    const d = DEFS.find(x => x.id === id);
    if (!d) return false;
    // En la campaña aparecen más mejoras a medida que se pasan niveles; en Aguante y Travesía no se compra
    if (this.mode === 'aguante' || this.mode === 'travesia') return false;
    if (this.mode === 'costa') return !['tA', 'tR', 'tN', 'chain'].includes(id);
    if (this.mode === 'escolta' || this.mode === 'asedio') return true;
    return !this.level || d.at <= this.level.g || this.lv[id] > 0;
  }
  /** Oleada dentro del nivel (1..waves) o la oleada normal en el modo infinito. */
  get shownWave() { return this.level ? Math.max(1, this.wave - this.level.start + 1) : this.wave; }
  get lastWave() { return this.level ? this.level.start + this.level.waves - 1 : this.mode === 'asedio' ? MODE_RULES.asedio.waves : this.mode === 'costa' ? MODE_RULES.costa.waves : Infinity; }
  /** Total de oleadas mostrado en la barra (0 = sin final). */
  get totalWaves() { return this.level ? this.level.waves : this.mode === 'asedio' ? MODE_RULES.asedio.waves : this.mode === 'costa' ? MODE_RULES.costa.waves : 0; }
  /** Empieza ya la primera oleada (botón LISTO en la preparación). */
  skipPrep() { if (this.state === 'pause' && this.pauseT > 0.3) this.pauseT = 0.3; }

  buy(id: string) {
    if (this.over || this.state === 'cards' || !this.isOpen(id)) return false;
    const c = this.cost(id);
    if (!this.pay(c)) return false;
    this.lv[id]++;
    this.refresh();
    this.flashCd = Math.min(this.flashCd, this.st.fcd);
    this.buys++;
    this.emit('buy');
    return true;
  }

  /** Las perlas solo salen por aquí (mejoras y huecos). */
  private pay(c: number) {
    if (this.pearls < c) return false;
    this.pearls -= c;
    this.pearlsSpent += c;
    return true;
  }

  /* ---------- Modo Costa: huecos y armas ---------- */
  /** El hueco ya se puede abrir (por oleada) y sigue vacío. */
  slotAvail(i: number) { return this.mode === 'costa' && !this.slots[i].open && this.wave >= COSTA.slotWave[i]; }
  openCost(i: number, w: WeaponId) { return COSTA.slotCost[i] + WEAPONS.find(x => x.id === w)!.cost; }
  upCost(i: number) {
    const s = this.slots[i], w = WEAPONS.find(x => x.id === s.w);
    return w && s.lv < COSTA.maxLv ? Math.ceil(w.up * Math.pow(1.5, s.lv - 1)) : Infinity;
  }
  openSlot(i: number, w: WeaponId) {
    if (this.over || !this.slotAvail(i) || !this.pay(this.openCost(i, w))) return false;
    const s = this.slots[i];
    s.open = true; s.w = w; s.lv = 1; s.cd = 0.4;
    this.buys++;
    this.fx.push({ kind: 'ring', x: s.x, y: COSTA.gunY, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#ffe9a8' });
    this.emit('buy');
    return true;
  }
  /** El siguiente nivel pide elegir rama (del 3 al 4). */
  needsBranch(i: number) { const s = this.slots[i]; return s.open && s.lv === 3 && !s.br; }
  upSlot(i: number, br?: 1 | 2) {
    const s = this.slots[i];
    if (this.over || !s.open || s.lv >= COSTA.maxLv) return false;
    if (this.needsBranch(i) && !br) return false;
    if (!this.pay(this.upCost(i))) return false;
    if (this.needsBranch(i)) s.br = br!;
    s.lv++;
    this.buys++;
    this.fx.push({ kind: 'ring', x: s.x, y: COSTA.gunY, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#ffe9a8' });
    this.emit('buy');
    return true;
  }
  /** Números de un arma según su nivel y las mejoras globales (Daño, Cadencia y Alcance). */
  weaponStat(w: WeaponId, lv: number, br = 0) {
    const st = this.st, L1 = lv - 1, sm = st.spd / 1.2, rm = st.rng / 200;
    let o: { dmg: number; rate: number; range: number; R: number; n: number };
    switch (w) {
      case 'canon': o = { dmg: st.dmg * 2.1 * (1 + 0.5 * L1), rate: 0.5 * sm * (1 + 0.04 * L1), range: 270 * rm, R: 0, n: 1 }; break;
      case 'ballesta': o = { dmg: st.dmg * 0.55 * (1 + 0.4 * L1), rate: 1.6 * sm * (1 + 0.04 * L1), range: 300 * rm, R: 0, n: lv >= 3 ? 2 : 1 }; break;
      case 'mortero': o = { dmg: st.dmg * 2.6 * (1 + 0.5 * L1), rate: 0.28 * sm * (1 + 0.04 * L1), range: 290 * rm, R: 40 + 4 * lv, n: 1 }; break;
      default: o = { dmg: st.dmg * 1.3 * (1 + 0.4 * L1), rate: 1, range: 230 * rm, R: 30 + 3 * lv, n: 1 + Math.floor(lv / 2) };
    }
    // Especializaciones del nivel 4
    if (w === 'canon' && br === 1) { o.dmg *= 1.9; o.rate *= 0.7; o.R = 26; }
    if (w === 'canon' && br === 2) { o.dmg *= 0.55; o.n = 3; }
    if (w === 'ballesta' && br === 1) { o.dmg *= 2.3; o.rate *= 0.55; }
    if (w === 'ballesta' && br === 2) { o.dmg *= 0.7; o.rate *= 1.6; o.n += 1; }
    if (w === 'luz' && br === 2) { o.dmg *= 2; o.R *= 0.8; }
    return o;
  }
  /** Multiplicador de un arma contra una criatura (la Escorpión no sufre contra blindados). */
  weakMul(w: WeaponId, br: number, e: Enemy) {
    const k = costaKind(e.type);
    if (w === 'ballesta' && br === 1 && k === 'armor') return 1.1;
    return WEAK[w][k];
  }
  /** Daño de un arma de la Costa, con aviso de "eficaz" o "resiste" y números de daño. */
  private hitW(e: Enemy, d: number, w: WeaponId, br: number, crit: boolean, show = true) {
    const m = this.weakMul(w, br, e), dealt = this.damage(e, d * m, w === 'ballesta' && br === 1, w === 'luz' ? 'area' : 'turret');
    if (show && dealt > 0.5) {
      const big = crit || m > 1.2;
      this.text(e.x + (Math.random() - 0.5) * 10, e.y - 12, Math.round(dealt) + (crit ? '!' : ''), m > 1.2 ? '#ffe27a' : m < 0.8 ? '#9aa3b2' : '#e6fbff', big, big ? 0.7 : 0.45);
    }
    const sl = this.slots.find(s => s.w === w);
    if (sl && this.t - sl.say > 3 && (m > 1.2 || m < 0.6) && !e.dead) {
      sl.say = this.t;
      this.text(e.x, e.y - 26, m > 1.2 ? t('¡EFICAZ!') : t('RESISTE'), m > 1.2 ? '#ffe27a' : '#9aa3b2', true, 0.9);
    }
    return dealt;
  }

  /* ---------- Modo Costa: oleadas planeadas, adelantar y Andanada ---------- */
  /** Planea la oleada w de la Costa (lo que viene y por dónde entra) con su propia semilla. */
  private costaPlan(w: number) {
    const kw = this.wave, kr = this.wr;
    this.wave = w; this.wr = mulberry(this.seed + w * 7919 + 13);
    const n = Math.floor(5 + w * 1.5), q: EType[] = [];
    // Desde la oleada 3, cada oleada trae mayoría de una clase: obliga a tener armas variadas
    const kinds: CostaKind[] = ['armor', 'fast', 'swarm'];
    const theme: CostaKind | null = w >= 3 && w !== this.lastWave ? kinds[(w + Math.floor(this.wr() * 3)) % 3] : null;
    const one = (): EType => {
      if (theme && this.wr() < 0.7) { const pool = KIND_POOL[theme].filter(ty => ty !== 'pirate' || w >= 2); return pool[Math.floor(this.wr() * pool.length)] as EType; }
      return this.pick();
    };
    if (w === this.lastWave) { q.push('boss'); for (let i = 0; i < Math.floor(n / 3); i++) q.push(one()); }
    else for (let i = 0; i < n; i++) q.push(one());
    if (w === 8) q.push('captain');
    const xs = q.map(() => (this.wr() * 2 - 1) * (COSTA.half + 25));
    const rng = this.wr;
    this.wave = kw; this.wr = kr;
    return { w, q, xs, rng, theme };
  }
  /** Lo que trae la próxima oleada, por clase (para el aviso entre oleadas). */
  get costaPreview() {
    if (this.mode !== 'costa' || !this.plan || this.state !== 'pause') return null;
    const c = { armor: 0, fast: 0, swarm: 0 } as Record<'armor' | 'fast' | 'swarm', number>;
    for (const ty of this.plan.q) c[costaKind(ty)] += ty === 'sardine' ? 4 : 1;
    return { w: this.plan.w, c, theme: this.plan.theme, boss: this.plan.q.includes('boss') || this.plan.q.includes('captain') };
  }
  /** Por dónde van a salir las próximas criaturas (flechas arriba de la pantalla). */
  get costaArrows(): { x: number; k: 'armor' | 'fast' | 'swarm' }[] {
    if (this.mode !== 'costa') return [];
    if (this.state === 'pause' && this.plan) return this.plan.xs.slice(0, 4).map((x, i) => ({ x, k: costaKind(this.plan!.q[i]) }));
    if (this.state === 'spawn') return this.costaXs.slice(0, 3).map((x, i) => ({ x, k: costaKind(this.queue[i]) }));
    return [];
  }
  /** Perlas que da adelantar la oleada ahora. */
  get earlyBonus() { return this.mode === 'costa' && this.state === 'pause' && this.wave >= 1 ? Math.ceil(Math.max(0, this.pauseT - 0.3) * COSTA.early * (1 + this.wave * 0.15)) : 0; }
  /** ¡Que vengan!: empieza la oleada ya y paga por el tiempo que no se usó. */
  callEarly() {
    if (this.mode !== 'costa' || this.state !== 'pause' || this.over || this.pauseT <= 0.3) return 0;
    const b = this.earlyBonus;
    if (b > 0) { this.gain(b); this.text(0, -95, '+' + b + L(' perlas por valentía', ' pearls for bravery'), '#ffe27a', true, 1.2); }
    this.pauseT = 0;
    this.emit('early');
    return b;
  }
  /** Andanada: todas las armas (menos las luces) disparan a la vez al punto tocado. */
  volley(x: number, y: number) {
    if (this.mode !== 'costa' || this.over || this.volleyCd > 0) return false;
    const guns = this.slots.filter(s => s.open && s.w && s.w !== 'luz');
    if (!guns.length) return false;
    guns.forEach((s, i) => {
      const W = this.weaponStat(s.w!, s.lv, s.br), d = W.dmg * W.n * COSTA.volleyDmg * (s.w === 'ballesta' ? 1.3 : 1);
      const jx = (Math.random() - 0.5) * 36, jy = (Math.random() - 0.5) * 22;
      const fly = 0.55 + Math.hypot(x - s.x, y) / 900;
      this.shells.push({ sx: s.x, sy: COSTA.gunY, tx: x + jx, ty: y + jy, t: -i * 0.09, max: fly, R: 34, d, kind: 'volley' });
      s.fire = 0.22; s.aim = Math.atan2(y - COSTA.gunY, x - s.x);
      this.fx.push({ kind: 'cannon', x: s.x, y: COSTA.gunY, vx: 0, vy: 0, t: 0.35, max: 0.35, c: '', r: 14, h: s.aim });
    });
    this.volleyCd = COSTA.volleyCd;
    this.shake = Math.max(this.shake, 0.12);
    this.emit('volley');
    return true;
  }

  get allTurrets() { return this.lv.tA > 0 && this.lv.tR > 0 && this.lv.tN > 0; }

  cycleAim() {
    const i = AIMS.findIndex(a => a.id === this.aim);
    this.aim = AIMS[(i + 1) % AIMS.length].id;
  }

  /* ---------- Cartas ---------- */
  private dealCards() {
    const r = mulberry(this.seed * 7 + this.wave * 13 + (this.perm.reroll || 0) * 0 + this.rerollCount * 101);
    const n = this.perm.cards ? 4 : 3;
    const pool = BLESSINGS.filter(b => this.bl[b.id] < b.max);
    const out: Blessing[] = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    this.cardOpts = out;
  }
  private rerollCount = 0;

  reroll() {
    if (this.state !== 'cards' || this.rerolls <= 0) return false;
    this.rerolls--;
    this.rerollCount++;
    this.dealCards();
    return true;
  }

  pickCard(id: string) {
    if (this.state !== 'cards') return;
    const b = BLESSINGS.find(x => x.id === id);
    if (!b) return;
    this.bl[id]++;
    this.cards++;
    if (id === 'cofre') {
      const p = 40 + this.wave * 14;
      this.gain(p);
      this.text(0, -95, '+' + p + L(' perlas', ' pearls'), '#8fe9ff', true, 1.4);
    }
    this.refresh();
    if (id === 'escudo') this.shield = this.st.bar;
    this.cardOpts = [];
    this.state = 'pause';
    this.pauseT = 0.8;
  }

  useFlash() {
    if (this.over || this.flashCd > 0 || this.state === 'cards') return false;
    this.flashCd = this.st.fcd;
    this.flashes++;
    this.frozen = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x, e.y);
      if (d > 240) continue;
      this.damage(e, this.st.dmg * 4 * (e.type === 'boss' ? 0.4 : 1), true, 'area');
      if (e.type === 'seal') e.under = false;
      e.stun = e.type === 'boss' ? 0.6 : 1.6;
      if (d > 1 && e.type !== 'boss') { if (this.mode === 'costa') e.y -= 28; else { e.x += (e.x / d) * 28; e.y += (e.y / d) * 28; } }
    }
    this.fx.push({ kind: 'nova', x: 0, y: 0, vx: 0, vy: 0, t: 0.6, max: 0.6, c: '#fff3b0' });
    this.shake = Math.max(this.shake, 0.18);
    this.emit('flash');
    return true;
  }

  /** Posición de una bola de fuego (en el aire describe un arco). */
  fireballPos(f: Fireball) {
    const k = f.t / f.max;
    return { x: f.sx + (f.tx - f.sx) * k, y: f.sy + (f.ty - f.sy) * k, h: Math.sin(k * Math.PI) * 55 };
  }

  /** El jugador toca el mar en (x, y): apaga bolas de fuego o golpea a la criatura más cercana. */
  tapAt(x: number, y: number): 'hit' | 'ball' | 'miss' | 'empty' | 'pickup' {
    if (this.over || this.state === 'cards') return 'miss';
    for (const p of this.pickups) {
      if ((p.x - x) ** 2 + (p.y - y) ** 2 < 26 * 26) { this.collect(p); return 'pickup'; }
    }
    for (const f of this.fireballs) {
      const p = this.fireballPos(f);
      if ((p.x - x) ** 2 + (p.y - p.h - y) ** 2 < 22 * 22) {
        f.gone = true;
        this.burst(p.x, p.y - p.h, '#ffb35c', 10, 90);
        this.text(p.x, p.y - p.h - 8, f.ball ? t('¡DESVIADO!') : t('¡APAGADA!'), '#ffd2a0', false, 0.7);
        this.emit('tap');
        return 'ball';
      }
    }
    let best: Enemy | null = null, bd = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < e.r + (e.type === 'boss' ? 8 : 16) && d < bd) { bd = d; best = e; }
    }
    if (!best) {
      this.fx.push({ kind: 'tap', x, y, vx: 0, vy: 0, t: 0.3, max: 0.3, c: 'rgba(220,240,255,.5)', r: 6 });
      this.emit('tapmiss');
      return 'miss';
    }
    if (this.taps < 1) {
      this.fx.push({ kind: 'tap', x, y, vx: 0, vy: 0, t: 0.3, max: 0.3, c: 'rgba(255,120,120,.6)', r: 6 });
      this.emit('tapmiss');
      return 'empty';
    }
    this.taps -= 1;
    this.tapsUsed++;
    const e = best;
    if (e.type === 'narwhal' && e.mode === 1) {
      e.mode = 0; e.chargeT = 0; e.stun = 1.6;
      this.text(e.x, e.y - 16, t('¡ATURDIDO!'), '#fff3b0', true, 0.8);
    }
    if (e.type === 'seal' && e.under) { e.under = false; e.phase = 2.2; e.stun = Math.max(e.stun, 0.8); }
    const dealt = this.damage(e, this.st.tap, true, 'tap');
    this.fx.push({ kind: 'tap', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.35, max: 0.35, c: '#ffffff', r: e.r });
    this.burst(e.x, e.y, '#e6fbff', 5, 70);
    if (dealt > 0 && !e.dead) this.text(e.x + 8, e.y - 12, String(Math.round(dealt)), '#e6fbff', false, 0.5);
    this.emit('tap');
    return 'hit';
  }

  private gain(n: number) {
    n = Math.max(0, Math.round(n));
    this.pearls += n;
    this.pearlsEarned += n;
  }

  abandon() { if (!this.over) { this.revived = true; this.gameOver(); } }

  /* ---------- Oleadas ---------- */
  private startWave() {
    const w = this.wave, boss = this.level ? this.level.boss && w === this.lastWave : this.mode === 'asedio' || this.mode === 'costa' ? w === this.lastWave : this.mode === 'endless' ? w % 10 === 0 : w % 10 === 0 && this.mode !== 'travesia';
    this.wr = mulberry(this.seed + w * 7919);
    const R = this.wr;
    this.mod = null;
    if (!boss && w >= 6 && (w >= 15 || R() < 0.45)) {
      const pool = MODS.filter(m => (!m.good || R() < 0.35) && (w >= 11 || m.id !== 'marea'));
      this.mod = pool[Math.floor(R() * pool.length)];
    }
    // Cada mundo trae oleadas un poco más grandes
    let n = Math.floor((5 + w * 1.5) * (1 + 0.1 * this.zoneIndex));
    if (this.mod?.id === 'marea') n = Math.floor(n * 1.4);
    const q: EType[] = [];
    if (boss) { q.push(this.mode === 'asedio' ? 'captain' : 'boss'); for (let i = 0; i < Math.floor(n / 3); i++) q.push(this.pick()); }
    else for (let i = 0; i < n; i++) q.push(this.pick());
    if (this.mode === 'costa' && w === 8) q.push('captain');
    this.current = R() * Math.PI * 2;
    if (this.mode === 'costa') {
      // La Costa usa la oleada ya planeada (la misma que mostró el aviso)
      const p = this.plan && this.plan.w === w ? this.plan : this.costaPlan(w);
      q.length = 0; q.push(...p.q);
      this.costaXs = [...p.xs];
      this.plan = w < this.lastWave ? this.costaPlan(w + 1) : null;
      this.wr = p.rng;
    }
    this.queue = q;
    // Buque de guerra aliado cada FLEET.every oleadas (no en la Costa ni en la Travesía, que no tienen faro en el centro)
    if (this.mode !== 'costa' && this.mode !== 'travesia' && this.shownWave >= 2 && this.shownWave % FLEET.every === 0 && !this.fleet) this.fleetAt = this.t + FLEET.delay;
    this.waveTotal = q.reduce((s, t) => s + (t === 'sardine' ? 4 : 1), 0);
    this.waveDone = 0;
    this.spawnT = 0.4;
    this.state = 'spawn';
    this.shield = this.st.bar;
    this.emit(boss ? 'boss' : 'wave', w);
  }

  get zoneIndex() { return Math.max(0, ZONES.findIndex(z => z.id === this.zone.id)); }

  private pick(): EType {
    // Asedio: mitad piratas, mitad monstruos
    if ((this.mode === 'asedio' || this.mode === 'costa') && this.wr() < 0.5) return this.wave >= 2 && this.wr() < 0.4 ? 'pirate' : 'raider';
    const zi = this.zoneIndex;
    const opts: [EType, number][] = [];
    for (const [type, minW, wt, home] of TABLE) {
      if (home > zi) continue;
      const from = home === zi || home === 0 ? minW : Math.max(2, minW - 3);
      if (this.wave >= from) opts.push([type, home === zi && home > 0 ? wt * 1.3 : wt]);
    }
    let r = this.wr() * opts.reduce((s, o) => s + o[1], 0);
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return 'crab';
  }

  private scale() {
    const w = this.wave;
    let hs = Math.pow(1.075, w - 1) * Math.pow(1.065, Math.max(0, w - 10)) * Math.pow(1.03, Math.max(0, w - 20)) * this.zone.hp;
    if (this.mod?.id === 'caparazon') hs *= 1.35;
    // Campaña: tramos cortos sin la pausa de los jefes cada 10 oleadas, un poco más suaves
    if (this.level) {
      hs *= 0.8;
      // Rampa dentro de cada mundo: los niveles intermedios también exigen (el 1 de la Bahía queda igual)
      const n = this.level.n, R = +(globalThis.process?.env?.RAMP ?? 0.04);
      hs *= 1 + R * Math.min(7, n - 1);
      // Los primeros 3 niveles de la Bahía son la entrada al juego: sin la dificultad extra global
      if (this.level.zi === 0 && n <= 3) hs /= DIFFICULTY.hp;
    }
    if (this.mode === 'asedio') hs *= 1.25;
    if (this.mode === 'travesia') hs *= 1.2;
    if (this.mode === 'costa') hs *= 1 + COSTA.hp * Math.pow(Math.min(1, (w - 1) / 14), 2);
    return { hs: hs * DIFFICULTY.hp, ds: Math.pow(1.05, w - 1) * this.zone.dmg * DIFFICULTY.dmg };
  }

  /** Hacia dónde va una criatura: al faro, o al barco de suministros si lo eligió y sigue cerca. */
  goal(e: Enemy) {
    const s = this.ship;
    if (e.toShip && s && this.mode === 'escolta' && (s.phase === 'in' || s.phase === 'dock')) return { x: s.x, y: s.y, ship: true };
    if (this.mode === 'costa') return { x: Math.max(-COSTA.half, Math.min(COSTA.half, e.x)), y: 0, ship: false };
    return { x: 0, y: 0, ship: false };
  }

  private make(type: EType, x: number, y: number, elite = false): Enemy {
    const p = P[type], { hs, ds } = this.scale(), w = this.wave;
    const hpMul = type === 'boss' ? Math.pow(1.15, w) * this.zone.hp * DIFFICULTY.hp : hs;
    const em = elite ? 3 : 1;
    const e: Enemy = {
      id: this.nid++, x, y, type, hp: p.hp * hpMul * em, max: p.hp * hpMul * em,
      spd: p.spd * (this.mod?.id === 'frenesi' ? 1.3 : 1) * (0.92 + Math.random() * 0.16),
      r: p.r * (elite ? 1.3 : 1), dmg: p.dmg * ds * (elite ? 1.5 : 1), rew: p.rew * (elite ? 3 : 1),
      stop: p.stop, atkRate: p.atk, atk: Math.random() * 0.5, armor: p.armor * (1 + w * 0.12),
      dead: false, wob: Math.random() * 6, stun: 0, hitT: 0, elite, age: 0, summonT: 5, enraged: false, wakeT: 0,
      slowT: 0, burn: 0, burnT: 0, chargeT: 0, lungeT: 0,
      shell: 0, shellMax: 0, phase: Math.random() * 3, under: false, mode: 0,
      hd: this.mode === 'costa' ? Math.PI / 2 : Math.atan2(-y, -x), toShip: this.mode === 'escolta' && type !== 'boss' && Math.random() < MODE_RULES.escolta.aggro,
    };
    if (type === 'lobster') e.shell = e.shellMax = e.max * 0.7;
    if (type === 'captain') { e.hp = e.max = p.hp * Math.pow(1.15, w) * this.zone.hp; }
    this.enemies.push(e);
    this.fx.push({ kind: 'splash', x, y, vx: 0, vy: 0, t: 0.45, max: 0.45, c: '#bfe8ff', r: e.r * 0.8 });
    return e;
  }

  private spawn(type: EType) {
    const R = this.spawnR();
    const a = this.mode === 'travesia' ? -Math.PI / 2 + (this.wr() - 0.5) * 2.4
      : this.mod?.id === 'corriente' ? this.current + (this.wr() - 0.5) * 1.4 : this.wr() * Math.PI * 2;
    let x = Math.cos(a) * R, y = Math.sin(a) * R;
    if (this.mode === 'costa') { x = this.costaXs.length ? this.costaXs.shift()! : (this.wr() * 2 - 1) * (COSTA.half + 25); y = -R * 1.1; }
    if (type === 'sardine') {
      for (let i = 0; i < 4; i++) this.make('sardine', x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
      return;
    }
    if (!this.seenRun.has(type) && CREATURES.some(c => c.id === type)) {
      this.seenRun.add(type);
      this.emit('newtype', CREATURES.findIndex(c => c.id === type));
    }
    const elite = type !== 'boss' && this.wave >= 12 && this.wr() < 0.06 + (this.wave - 12) * 0.004;
    if (elite) this.emit('elite');
    this.make(type, x, y, elite);
  }

  private burst(x: number, y: number, c: string, n: number, sp = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random());
      this.fx.push({ kind: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.55, max: 0.55, c });
    }
  }

  private text(x: number, y: number, s: string, c: string, big = false, t = 0.8) {
    this.texts.push({ x, y, s, c, t, max: t, big });
  }

  /** La foca bajo el agua y la medusa fantasma intangible no se pueden apuntar. */
  hidden(e: Enemy) { return (e.type === 'seal' && e.under) || this.phased(e); }
  phased(e: Enemy) { return e.type === 'ghost' && e.phase % 3 > 1.8; }

  /** Aplica daño teniendo en cuenta la coraza del ermitaño, el caparazón de la langosta y la fase
   *  de la medusa fantasma. src: luz, torreta, toque o efecto de área. */
  private damage(e: Enemy, d: number, pierce = false, src: 'beam' | 'turret' | 'tap' | 'area' = 'beam') {
    if (e.dead) return 0;
    if (this.phased(e) && src !== 'tap' && src !== 'area') return 0;
    if (e.shell > 0) {
      const k = src === 'beam' ? 0.25 : src === 'tap' ? 2 : 1;
      const used = Math.min(e.shell, d * k);
      e.shell -= used; e.hitT = 0.12;
      d -= used / k;
      if (e.shell <= 0.01) {
        e.shell = 0;
        this.text(e.x, e.y - 16, t('¡CAPARAZÓN ROTO!'), '#ffb08a', true, 0.9);
        this.burst(e.x, e.y, '#e0442e', 14, 120);
        this.fx.push({ kind: 'crack', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.45, max: 0.45, c: '#ffd2c2', r: e.r });
        this.emit('crack');
      }
      if (d <= 0.001) return used;
    }
    const dealt = pierce || !e.armor ? d : Math.max(d * 0.15, d - e.armor);
    e.hp -= dealt;
    e.hitT = 0.12;
    if (this.bl.verdugo && e.type !== 'boss' && e.hp > 0 && e.hp < e.max * 0.12) {
      e.hp = 0;
      this.text(e.x, e.y - 14, '💀', '#fff', false, 0.6);
    }
    if (e.hp <= 0) this.kill(e);
    return dealt;
  }

  private kill(e: Enemy, reward = true) {
    if (e.dead) return;
    e.dead = true;
    this.waveDone++;
    if (!reward) return;
    this.kills++;
    this.combo++; this.comboT = 1.3; this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (this.combo % 10 === 0) {
      // Cada 10 bajas seguidas: perlas extra que crecen con el combo y la oleada
      const bonus = Math.round((1.5 + this.wave * 0.4) * Math.min(5, this.combo / 10));
      this.gain(bonus);
      this.text(0, -110, L(`COMBO ×${this.combo}  +${bonus}`, `COMBO ×${this.combo}  +${bonus}`), '#7ff0e0', true, 1.1);
      this.emit('combo', this.combo);
    }
    if (e.elite) this.elites++;
    if (e.type === 'puffer') this.puffers++;
    let pr = Math.max(1, Math.round(e.rew * this.st.pk * (1 + 0.06 * (this.wave - 1))));
    if (this.mod?.id === 'tregua') pr = Math.round(pr * 1.6);
    this.gain(pr);
    this.coral += 0.03 * e.rew * this.st.ck * this.zone.reward;
    if (this.st.vamp > 0) this.hp = Math.min(this.st.hp, this.hp + this.st.vamp);
    if (this.bl.voraz) this.flashCd = Math.max(0, this.flashCd - 0.25 * this.bl.voraz);
    this.text(e.x, e.y, '+' + pr, '#8fe9ff');
    this.burst(e.x, e.y, COLORS[e.type], e.type === 'boss' ? 46 : e.elite ? 20 : 9, e.type === 'boss' ? 170 : 90);
    this.fx.push({ kind: 'splash', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#bfe8ff', r: e.r });
    if (e.type !== 'boss') this.fx.push({ kind: 'sink', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.55, max: 0.55, c: '', r: e.r, et: e.type, h: e.hd });
    if (e.type === 'star') {
      for (let i = 0; i < 2; i++) { this.make('starlet', e.x + (i ? 9 : -9), e.y + (i ? 4 : -4)); this.waveTotal++; }
    }
    if (e.type === 'volturtle') {
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; this.make('lavacrab', e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12); this.waveTotal++; }
      this.fx.push({ kind: 'boom', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#ff8a3d', r: 34 });
    }
    if (e.type === 'jelly' && this.wave >= 6) {
      for (let i = 0; i < 2; i++) { this.make('mini', e.x + (i ? 8 : -8), e.y); this.waveTotal++; }
    }
    if (e.type === 'boss') {
      this.bosses++;
      this.shake = 0.6;
      this.fx.push({ kind: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.9, max: 0.9, c: '#ffd27a' });
      this.emit('bossdown');
    } else this.emit('kill');
  }

  /** Golpe a lo que la criatura ataca: el faro o el barco. */
  private strike(tg: { ship: boolean }, d: number, attacker?: Enemy) {
    if (tg.ship) this.hurtShip(d); else this.hurt(d, attacker);
  }
  /** Daño al barco de suministros; si se hunde, se pierde la partida. */
  hurtShip(d: number) {
    const s = this.ship;
    if (!s || this.over) return;
    s.hp -= d; s.hitT = 0.15;
    if (s.hp <= 0) {
      s.hp = 0;
      this.fx.push({ kind: 'boom', x: s.x, y: s.y, vx: 0, vy: 0, t: 0.8, max: 0.8, c: '#ff8a3d', r: 50 });
      this.burst(s.x, s.y, '#8a5530', 30, 150);
      this.text(s.x, s.y - 30, t('¡BARCO HUNDIDO!'), '#ff6b6b', true, 1.6);
      this.emit('sunk');
      this.gameOver();
    }
  }

  private hurt(d: number, attacker?: Enemy, quiet = false) {
    d *= 1 - this.st.arm;
    if (this.mode === 'costa' && attacker && !quiet) {
      // Golpe a la muralla: saltan pedacitos de piedra
      const x = Math.max(-COSTA.half, Math.min(COSTA.half, attacker.x));
      for (let i = 0; i < 5; i++) this.fx.push({ kind: 'chip', x: x + (Math.random() - 0.5) * 14, y: -18, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 70, t: 0.7, max: 0.7, c: Math.random() < 0.5 ? '#8a909c' : '#5d6370' });
    }
    if (!quiet && this.shield > 0) { const a = Math.min(this.shield, d); this.shield -= a; d -= a; }
    if (quiet) { this.hp -= d; if (this.wave <= 10) this.hpLost10 += d; }
    else if (d > 0) {
      this.hp -= d;
      if (this.wave <= 10) this.hpLost10 += d;
      this.hurtT = Math.min(0.5, 0.25 + d * 0.01);
      this.shake = Math.min(0.5, this.shake + 0.08 + d * 0.006);
      this.emit('hurt');
    }
    if (attacker && this.st.thorn > 0 && !attacker.dead) {
      this.damage(attacker, this.st.dmg * this.st.thorn, true, 'area');
      this.burst(attacker.x, attacker.y, '#7dd3fc', 3, 50);
    }
    if (this.hp <= 0 && !this.over) {
      if (this.perm.revive && !this.revived) {
        this.revived = true;
        this.hp = this.st.hp * 0.4;
        for (const e of this.enemies) { e.stun = 2; const dd = Math.hypot(e.x, e.y) || 1; if (e.type !== 'boss') { if (this.mode === 'costa') e.y -= 40; else { e.x += (e.x / dd) * 40; e.y += (e.y / dd) * 40; } } }
        this.fx.push({ kind: 'nova', x: 0, y: 0, vx: 0, vy: 0, t: 0.9, max: 0.9, c: '#ffb35c' });
        this.text(0, -100, t('¡SEGUNDA LLAMA!'), '#ffb35c', true, 1.6);
        this.emit('revive');
      } else this.gameOver();
    }
  }

  /** Descarga eléctrica de la anguila: golpea al instante. */
  private zap(e: Enemy, tg = this.goal(e)) {
    const rx = e.x - tg.x, ry = e.y - tg.y, d = Math.hypot(rx, ry) || 1, R = tg.ship ? 12 : 28;
    const tx = tg.x + (rx / d) * R, ty = tg.y + (ry / d) * R - 14;
    this.fx.push({ kind: 'zap', x: e.x, y: e.y, tx, ty, vx: 0, vy: 0, t: 0.28, max: 0.28, c: '#b8ffe0' });
    this.burst(tx, ty, '#b8ffe0', 8, 80);
    this.emit('zap');
    this.strike(tg, e.dmg);
  }

  private landNets(dt: number) {
    for (const n of this.nets) {
      n.t -= dt;
      if (n.t > 0) continue;
      this.fx.push({ kind: 'net', x: n.x, y: n.y, vx: 0, vy: 0, t: 2.5, max: 2.5, c: '#e8d9b0', r: n.R });
      this.fx.push({ kind: 'splash', x: n.x, y: n.y, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#bfe8ff', r: n.R * 0.6 });
      for (const e of this.enemies) {
        if (e.dead || (e.x - n.x) ** 2 + (e.y - n.y) ** 2 > n.R * n.R) continue;
        e.slowT = 2.5 + 0.3 * (this.lv.tR - 1);
        this.damage(e, this.st.tR, true, 'turret');
      }
    }
    this.nets = this.nets.filter(n => n.t > 0);
  }

  private gameOver() {
    this.over = true;
    this.hp = Math.max(0, this.hp);
    this.earned = Math.floor(this.coral + this.wave * 1.5 * this.zone.reward);
    this.emit('over');
  }

  /** Gana la misión (también lo usan Escolta y Travesía). */
  winLevel() {
    this.won = true;
    this.over = true;
    this.earned = Math.floor(this.coral + this.shownWave * 1.5 * this.zone.reward) + (this.mode !== 'campaign' ? 20 : 0);
    this.emit('win');
  }

  /* ---------- Escolta: el barco de suministros llega, descarga y se va ---------- */
  private updateShip(dt: number) {
    const s = this.ship!, M = MODE_RULES.escolta;
    s.hitT = Math.max(0, s.hitT - dt);
    if (s.phase === 'gap') {
      s.t -= dt;
      if (s.t <= 0) {
        s.ang = this.wr() * Math.PI * 2;
        s.x = Math.cos(s.ang) * 340; s.y = Math.sin(s.ang) * 340;
        s.max = s.hp = M.shipHp * (1 + 0.3 * s.n) * Math.pow(1.04, this.wave);
        s.phase = 'in';
        this.emit('delivery', -1);
      }
      return;
    }
    const dx = Math.cos(s.ang) * M.dock, dy = Math.sin(s.ang) * M.dock * 0.8;
    if (s.phase === 'in') {
      const ex = dx - s.x, ey = dy - s.y, d = Math.hypot(ex, ey), v = M.speed * dt;
      if (d <= v) { s.x = dx; s.y = dy; s.phase = 'dock'; s.t = M.unload; }
      else { s.x += (ex / d) * v; s.y += (ey / d) * v; }
      if (Math.random() < dt * 3) this.fx.push({ kind: 'wake', x: s.x, y: s.y, vx: 0, vy: 0, t: 1, max: 1, c: '', r: 14 });
    } else if (s.phase === 'dock') {
      s.t -= dt;
      if (s.t <= 0) {
        // Entrega: perlas, comida (vida) y suministros
        const pr = Math.round(30 + 12 * s.n + this.wave * 3);
        this.gain(pr);
        this.hp = Math.min(this.st.hp, this.hp + this.st.hp * 0.25);
        this.deliveries++;
        this.text(s.x, s.y - 28, L(`¡Entrega! +${pr} perlas`, `Delivered! +${pr} pearls`), '#8fe9ff', true, 1.6);
        this.fx.push({ kind: 'heal', x: 0, y: 0, vx: 0, vy: 0, t: 0.9, max: 0.9, c: '#7ef0c0', r: 70 });
        this.emit('delivery', this.deliveries);
        if (this.deliveries >= M.total) { this.winLevel(); return; }
        s.phase = 'out';
      }
    } else if (s.phase === 'out') {
      const v = M.speed * 1.3 * dt;
      s.x += Math.cos(s.ang) * v; s.y += Math.sin(s.ang) * v;
      if (Math.hypot(s.x, s.y) > 340) { s.phase = 'gap'; s.t = M.gap; s.n++; }
    }
  }

  /* ---------- Travesía: el barco avanza, el mar trae objetos a la deriva ---------- */
  private updateVoyage(dt: number) {
    const M = MODE_RULES.travesia;
    if (this.state === 'cards') return;
    this.voyage += M.speed * dt;
    for (const p of this.pickups) p.y += M.speed * dt;
    this.pickups = this.pickups.filter(p => p.y < 330);
    for (const h of this.hazards) h.y += M.speed * dt;
    this.pickT -= dt;
    if (this.pickT <= 0) {
      this.pickT = 2.4 + this.wr() * 2.4;
      const r = this.wr();
      this.pickups.push({ x: (this.wr() - 0.5) * 300, y: -320, kind: r < 0.6 ? 'barril' : r < 0.85 ? 'restos' : 'cofre', id: this.nid++ });
    }
    if (this.voyage >= M.total) this.winLevel();
  }

  /** Recoge un objeto a la deriva: mejora el barco gratis. */
  private collect(p: Pickup) {
    this.pickups = this.pickups.filter(x => x !== p);
    const pool = ['dmg', 'spd', 'cc', 'rng', 'hp', 'rep', 'arm', 'bar', 'chain', 'cf'];
    const n = p.kind === 'restos' ? 2 : 1;
    const got: string[] = [];
    for (let i = 0; i < n; i++) { const id = pool[Math.floor(Math.random() * pool.length)]; this.lv[id]++; got.push(DEFS.find(d => d.id === id)!.name); }
    if (p.kind === 'cofre') { this.lv.dmg++; got.push(DEFS.find(d => d.id === 'dmg')!.name); }
    this.refresh();
    if (p.kind === 'cofre') this.hp = Math.min(this.st.hp, this.hp + this.st.hp * 0.35);
    this.found += got.length;
    this.text(p.x, p.y - 16, '+ ' + got.join(' · '), '#ffe9a8', true, 1.3);
    this.burst(p.x, p.y, '#ffd27a', 12, 90);
    this.fx.push({ kind: 'splash', x: p.x, y: p.y, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#bfe8ff', r: 14 });
    this.emit('pickup');
  }

  /** Progreso de la misión (0-1) en Escolta y Travesía. */
  get missionProgress() {
    if (this.mode === 'escolta') return this.deliveries / MODE_RULES.escolta.total;
    if (this.mode === 'travesia') return Math.min(1, this.voyage / MODE_RULES.travesia.total);
    return 0;
  }

  get score() { return this.wave * 1000 + this.kills; }

  private threat(e: Enemy) {
    const T: Partial<Record<EType, number>> = { puffer: 60, seahorse: 55, boss: 45, captain: 45, pirate: 40, angler: 42, eel: 35, firefish: 35, narwhal: 30 };
    if (e.toShip && this.ship) return 50 + (T[e.type] || 0);
    return (T[e.type] || 0) + (e.elite ? 25 : 0);
  }

  private target(): Enemy | null {
    const R = this.range;
    let best: Enemy | null = null, bs = -Infinity;
    for (const e of this.enemies) {
      if (e.dead || this.hidden(e)) continue;
      const d = Math.hypot(e.x, e.y);
      if (d > R + e.r) continue;
      const s = this.aim === 'cerca' ? -d
        : this.aim === 'fuerte' ? e.hp
        : this.aim === 'debil' ? -e.hp
        : this.threat(e) + (400 - d) / 8;
      if (s > bs) { bs = s; best = e; }
    }
    return best;
  }

  private nearestTo(x: number, y: number, maxD: number, ...not: (Enemy | undefined)[]) {
    let b: Enemy | null = null, bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead || not.includes(e) || this.hidden(e)) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; b = e; }
    }
    return b;
  }

  private makeLightning(tx: number, ty: number) {
    const pts: { x: number; y: number }[] = [];
    const x = tx + (Math.random() - 0.5) * 200, y = -340;
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      pts.push({ x: x + (tx - x) * k + (Math.random() - 0.5) * 40 * (1 - k), y: y + (ty - y) * k });
    }
    this.bolt = pts;
  }

  /* ---------- Torretas ---------- */
  private turrets(dt: number) {
    const st = this.st;
    // Arponero: al de más vida a su alcance
    if (st.tA > 0) {
      this.tcd.tA -= dt;
      this.tFire.tA = Math.max(0, this.tFire.tA - dt);
      const p = TURRET_POS.tA;
      let best: Enemy | null = null;
      for (const e of this.enemies) if (!e.dead && !this.hidden(e) && Math.hypot(e.x - p.x, e.y - p.y) < 250 && (!best || e.hp + e.shell > best.hp + best.shell)) best = e;
      if (best) {
        this.tAim.tA = Math.atan2(best.y - p.y, best.x - p.x);
        if (this.tcd.tA <= 0) {
          this.tcd.tA = 1 / (0.6 * (1 + 0.08 * (this.lv.tA - 1)));
          this.tFire.tA = 0.3;
          this.bolts.push({ x: p.x, y: p.y, px: p.x, py: p.y, t: best, d: st.tA, crit: false, bounce: true, kind: 'harpoon', speed: 380 });
          this.emit('harpoon');
        }
      }
    }
    // Lanzarredes: al grupo más denso
    if (st.tR > 0) {
      this.tcd.tR -= dt;
      this.tFire.tR = Math.max(0, this.tFire.tR - dt);
      if (this.tcd.tR <= 0) {
        const R = 45 + 5 * (this.lv.tR - 1);
        let best: Enemy | null = null, bn = 0;
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(e.x, e.y) > 230) continue;
          let n = 0;
          for (const o of this.enemies) if (!o.dead && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < R * R) n++;
          if (n > bn) { bn = n; best = e; }
        }
        if (best) {
          this.tcd.tR = Math.max(2.2, 4 - 0.2 * (this.lv.tR - 1));
          const p = TURRET_POS.tR;
          this.tAim.tR = Math.atan2(best.y - p.y, best.x - p.x);
          this.tFire.tR = 0.36;
          const fly = 0.38;
          this.fx.push({ kind: 'netfly', x: p.x, y: p.y - 6, tx: best.x, ty: best.y, vx: 0, vy: 0, t: fly, max: fly, c: '#e8d9b0', r: R });
          this.nets.push({ x: best.x, y: best.y, R, t: fly });
          this.emit('net');
        } else this.tcd.tR = 0.5;
      }
    }
    // Ancla: golpe en área alrededor de la isla
    if (st.tN > 0) {
      this.tcd.tN -= dt;
      this.slamT = Math.max(0, this.slamT - dt);
      const R = 80 + 6 * (this.lv.tN - 1);
      if (this.tcd.tN <= 0 && this.enemies.some(e => !e.dead && Math.hypot(e.x, e.y) < R)) {
        this.tcd.tN = Math.max(1.5, 3 - 0.15 * (this.lv.tN - 1));
        this.slamT = 0.5;
        this.fx.push({ kind: 'slam', x: 0, y: 10, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#c9a46a', r: R });
        for (let i = 0; i < 22; i++) {
          const a = Math.random() * Math.PI * 2, v = 25 + Math.random() * 90, rr = R * (0.6 + Math.random() * 0.4), life = 0.4 + Math.random() * 0.35;
          this.fx.push({ kind: 'spray', x: Math.cos(a) * rr, y: 10 + Math.sin(a) * rr * 0.8, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 40 - Math.random() * 70, t: life, max: life, c: '#d8f0ff' });
        }
        for (const e of this.enemies) if (!e.dead && Math.hypot(e.x, e.y) < R + e.r) this.damage(e, st.tN, true, 'turret');
        this.shake = Math.max(this.shake, 0.1);
        this.emit('slam');
      }
    }
  }

  /* ---------- Modo Costa: los huecos apuntan y disparan solos ---------- */
  /** Mejor objetivo para un arma en (px, py): según el modo de apuntar, o el centro del grupo más denso (mortero). */
  private pickFor(px: number, py: number, R: number, minR = 0, dense = 0): Enemy | null {
    let best: Enemy | null = null, bs = -Infinity;
    for (const e of this.enemies) {
      if (e.dead || this.hidden(e)) continue;
      const d = Math.hypot(e.x - px, e.y - py);
      if (d > R + e.r || d < minR) continue;
      let sc: number;
      if (dense) { sc = 0; for (const o of this.enemies) if (!o.dead && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < dense * dense) sc++; sc -= d / 1000; }
      else sc = this.aim === 'cerca' ? -d : this.aim === 'fuerte' ? e.hp : this.aim === 'debil' ? -e.hp : this.threat(e) + (400 - d) / 8;
      if (sc > bs) { bs = sc; best = e; }
    }
    return best;
  }

  /** Punto del recorrido en U del buque: sube por la derecha, rodea el faro por detrás y baja por la izquierda. */
  fleetPath(s: number) {
    const { leg, R, startY } = FLEET, up = startY, arc = Math.PI * R;
    if (s < up) return { x: leg, y: startY - s, hd: -Math.PI / 2 };
    if (s < up + arc) { const a = (s - up) / R; return { x: Math.cos(a) * R, y: -Math.sin(a) * R, hd: -Math.PI / 2 - a }; }
    const k = s - up - arc;
    return { x: -leg, y: k, hd: Math.PI / 2 };
  }
  get fleetLen() { return FLEET.startY * 2 + Math.PI * FLEET.R; }
  private fleetUpdate(dt: number) {
    if (!this.fleet && this.fleetAt >= 0 && this.t >= this.fleetAt) {
      this.fleetAt = -1;
      const p = this.fleetPath(0);
      this.fleet = { s: 0, x: p.x, y: p.y, hd: p.hd, cd: 1.2, fire: 0, side: 1 };
      this.emit('fleet');
    }
    const f = this.fleet;
    if (!f) return;
    f.s += FLEET.speed * dt;
    if (f.s >= this.fleetLen) { this.fleet = null; return; }
    const p = this.fleetPath(f.s);
    f.x = p.x; f.y = p.y; f.hd = p.hd;
    f.fire = Math.max(0, f.fire - dt);
    f.cd -= dt;
    if (f.cd > 0) return;
    // Andanada de costado: a las criaturas más cercanas dentro del alcance
    const tgs: Enemy[] = [];
    for (let i = 0; i < FLEET.shots; i++) { const e = this.nearestTo(f.x, f.y, FLEET.range, ...tgs); if (e) tgs.push(e); }
    if (!tgs.length) { f.cd = 0.25; return; }
    f.cd = FLEET.cd;
    f.fire = 0.25;
    for (const e of tgs) {
      const a = Math.atan2(e.y - f.y, e.x - f.x);
      f.side = Math.sin(a - f.hd) >= 0 ? 1 : -1;
      const ox = f.x + Math.cos(f.hd + f.side * Math.PI / 2) * 8, oy = f.y + Math.sin(f.hd + f.side * Math.PI / 2) * 8;
      this.bolts.push({ x: ox, y: oy, px: ox, py: oy, t: e, d: this.st.dmg * FLEET.dmg, crit: false, bounce: false, kind: 'cball', speed: 380, straight: true });
      this.fx.push({ kind: 'cannon', x: ox, y: oy, vx: 0, vy: 0, t: 0.35, max: 0.35, c: '', r: 12, h: a });
      this.fx.push({ kind: 'smoke', x: ox + Math.cos(a) * 8, y: oy + Math.sin(a) * 8, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12 - 4, t: 0.9, max: 0.9, c: '', r: 6 });
    }
    this.emit('cannon');
  }

  /** Bala o virote de la Costa: sale apuntando adelantado al objetivo y sigue recto; golpea a la primera criatura que cruza. */
  private costaBolt(b: Bolt, dt: number) {
    if (b.vx === undefined) {
      const e = b.t;
      let tx = e ? e.x : b.x, ty = e ? e.y : b.y - 100;
      if (e && !e.dead) {
        // Apunta adelantado: dónde estará la criatura cuando llegue la bala
        const tt = Math.hypot(tx - b.x, ty - b.y) / b.speed, v = e.stun > 0 ? 0 : e.spd * (e.slowT > 0 ? 0.6 : 1);
        tx += Math.cos(e.hd) * v * tt; ty += Math.sin(e.hd) * v * tt;
      }
      const d = Math.hypot(tx - b.x, ty - b.y) || 1;
      b.vx = (tx - b.x) / d; b.vy = (ty - b.y) / d; b.left = 480;
    }
    b.px = b.x; b.py = b.y;
    const step = b.speed * dt;
    b.x += b.vx! * step; b.y += b.vy! * step; b.left! -= step;
    // ¿Cruzó a alguna criatura en este tramo?
    let hit: Enemy | null = null, best = Infinity;
    for (const e of this.enemies) {
      if (e.dead || this.hidden(e)) continue;
      const ex = e.x - b.px, ey = e.y - b.py, k = Math.max(0, Math.min(step, ex * b.vx! + ey * b.vy!));
      const cx = b.px + b.vx! * k - e.x, cy = b.py + b.vy! * k - e.y, rr = e.r + 5;
      if (cx * cx + cy * cy <= rr * rr && k < best) { best = k; hit = e; }
    }
    if (hit) {
      const e = hit, br = b.br || 0;
      b.gone = true;
      if (b.w) this.hitW(e, b.d, b.w, br, b.crit, b.w === 'canon' || b.crit || Math.random() < 0.35);
      else { const d = this.damage(e, b.d, false, 'turret'); if (d > 0.5) this.text(e.x, e.y - 12, String(Math.round(d)), '#bfe8ff', false, 0.5); }
      if (b.crit) { this.crits++; this.emit('crit'); }
      if (b.kind === 'cball') {
        this.burst(e.x, e.y, '#9aa3b2', 7, 90);
        this.fx.push({ kind: 'boom', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.3, max: 0.3, c: '#ffcf8a', r: br === 1 ? 26 : 14 });
        this.fx.push({ kind: 'splash', x: e.x, y: e.y + 4, vx: 0, vy: 0, t: 0.45, max: 0.45, c: '#bfe8ff', r: 10 });
        if (br === 1) for (const o of this.enemies) if (o !== e && !o.dead && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < (26 + o.r) ** 2) this.hitW(o, b.d * 0.5, 'canon', 1, false, false);
      } else this.burst(e.x, e.y, '#e6c58f', 3, 60);
      return;
    }
    // Si no golpea nada, cae al mar al final de su recorrido
    if (b.left! <= 0) {
      b.gone = true;
      this.fx.push({ kind: 'splash', x: b.x, y: b.y, vx: 0, vy: 0, t: 0.45, max: 0.45, c: '#bfe8ff', r: b.kind === 'cball' ? 9 : 5 });
    }
  }

  private costaUpdate(dt: number) {
    const st = this.st, gy = COSTA.gunY;
    this.lamp = 0;
    this.volleyCd = Math.max(0, this.volleyCd - dt);
    for (const s of this.slots) {
      if (!s.open || !s.w) continue;
      s.fire = Math.max(0, s.fire - dt);
      s.cd -= dt;
      s.on = false;
      const W = this.weaponStat(s.w, s.lv, s.br);
      const tg = this.pickFor(s.x, gy, W.range, s.w === 'mortero' ? 60 : 0, s.w === 'mortero' ? W.R : 0);
      if (!tg) continue;
      const want = Math.atan2(tg.y - gy, tg.x - s.x);
      s.aim += Math.atan2(Math.sin(want - s.aim), Math.cos(want - s.aim)) * Math.min(1, dt * 14);
      if (s.w === 'luz') {
        // Haz continuo sobre el objetivo y los que están pegados a él
        s.on = true; s.tx = tg.x; s.ty = tg.y;
        s.pulse -= dt;
        const flash = s.br === 1 && s.pulse <= 0;
        if (flash) { s.pulse = 2.2; this.fx.push({ kind: 'ring', x: tg.x, y: tg.y, vx: 0, vy: 0, t: 0.35, max: 0.35, c: '#fff6c8' }); this.emit('blind'); }
        let n = 0;
        for (const e of this.enemies) {
          if (e.dead || n >= W.n || (e.x - tg.x) ** 2 + (e.y - tg.y) ** 2 > (W.R + e.r) ** 2) continue;
          n++;
          this.hitW(e, W.dmg * dt, 'luz', s.br, false, false);
          e.slowT = Math.max(e.slowT, s.br === 1 ? 0.6 : 0.3);
          if (flash && e.type !== 'boss') e.stun = Math.max(e.stun, 0.6);
        }
        continue;
      }
      if (s.cd > 0) continue;
      s.cd += 1 / W.rate;
      s.fire = 0.22;
      const crit = Math.random() < st.cc;
      const fcrit = crit ? st.cf : 1;
      const mx = s.x + Math.cos(s.aim) * 14, my = gy + Math.sin(s.aim) * 14;
      if (s.w === 'canon') {
        const tgs = [tg];
        for (let i = 1; i < W.n; i++) { const o = this.nearestTo(tg.x, tg.y, 140, ...tgs); if (o) tgs.push(o); }
        for (const t2 of tgs) this.bolts.push({ x: s.x, y: gy, px: s.x, py: gy, t: t2, d: W.dmg * fcrit, crit, bounce: true, kind: 'cball', speed: s.br === 1 ? 300 : 340, w: 'canon', br: s.br });
        this.fx.push({ kind: 'cannon', x: s.x, y: gy, vx: 0, vy: 0, t: 0.35, max: 0.35, c: '', r: 14, h: s.aim });
        this.fx.push({ kind: 'smoke', x: mx, y: my, vx: Math.cos(s.aim) * 14, vy: Math.sin(s.aim) * 14 - 6, t: 0.9, max: 0.9, c: '', r: s.br === 1 ? 9 : 6 });
        this.shake = Math.max(this.shake, s.br === 1 ? 0.06 : 0.03);
        this.emit('cannon');
      } else if (s.w === 'ballesta') {
        for (let i = 0; i < W.n; i++) {
          const t2 = i === 0 ? tg : this.nearestTo(tg.x, tg.y, 120, tg) || tg;
          this.bolts.push({ x: s.x + (i ? 5 * i : -(W.n - 1) * 2.5), y: gy, px: s.x, py: gy, t: t2, d: W.dmg * fcrit, crit, bounce: true, kind: 'quarrel', speed: s.br === 1 ? 640 : 560, w: 'ballesta', br: s.br });
        }
        this.emit('harpoon');
      } else {
        const fly = Math.max(0.6, Math.min(1.2, Math.hypot(tg.x - s.x, tg.y - gy) / 260));
        this.shells.push({ sx: s.x, sy: gy, tx: tg.x, ty: tg.y, t: 0, max: fly, R: W.R, d: W.dmg * fcrit, kind: 'mortar', burn: s.br === 1, cluster: s.br === 2 });
        this.fx.push({ kind: 'smoke', x: s.x, y: gy - 10, vx: 0, vy: -18, t: 1.0, max: 1.0, c: '', r: 7 });
        this.emit('slam');
      }
      this.burst(mx, my, '#ffd9a0', 3, 50);
    }
  }

  /** Posición de una bomba de mortero (en el aire describe un arco). */
  shellPos(sh: Shell) {
    const k = Math.max(0, Math.min(1, sh.t / sh.max));
    return { x: sh.sx + (sh.tx - sh.sx) * k, y: sh.sy + (sh.ty - sh.sy) * k, h: Math.sin(k * Math.PI) * 70 };
  }

  /* ---------- Mecánicas de zona ---------- */
  private mechanics(dt: number) {
    const m = this.zone.mech;
    if (m === 'ice' && this.wave > 0) {
      this.frozen = Math.max(0, this.frozen - dt);
      this.frostT -= dt;
      if (this.frostT <= 3 && !this.frostWarned) { this.frostWarned = true; this.emit('frostwarn'); }
      if (this.frostT <= 0) {
        this.frostT = 16 + Math.random() * 6;
        this.frostWarned = false;
        this.frozen = 4.5;
        this.text(0, -100, t('¡ESCARCHA!'), '#bfe8ff', true, 1.2);
        this.emit('frost');
      }
    }
    if (m === 'lava' && this.wave > 0) {
      this.eruptT -= dt;
      if (this.eruptT <= 0) {
        this.eruptT = 9 + Math.random() * 5;
        const n = 2 + Math.floor(this.wave / 12);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 150;
          this.hazards.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, t: 1.3, r: 42 });
        }
      }
      for (const h of this.hazards) {
        h.t -= dt;
        if (h.t <= 0) {
          this.fx.push({ kind: 'boom', x: h.x, y: h.y, vx: 0, vy: 0, t: 0.7, max: 0.7, c: '#ff8a3d', r: h.r * 1.6 });
          this.burst(h.x, h.y, '#ff8a3d', 16, 150);
          for (const e of this.enemies) {
            if (e.dead || (e.x - h.x) ** 2 + (e.y - h.y) ** 2 > (h.r + e.r) ** 2) continue;
            this.damage(e, this.st.dmg * 3 + (e.type === 'boss' ? 0 : e.max * 0.25), true, 'area');
          }
          this.hurt(this.st.hp * 0.02); // ceniza
          this.emit('erupt');
        }
      }
      this.hazards = this.hazards.filter(h => h.t > 0);
    }
  }

  /* ---------- Bucle ---------- */
  update(dt: number) {
    if (this.over || this.state === 'cards') return;
    const st = this.st;
    this.t += dt;
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.shake = Math.max(0, this.shake - dt * 1.4);
    this.flashCd = Math.max(0, this.flashCd - dt);
    this.lightning = Math.max(0, this.lightning - dt);
    this.nextLightning -= dt;
    if (this.nextLightning <= 0) {
      this.lightning = 0.4;
      this.nextLightning = this.bl.tormenta ? 3 + Math.random() * 4 : 7 + Math.random() * 11;
      const alive = this.enemies.filter(e => !e.dead && Math.hypot(e.x, e.y) < 260);
      if (this.bl.tormenta && alive.length) {
        const hits = alive.sort(() => Math.random() - 0.5).slice(0, 2 + 2 * this.bl.tormenta);
        this.makeLightning(hits[0].x, hits[0].y);
        for (const e of hits) {
          this.fx.push({ kind: 'strike', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.4, max: 0.4, c: '#dfe8ff', r: 30 });
          this.damage(e, st.dmg * 6, true, 'area');
        }
      } else this.makeLightning((Math.random() - 0.5) * 260, (Math.random() - 0.5) * 200);
      this.emit('thunder');
    }
    this.hp = Math.min(st.hp, this.hp + st.rep * dt);
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.taps < TAP_MAX) { this.tapT += dt; if (this.tapT >= st.tapCd) { this.tapT = 0; this.taps++; } } else this.tapT = 0;
    if (this.poisonT > 0) {
      this.poisonT -= dt;
      this.hurt(this.poisonDps * dt, undefined, true);
      if (this.poisonT <= 0) this.poisonDps = 0;
      if (this.hp <= 0 && !this.over) { this.hurt(0); if (this.over) return; }
    }
    this.dim = this.enemies.filter(e => !e.dead && e.type === 'angler' && Math.hypot(e.x, e.y) < 160).length;
    if (this.bl.escudo && this.state !== 'pause') this.shield = Math.min(st.bar, this.shield + 3 * this.bl.escudo * dt);

    // Oleadas
    if (this.state === 'spawn') {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.queue.length) {
        this.spawn(this.queue.shift()!);
        this.spawnT = Math.max(0.18, 0.95 - this.wave * 0.025);
      }
      if (!this.queue.length) this.state = 'clear';
    } else if (this.state === 'clear') {
      if (!this.enemies.some(e => !e.dead)) {
        this.state = 'pause';
        this.pauseT = 1.6;
        let pw = Math.round(st.pw) + 3 + this.wave;
        const it = Math.min(Math.floor(this.pearls * st.int), (6 + this.wave) * Math.max(1, this.lv.int + (this.perm.interest || 0)));
        if (it > 0) pw += it;
        this.gain(pw);
        this.text(0, -95, '+' + pw + L(' perlas', ' pearls') + (it > 0 ? ' (+' + it + L(' interés)', ' interest)') : ''), '#8fe9ff', true, 1.4);
        this.coral += st.cw * this.zone.reward;
        if (this.bl.marea) this.hp = Math.min(st.hp, this.hp + st.hp * 0.2 * this.bl.marea);
        if ((this.level || this.mode === 'asedio' || this.mode === 'costa') && this.wave >= this.lastWave) { this.winLevel(); return; }
        if (this.mode === 'aguante' || this.mode === 'travesia') this.pauseT = 0.5;
        if (this.mode === 'costa') this.pauseT = COSTA.pause;
        if ((this.level ? this.shownWave : this.wave) % 5 === 0) {
          this.dealCards();
          if (this.cardOpts.length) { this.state = 'cards'; this.emit('cards'); return; }
        }
      }
    } else {
      this.pauseT -= dt;
      if (this.pauseT <= 0) { this.wave++; this.startWave(); }
    }

    this.mechanics(dt);
    if (this.over) return;
    if (this.mode === 'costa') this.costaUpdate(dt);
    else { this.turrets(dt); this.landNets(dt); this.fleetUpdate(dt); }

    // Apuntar y disparar desde la linterna (en la costa disparan los huecos de la muralla)
    const tg = this.mode === 'costa' ? null : this.target();
    if (tg) {
      const want = Math.atan2(tg.y - LAMP_Y, tg.x);
      const diff = Math.atan2(Math.sin(want - this.lamp), Math.cos(want - this.lamp));
      this.lamp += diff * Math.min(1, dt * 18);
    } else this.lamp += dt * 0.7;
    this.cd -= dt * (this.frozen > 0 ? 0.45 : 1) * Math.max(0.5, Math.pow(0.72, this.dim));
    if (tg && this.cd <= 0) {
      this.cd = Math.max(0, this.cd + 1 / st.spd);
      const fire = (t: Enemy) => {
        const crit = Math.random() < st.cc;
        this.bolts.push({ x: 0, y: LAMP_Y, px: 0, py: LAMP_Y, t, d: st.dmg * (crit ? st.cf : 1), crit, bounce: false, kind: 'light', speed: 480 });
      };
      fire(tg);
      if (st.twin > 0 && Math.random() < st.twin) fire(this.nearestTo(tg.x, tg.y, 160, tg) || tg);
      this.emit('shot');
    }

    // Proyectiles del faro y arpones
    for (const b of this.bolts) {
      if (b.w || b.straight) { this.costaBolt(b, dt); continue; }
      if (!b.t || b.t.dead) { b.t = this.nearestTo(b.x, b.y, 400); if (!b.t) { b.gone = true; continue; } }
      const e = b.t, dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy) || 1, s = b.speed * dt;
      b.px = b.x; b.py = b.y;
      if (d <= s + e.r * 0.6) {
        b.gone = true;
        const dealt = this.damage(e, b.d, false, b.kind === 'light' ? 'beam' : 'turret');
        if (b.kind === 'harpoon') { this.burst(e.x, e.y, '#c9a46a', 5, 70); continue; }
        this.burst(e.x, e.y, b.crit ? '#ffe27a' : '#fff6c8', b.crit ? 6 : 2, 60);
        if (e.armor && dealt < b.d * 0.5) this.text(e.x, e.y - 12, t('coraza'), '#e8c39e', false, 0.5);
        if (this.bl.fuego && !e.dead) { e.burn = Math.max(e.burn, (dealt * 0.4 * this.bl.fuego) / 2); e.burnT = 2; }
        if (b.crit) {
          this.crits++;
          if (this.bl.hielo) e.slowT = Math.max(e.slowT, 1.5);
          this.text(e.x, e.y - 10, Math.round(dealt) + '!', '#ffe27a', true, 0.7);
          this.emit('crit');
        }
        if (!b.bounce && Math.random() < st.chain) {
          const n = this.nearestTo(e.x, e.y, 110, e);
          if (n) this.bolts.push({ x: e.x, y: e.y, px: e.x, py: e.y, t: n, d: b.d * 0.6, crit: false, bounce: true, kind: 'light', speed: 480 });
        }
      } else { b.x += (dx / d) * s; b.y += (dy / d) * s; }
    }
    this.bolts = this.bolts.filter(b => !b.gone);

    // Disparos enemigos (anguilas)
    for (const s of this.eshots) {
      const d = Math.hypot(s.x, s.y), v = 170 * dt;
      if (d <= v + 30) { s.gone = true; this.hurt(s.d); this.burst(s.x, s.y, s.c, 5, 50); if (this.over) return; }
      else { s.x -= (s.x / d) * v; s.y -= (s.y / d) * v; }
    }
    this.eshots = this.eshots.filter(s => !s.gone);

    if (this.mode === 'escolta') { this.updateShip(dt); if (this.over) return; }
    if (this.mode === 'travesia') { this.updateVoyage(dt); if (this.over) return; }

    // Bombas de mortero
    for (const sh of this.shells) {
      sh.t += dt;
      if (sh.t < sh.max) continue;
      if (sh.gone) continue;
      sh.gone = true;
      this.fx.push({ kind: 'boom', x: sh.tx, y: sh.ty, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#ff8a3d', r: sh.R });
      this.fx.push({ kind: 'splash', x: sh.tx, y: sh.ty, vx: 0, vy: 0, t: 0.6, max: 0.6, c: '#bfe8ff', r: sh.R * 0.6 });
      this.burst(sh.tx, sh.ty, sh.kind === 'volley' ? '#ffd27a' : '#ff9a52', sh.kind === 'bomblet' ? 5 : 10, 110);
      this.shake = Math.max(this.shake, sh.kind === 'bomblet' ? 0.04 : 0.08);
      for (const e of this.enemies) {
        if (e.dead || (e.x - sh.tx) ** 2 + (e.y - sh.ty) ** 2 >= (sh.R + e.r) ** 2) continue;
        if (sh.kind === 'volley') { const d = this.damage(e, sh.d, true, 'area'); if (d > 0.5) this.text(e.x, e.y - 12, String(Math.round(d)), '#ffd27a', true, 0.6); }
        else {
          this.hitW(e, sh.d, 'mortero', sh.burn ? 1 : sh.cluster ? 2 : 0, false, sh.kind !== 'bomblet');
          if (sh.burn && !e.dead) { e.burn = Math.max(e.burn, sh.d * 0.3); e.burnT = 3; }
        }
      }
      if (sh.cluster) for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + 0.4, r = sh.R * 0.9;
        this.shells.push({ sx: sh.tx, sy: sh.ty, tx: sh.tx + Math.cos(a) * r, ty: sh.ty + Math.sin(a) * r * 0.7, t: 0, max: 0.3, R: sh.R * 0.5, d: sh.d * 0.4, kind: 'bomblet' });
      }
      this.emit('boom');
    }
    this.shells = this.shells.filter(sh => !sh.gone);

    // Bolas de fuego del pez ígneo
    for (const f of this.fireballs) {
      if (f.gone) continue;
      f.t += dt;
      if (f.t >= f.max) {
        f.gone = true;
        this.fx.push({ kind: 'boom', x: f.tx, y: f.ty, vx: 0, vy: 0, t: 0.45, max: 0.45, c: f.ball ? '#ffcf8a' : '#ff8a3d', r: f.ball ? 26 : 30 });
        this.burst(f.tx, f.ty, f.ball ? '#555b66' : '#ff8a3d', 10, 110);
        if (f.ball) this.shake = Math.max(this.shake, 0.15);
        const s = this.ship;
        if (f.toShip) { if (s && Math.hypot(s.x - f.tx, s.y - f.ty) < 34) this.hurtShip(f.d); }
        else this.hurt(f.d);
        if (this.over) return;
      }
    }
    this.fireballs = this.fireballs.filter(f => !f.gone);

    // Criaturas
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.age += dt;
      e.hitT = Math.max(0, e.hitT - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.damage(e, e.burn * dt, true, 'area');
        if (Math.random() < dt * 8) this.fx.push({ kind: 'p', x: e.x + (Math.random() - 0.5) * e.r, y: e.y, vx: 0, vy: -30, t: 0.4, max: 0.4, c: '#ff9a3d' });
        if (e.dead) continue;
      }
      e.phase += dt;
      if (e.stun > 0) { e.stun -= dt; continue; }
      // Caballito: cura a las criaturas cercanas cada cierto tiempo, esté donde esté
      if (e.type === 'seahorse') {
        e.atk -= dt;
        if (e.atk <= 0) {
          e.atk = e.atkRate;
          let n = 0;
          for (const o of this.enemies) {
            if (o.dead || o === e || o.hp >= o.max || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > 85 * 85) continue;
            o.hp = Math.min(o.max, o.hp + o.max * (o.type === 'boss' ? 0.03 : 0.14)); n++;
          }
          if (n) { this.fx.push({ kind: 'heal', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.7, max: 0.7, c: '#7ef0c0', r: 85 }); this.emit('heal'); }
        }
      }
      if (e.type === 'boss') {
        e.summonT -= dt;
        if (e.summonT <= 0) {
          e.summonT = e.enraged ? 3.5 : 6;
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2;
            this.make(this.zone.minion as EType, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30);
            this.waveTotal++;
          }
          this.fx.push({ kind: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.5, max: 0.5, c: this.zone.tint });
        }
        if (!e.enraged && e.age > BOSS_ENRAGE) {
          e.enraged = true; e.dmg *= 1.6; e.atkRate *= 0.6; e.spd *= 1.5;
          this.text(e.x, e.y - 40, t('¡FURIA!'), '#ff5c7a', true, 1.4);
          this.emit('enrage');
        }
      }
      const tg = this.goal(e);
      const rx = e.x - tg.x, ry = e.y - tg.y, d = Math.hypot(rx, ry) || 1;
      // Contra el barco, las cuerpo a cuerpo se pegan al casco y las de distancia se quedan algo más cerca
      const stop = tg.ship ? (e.stop > 100 ? e.stop * 0.7 : e.r + 16) : e.stop;
      const R = tg.ship ? 14 : 30;
      const hitX = tg.x + (rx / d) * R, hitY = tg.y + (ry / d) * R - 6;
      e.hd = Math.atan2(-ry, -rx);
      // Travesía: el mar (y lo que nada en él) se desplaza hacia atrás mientras el barco avanza
      if (this.mode === 'travesia' && d > stop + 20) e.y += MODE_RULES.travesia.speed * dt;
      e.wakeT -= dt;
      // Foca: bucea 2.2 s y sale 1.6 s mientras se acerca; ya en la orilla, se queda arriba
      if (e.type === 'seal') e.under = d > stop + 4 && e.phase % 3.8 < 2.2;
      // Narval: a 140 se detiene a apuntar 1 s y luego embiste a toda velocidad
      if (e.type === 'narwhal') {
        if (e.mode === 0 && d < 140 && d > stop + 10) { e.mode = 1; e.chargeT = 1.0; this.emit('charge'); }
        if (e.mode === 1) { e.chargeT -= dt; if (e.chargeT <= 0) e.mode = 2; continue; }
        if (e.mode === 2 && d <= stop) {
          e.mode = 3;
          this.fx.push({ kind: 'bash', x: hitX, y: hitY, vx: 0, vy: 0, t: 0.45, max: 0.45, c: '', r: e.r * 2 });
          this.fx.push({ kind: 'splash', x: hitX, y: hitY, vx: 0, vy: 0, t: 0.6, max: 0.6, c: '#bfe8ff', r: 24 });
          this.shake = Math.max(this.shake, 0.25);
          this.emit('bite');
          this.strike(tg, e.dmg, e);
          e.dmg *= 0.3; e.atk = e.atkRate;
          if (this.over) return;
        }
      }
      if (d > stop) {
        const s = e.spd * dt * (e.slowT > 0 ? 0.5 : 1) * (e.type === 'sardine' ? 1 + 0.25 * Math.sin(e.age * 6 + e.wob) : 1)
          * (e.type === 'narwhal' && e.mode === 2 ? 8 : 1);
        e.x -= (rx / d) * s;
        e.y -= (ry / d) * s;
        if (e.wakeT <= 0) {
          e.wakeT = e.type === 'sardine' || e.type === 'mini' ? 0.6 : 0.35;
          this.fx.push({ kind: 'wake', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.9, max: 0.9, c: '', r: e.r });
        }
      } else if (e.type === 'puffer') {
        this.fx.push({ kind: 'boom', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#ffd166', r: 50 });
        this.fx.push({ kind: 'ring', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.45, max: 0.45, c: '#fff1b8' });
        this.fx.push({ kind: 'splash', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.7, max: 0.7, c: '#bfe8ff', r: 26 });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2, v = 150 + Math.random() * 60;
          this.fx.push({ kind: 'spray', x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.35, max: 0.35, c: '#c4851a' });
        }
        this.burst(e.x, e.y, '#ffd166', 18, 140);
        this.kill(e, false);
        this.emit('boom');
        this.strike(tg, e.dmg);
        if (this.over) return;
      } else if (e.type === 'seahorse') {
        // se queda a distancia curando
      } else {
        e.atk -= dt * (e.slowT > 0 ? 0.6 : 1);
        e.lungeT = Math.max(0, e.lungeT - dt);
        if (e.type === 'firefish' || e.type === 'pirate' || e.type === 'captain') {
          if (e.atk <= 0) {
            e.atk = e.atkRate; e.lungeT = 0.24;
            const ball = e.type !== 'firefish';
            const shots = e.type === 'captain' ? 3 : 1;
            for (let i = 0; i < shots; i++) {
              const sp = (i - (shots - 1) / 2) * 16;
              this.fireballs.push({ sx: e.x, sy: e.y, tx: tg.x + sp, ty: (tg.ship ? tg.y : tg.y - 10) + Math.abs(sp) * 0.3, t: -i * 0.12, max: ball ? 1.6 : 1.4, d: e.dmg, ball, toShip: tg.ship });
            }
            if (ball) this.fx.push({ kind: 'cannon', x: e.x, y: e.y, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '', r: e.r, h: e.hd });
            this.emit(ball ? 'cannon' : 'fire');
            if (e.type === 'captain' && Math.random() < 0.5) for (let i = 0; i < 2; i++) { this.make('raider', e.x + (i ? 18 : -18), e.y); this.waveTotal++; }
          }
        } else if (e.type === 'eel') {
          // Se carga brillando y luego lanza una descarga instantánea
          if (e.chargeT > 0) {
            e.chargeT -= dt;
            if (e.chargeT <= 0) { this.zap(e, tg); if (this.over) return; }
          } else if (e.atk <= 0) {
            e.atk = e.atkRate;
            e.chargeT = 0.5;
            this.emit('charge');
          }
        } else if (e.atk <= 0) {
          e.atk = e.atkRate;
          e.lungeT = 0.24;
          const hx = hitX, hy = hitY;
          if (e.type === 'boss') {
            this.fx.push({ kind: 'ring', x: 0, y: 0, vx: 0, vy: 0, t: 0.5, max: 0.5, c: '#ff5ca8' });
            this.fx.push({ kind: 'splash', x: hx, y: hy, vx: 0, vy: 0, t: 0.7, max: 0.7, c: '#bfe8ff', r: 30 });
          } else {
            const kind = e.type === 'jelly' || e.type === 'mini' ? 'sting' : e.type === 'turtle' ? 'bash' : 'bite';
            this.fx.push({ kind, x: hx, y: hy, vx: 0, vy: 0, t: 0.3, max: 0.3, c: '', r: e.r, h: e.hd });
            this.emit('bite');
          }
          this.strike(tg, e.dmg, e);
          if (e.type === 'lionfish' && !tg.ship) {
            this.poisonT = 4;
            this.poisonDps = Math.min(this.st.hp * 0.03, this.poisonDps + e.dmg * 0.45);
            this.text(hitX, hitY - 12, t('VENENO'), '#b6f27a', false, 0.6);
            this.emit('poison');
          }
          if (this.over) return;
        }
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);

    for (const f of this.fx) {
      f.t -= dt;
      if (f.kind === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94; }
      else if (f.kind === 'spray') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 260 * dt; f.vx *= 0.97; }
      else if (f.kind === 'chip') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 300 * dt; }
      else if (f.kind === 'smoke') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.96; f.vy = f.vy * 0.96 - 8 * dt; }
    }
    this.fx = this.fx.filter(f => f.t > 0);
    for (const t of this.texts) { t.t -= dt; t.y -= 20 * dt; }
    this.texts = this.texts.filter(t => t.t > 0);
  }

  get boss() { return this.enemies.find(e => e.type === 'boss' || e.type === 'captain') || null; }
  get waveProgress() { return this.state === 'pause' || this.state === 'cards' ? 1 : Math.min(1, this.waveDone / Math.max(1, this.waveTotal)); }
}
