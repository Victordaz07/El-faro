// Verifica que todos los textos visibles tengan traducción al inglés.
import { setLang, missing, t } from '../src/i18n';
import { DEFS, MODS, PERM, BLESSINGS, ZONES, ACHIEVEMENTS, HINTS, MPOOL, TABS, BRANCHES, SKINS, BEAMS, CREATURES } from '../src/data';
import { AIMS } from '../src/game';
setLang('en');
const read = (o: object, f: string[]) => f.forEach(k => void (o as Record<string, unknown>)[k]);
DEFS.forEach(d => read(d, ['name'])); MODS.forEach(d => read(d, ['name', 'desc'])); PERM.forEach(d => read(d, ['name', 'desc']));
BLESSINGS.forEach(d => read(d, ['name', 'desc'])); ZONES.forEach(d => read(d, ['name', 'desc', 'boss', 'bossTitle']));
ACHIEVEMENTS.forEach(d => read(d, ['name', 'desc'])); AIMS.forEach(d => read(d, ['name'])); Object.values(HINTS);
[...TABS, ...BRANCHES].forEach(t);
[...SKINS, ...BEAMS].forEach(d => read(d, ['name'])); CREATURES.forEach(d => read(d, ['name', 'desc']));
MPOOL.forEach(m => m.text(2));
// Textos de la interfaz que pasan por t() en main.ts / game.ts / index.html
import { readFileSync } from 'fs';
const src = ['src/main.ts', 'src/game.ts'].map(f => readFileSync(f, 'utf8')).join('\n');
for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)+)'\)/g)) t(m[1]);
const html = readFileSync('index.html', 'utf8').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '');
for (const m of html.matchAll(/>([^<>]*[A-Za-zÁÉÍÓÚÑáéíóúñ][^<>]*)</g)) { const v = m[1].trim(); if (v && !/^(II|×1|♪|ES|LIGHTHOUSE)/.test(v) && v !== 'FARO EN LA' && v !== 'TORMENTA') t(v); }
for (const m of html.matchAll(/placeholder="([^"]+)"/g)) t(m[1]);
if (missing.size) { console.log('Faltan traducciones:\n' + [...missing].map(s => '  ' + s).join('\n')); process.exit(1); }
console.log('OK: todos los textos tienen traducción al inglés');
