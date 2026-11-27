// Idiomas: español (fuente) e inglés. Sin DOM, para que la simulación en Node siga funcionando.
// Los textos se escriben en español en el código; t() devuelve la traducción del diccionario EN.
// Para frases con números se usa L(es, en).

export type Lang = 'es' | 'en';
export let lang: Lang = 'es';
export function setLang(l: Lang) { lang = l; }
/** Idioma inicial: el guardado, o el del dispositivo (español si empieza con "es", si no inglés). */
export function detectLang(saved?: string): Lang {
  if (saved === 'es' || saved === 'en') return saved;
  const n = (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'es';
  return n.toLowerCase().startsWith('es') ? 'es' : 'en';
}
/** Para formatear números (1.234 / 1,234). */
export const locale = () => (lang === 'en' ? 'en-US' : 'es');
export const num = (v: number) => v.toLocaleString(locale());

/** Textos que no están en el diccionario (para el test). */
export const missing = new Set<string>();
export function t(es: string): string {
  if (lang === 'es') return es;
  const en = EN[es];
  if (en === undefined) { missing.add(es); return es; }
  return en;
}
export const L = (es: string, en: string) => (lang === 'en' ? en : es);

/** Convierte campos de texto de una lista de datos en getters que traducen al leerse. */
export function localize<T extends object>(list: T[], fields: (keyof T)[]) {
  for (const o of list) for (const f of fields) {
    const es = o[f];
    if (typeof es !== 'string') continue;
    Object.defineProperty(o, f, { get: () => t(es), enumerable: true, configurable: true });
  }
}

const EN: Record<string, string> = {
  /* ----- Pestañas y ramas ----- */
  LUZ: 'LIGHT', MURALLA: 'WALLS', MAREAS: 'TIDES', ISLA: 'ISLAND',
  /* ----- Mejoras ----- */
  'Daño': 'Damage', 'Cadencia': 'Fire rate', 'Crítico': 'Crit chance', 'Mult. crítico': 'Crit power',
  'Alcance': 'Range', 'Rebote': 'Bounce', 'Integridad': 'Hull', 'Reparación': 'Repair', 'Armadura': 'Armor',
  'Barrera': 'Barrier', 'Espinas': 'Thorns', 'Vida/baja': 'Heal/kill', 'Perlas/baja': 'Pearls/kill',
  'Perlas/oleada': 'Pearls/wave', 'Interés': 'Interest', 'Coral/baja': 'Coral/kill', 'Coral/oleada': 'Coral/wave',
  'Destello': 'Flash', 'Arponero': 'Harpooner', 'Lanzarredes': 'Net Thrower', 'Ancla': 'Anchor',
  'Dispara más lejos': 'Shoots farther',
  'Probabilidad de que el rayo rebote a otra criatura': 'Chance for the beam to bounce to another creature',
  'Devuelve daño a quien golpea el faro': 'Hurts whatever hits the lighthouse',
  'Repara el faro con cada baja': 'Repairs the lighthouse with every kill',
  'Al final de cada oleada ganas un % de tus perlas guardadas': 'At the end of each wave you earn a % of your saved pearls',
  'Recarga del Destello': 'Flash cooldown',
  'Torreta que lanza arpones pesados a la criatura con más vida': 'Turret that fires heavy harpoons at the toughest creature',
  'Lanza redes al grupo más denso: frena y daña': 'Throws nets at the densest group: slows and damages',
  'Golpe en área alrededor de la isla cada pocos segundos': 'Area slam around the island every few seconds',
  /* ----- Modificadores de oleada ----- */
  NIEBLA: 'FOG', 'Alcance −35%': 'Range −35%', CORRIENTE: 'CURRENT', 'Todos llegan por un lado': 'Everything comes from one side',
  'MAREA ALTA': 'HIGH TIDE', '+40% criaturas': '+40% creatures', 'FRENESÍ': 'FRENZY', 'Criaturas +30% veloces': 'Creatures +30% faster',
  'CAPARAZÓN': 'SHELLS', 'Criaturas +35% vida': 'Creatures +35% health', CALMA: 'CALM', '+60% perlas esta oleada': '+60% pearls this wave',
  /* ----- Investigación ----- */
  'Lente pulida': 'Polished lens', '+10% daño': '+10% damage', 'Engranaje ligero': 'Light gears', '+5% cadencia': '+5% fire rate',
  'Prisma de cuarzo': 'Quartz prism', '+2% crítico': '+2% crit chance', 'Haz gemelo': 'Twin beam', '+5% de disparar doble': '+5% chance to double shot',
  'Planos del arponero': 'Harpooner blueprints', 'Empiezas con un Arponero construido': 'Start with a Harpooner already built',
  'Muros de piedra': 'Stone walls', '+10% integridad': '+10% hull', 'Argamasa': 'Mortar', '+0.3 reparación/s': '+0.3 repair/s',
  'Barrera inicial': 'Starting barrier', '+15 barrera': '+15 barrier', 'Bobina de destello': 'Flash coil', '−8% recarga del Destello': '−8% Flash cooldown',
  'Segunda llama': 'Second flame', 'Una vez por partida, el faro revive al 40%': 'Once per run, the lighthouse revives at 40%',
  'Buzo experto': 'Expert diver', '+10% perlas': '+10% pearls', 'Cazador de coral': 'Coral hunter', '+10% coral': '+10% coral',
  'Reservas del faro': 'Lighthouse stores', '+25 perlas al empezar': '+25 pearls at the start', 'Banquero': 'Banker',
  '+1% interés por oleada': '+1% interest per wave', 'Cartógrafo': 'Cartographer', 'Eliges entre 4 cartas en vez de 3': 'Choose from 4 cards instead of 3',
  'Brújula': 'Compass', '+1 re-tirada de cartas por partida': '+1 card reroll per run',
  /* ----- Bendiciones ----- */
  'Rayos ígneos': 'Fiery beams', 'Tus rayos queman: +40% del golpe como daño en 2 s': 'Your beams burn: +40% of the hit as damage over 2 s',
  'Prisma': 'Prism', '+20% de rebote': '+20% bounce', '+20% de disparar un rayo extra': '+20% chance to fire an extra beam',
  'Destello voraz': 'Hungry flash', 'Cada baja recarga 0.25 s el Destello': 'Each kill recharges the Flash by 0.25 s',
  'Lente gigante': 'Giant lens', '+20% de alcance': '+20% range', 'Coraza de coral': 'Coral armor', '+12% de armadura': '+12% armor',
  'Marea curativa': 'Healing tide', 'Al terminar cada oleada, recuperas 20% de vida': 'Recover 20% health at the end of each wave',
  'Escudo vivo': 'Living shield', '+30 barrera que se regenera durante la oleada': '+30 barrier that regenerates during the wave',
  'Avaricia': 'Greed', '+35% perlas, pero −15% vida máxima': '+35% pearls, but −15% max health',
  'Verdugo': 'Executioner', 'Las criaturas con menos de 12% de vida mueren al instante': 'Creatures below 12% health die instantly',
  'Taller de campo': 'Field workshop', 'Torretas +40% de daño': 'Turrets +40% damage',
  'Rayos helados': 'Frost beams', 'Los críticos frenan a la criatura 50%': 'Crits slow the creature by 50%',
  'Hijo de la tormenta': 'Child of the storm', 'Los relámpagos caen más seguido y golpean criaturas': 'Lightning strikes more often and hits creatures',
  'Cofre hundido': 'Sunken chest', 'Recibes un montón de perlas ahora': 'Get a pile of pearls right now',
  'Sangre de kraken': 'Kraken blood', '+1.5 de vida por cada baja': '+1.5 health per kill',
  'Furia del farero': "Keeper's fury", '+20% de cadencia': '+20% fire rate',
  /* ----- Zonas ----- */
  'Bahía Tranquila': 'Quiet Bay', 'Donde empieza todo.': 'Where it all begins.', KRAKEN: 'KRAKEN', 'Señor de la Bahía': 'Lord of the Bay',
  'Arrecife Rojo': 'Red Reef', 'Criaturas más duras. Coral ×1.8': 'Tougher creatures. Coral ×1.8', 'REY CANGREJO': 'CRAB KING', 'Tirano del Arrecife': 'Tyrant of the Reef',
  'Mar Helado': 'Frozen Sea', 'La escarcha congela tu faro. Coral ×2.4': 'Frost freezes your lighthouse. Coral ×2.4', 'SERPIENTE DE HIELO': 'ICE SERPENT', 'Guardiana del Hielo Eterno': 'Keeper of the Eternal Ice',
  'Volcán Submarino': 'Undersea Volcano', 'Erupciones que dañan a todos. Coral ×2.8': 'Eruptions that hurt everyone. Coral ×2.8', 'TITÁN DE MAGMA': 'MAGMA TITAN', 'Corazón del Volcán': 'Heart of the Volcano',
  'El Abismo': 'The Abyss', 'Solo ves lo que alumbra tu faro. Coral ×3.5': 'You only see what your lighthouse lights. Coral ×3.5', 'LEVIATÁN': 'LEVIATHAN', 'Lo que vive en el fondo': 'What lives at the bottom',
  /* ----- Logros ----- */
  'Primera noche': 'First night', 'Guardián': 'Guardian', 'Leyenda del faro': 'Lighthouse legend', 'Inmortal': 'Immortal',
  'Cazador': 'Hunter', 'Exterminador': 'Exterminator', 'Matakraken': 'Kraken slayer', 'Derrota a tu primer jefe': 'Defeat your first boss',
  'Domador de bestias': 'Beast tamer', 'Derrota 10 jefes': 'Defeat 10 bosses', 'Oro falso': "Fool's gold", 'Hunde 10 élites': 'Sink 10 elites',
  'Desactivador': 'Defuser', 'Hunde 100 peces globo': 'Sink 100 pufferfish', 'Ojo de halcón': 'Hawk eye', 'Asesta 1000 críticos': 'Land 1000 crits',
  'Coleccionista': 'Collector', 'Elige 20 bendiciones': 'Pick 20 blessings', 'Artillero': 'Gunner', 'Construye las 3 torretas en una partida': 'Build all 3 turrets in one run',
  'Sin un rasguño': 'Not a scratch', 'Llega a la oleada 10 sin perder vida': 'Reach wave 10 without losing health',
  'Farero de oficio': 'Seasoned keeper', 'Juega 25 partidas': 'Play 25 runs', 'Puntual': 'Punctual', 'Completa 3 desafíos diarios': 'Complete 3 daily challenges',
  'Investigador': 'Researcher', 'Suma 25 niveles de investigación': 'Reach 25 research levels', 'Explorador': 'Explorer',
  'Desbloquea el Mar Helado': 'Unlock the Frozen Sea', 'Hasta el fondo': 'All the way down', 'Desbloquea El Abismo': 'Unlock The Abyss',
  'Llega a la oleada 5': 'Reach wave 5', 'Llega a la oleada 20': 'Reach wave 20', 'Llega a la oleada 30': 'Reach wave 30', 'Llega a la oleada 40': 'Reach wave 40',
  'Hunde 500 criaturas': 'Sink 500 creatures', 'Hunde 5000 criaturas': 'Sink 5000 creatures',
  /* ----- Objetivo ----- */
  CERCANO: 'NEAREST', PELIGRO: 'DANGER', FUERTE: 'STRONG', 'DÉBIL': 'WEAK',
  /* ----- Textos flotantes ----- */
  '¡SEGUNDA LLAMA!': 'SECOND FLAME!', '¡ESCARCHA!': 'FROST!', coraza: 'armor', '¡FURIA!': 'RAGE!',
  /* ----- Interfaz (index.html y main.ts) ----- */
  '❄ ESCARCHA': '❄ FROST', OLEADA: 'WAVE', 'OLEADA 1': 'WAVE 1', 'Faro 100 / 100': 'Lighthouse 100 / 100', 'Récord: 0': 'Best: 0', OBJETIVO: 'TARGET', DESTELLO: 'FLASH',
  JUGAR: 'PLAY', 'DESAFÍO DIARIO': 'DAILY CHALLENGE', MAPA: 'MAP', INVESTIGAR: 'RESEARCH', MISIONES: 'MISSIONS',
  LOGROS: 'ACHIEVEMENTS', RANKING: 'LEADERBOARD', 'EL FARO SE APAGÓ': 'THE LIGHT WENT OUT', 'OTRA VEZ': 'AGAIN',
  'MENÚ': 'MENU', PAUSA: 'PAUSED', CONTINUAR: 'RESUME', SONIDO: 'SOUND', 'MÚSICA': 'MUSIC', 'TERMINAR PARTIDA': 'END RUN',
  'ELIGE UNA BENDICIÓN': 'CHOOSE A BLESSING', 'Dura toda la partida.': 'It lasts the whole run.', 'RE-TIRAR': 'REROLL',
  'INVESTIGACIÓN': 'RESEARCH', VOLVER: 'BACK', 'MAPA DEL MAR': 'SEA MAP',
  'Llega a la oleada 15 en una zona para abrir la siguiente.': 'Reach wave 15 in a zone to open the next one.',
  'MISIONES DIARIAS': 'DAILY MISSIONS', 'RÉCORD': 'BEST', 'DESAFÍO DE HOY': "TODAY'S CHALLENGE", 'Cargando…': 'Loading…',
  'Tu nombre de farero': 'Your keeper name', GUARDAR: 'SAVE', ENTENDIDO: 'GOT IT',
  '¡JEFE DERROTADO!': 'BOSS DEFEATED!', 'DESAFÍO TERMINADO': 'CHALLENGE OVER', 'Bendición activa': 'Blessing active',
  'Las perlas ● compran mejoras': 'Pearls ● buy upgrades',
  'Tu faro dispara solo. Toca una mejora para comprarla; mantén presionado para comprar varias.': 'Your lighthouse fires on its own. Tap an upgrade to buy it; hold to buy several.',
  'El Destello ⚡': 'The Flash ⚡',
  'Aturde y daña a todo lo que esté cerca. Guárdalo para cuando te rodeen o para el jefe.': 'Stuns and damages everything nearby. Save it for when you get surrounded or for the boss.',
  'Elige a quién disparar': 'Pick what to shoot',
  'Toca OBJETIVO para cambiar. PELIGRO prioriza peces globo, anguilas, élites y jefes.': 'Tap TARGET to switch. DANGER goes for pufferfish, eels, elites and bosses first.',
  'Torretas en la isla': 'Island turrets',
  'En la pestaña ISLA construyes un Arponero, un Lanzarredes y un Ancla que disparan solos.': 'In the ISLAND tab you build a Harpooner, a Net Thrower and an Anchor that fire on their own.',
  'Bendiciones': 'Blessings',
  'Cada 5 oleadas eliges una carta que dura toda la partida. Combínalas con tus mejoras.': 'Every 5 waves you pick a card that lasts the whole run. Combine them with your upgrades.',
  'dispara a lo más cercano': 'shoots whatever is closest', 'prioriza peces globo, anguilas, élites y jefes': 'goes for pufferfish, eels, elites and bosses first',
  'prioriza a quien tenga más vida': 'goes for the toughest', 'remata a los más débiles': 'finishes off the weakest',
  'Objetivo:': 'Target:', '🎁 Cofre del día': '🎁 Daily chest', 'Completa las 3 misiones': 'Complete all 3 missions',
  'Mejor oleada': 'Best wave', Partidas: 'Runs', Criaturas: 'Creatures', Jefes: 'Bosses', 'Élites': 'Elites', 'Críticos': 'Crits',
  'Tiempo jugado': 'Time played',
  'No se pudo cargar el ranking ahora. Inténtalo más tarde.': "Couldn't load the leaderboard right now. Try again later.",
  'Nadie ha jugado el desafío de hoy todavía.': "Nobody has played today's challenge yet.", 'Aún no hay puntuaciones.': 'No scores yet.',
  'Tú': 'You', Farero: 'Keeper',
  'Ranking compartido con quienes tienen este juego': 'Leaderboard shared with everyone who has this game',
  'Ranking online (Firebase)': 'Online leaderboard (Firebase)', 'Solo en este dispositivo': 'This device only',
  'Faro en la Tormenta': 'Lighthouse in the Storm',
};
