// Íconos propios en SVG (24×24, trazo redondeado) para mejoras y pestañas.
const S = (body: string) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  // Luz
  dmg: S('<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" fill="currentColor" stroke="none"/>'),
  spd: S('<circle cx="12" cy="13" r="8"/><path d="M12 13l3.5-3.5M9.5 2h5M12 2v3"/>'),
  cc: S('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  cf: S('<path d="M12 2l2.4 6.6L21 9l-5.2 4.3L17.6 21 12 17.3 6.4 21l1.8-7.7L3 9l6.6-.4z"/>'),
  rng: S('<circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>'),
  chain: S('<circle cx="4.5" cy="18" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19.5" cy="16" r="2"/><path d="M5.6 16.2 10.8 7.8M13.3 7.6l5 6.6"/>'),
  tap: S('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11M12 10V8.5a1.5 1.5 0 0 1 3 0V11M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4.3 15.5a1.6 1.6 0 0 1 2.4-2.1L9 15.5"/><path d="M6 3.5 4.5 2M14.5 3.5 16 2M10.5 2V.8"/>'),
  // Muralla
  hp: S('<path d="M4 21h16M6 21V9h12v12M6 9V4h3v2h2V4h2v2h2V4h3v5"/><path d="M10 21v-4h4v4"/>'),
  rep: S('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  arm: S('<path d="M12 2 4 5v6c0 5.2 3.4 9.3 8 11 4.6-1.7 8-5.8 8-11V5z"/>'),
  bar: S('<circle cx="12" cy="12" r="9" stroke-dasharray="3.5 2.5"/><circle cx="12" cy="12" r="4"/>'),
  thorn: S('<path d="M12 3l2 5-2 1-2-1zM21 12l-5 2-1-2 1-2zM12 21l-2-5 2-1 2 1zM3 12l5-2 1 2-1 2z"/><circle cx="12" cy="12" r="2"/>'),
  vamp: S('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M12 9v6M9 12h6"/>'),
  // Mareas
  pk: S('<circle cx="12" cy="12" r="7"/><circle cx="9.5" cy="9.5" r="1.8" fill="currentColor" stroke="none"/>'),
  pw: S('<path d="M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><circle cx="12" cy="8" r="4"/>'),
  int: S('<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"/>'),
  ck: S('<path d="M12 22V11M12 15l-5-4V6M12 13l5-5V4M7 9 4 7M17 8l3-1"/>'),
  cw: S('<path d="M12 15V6M12 10 8 7M12 9l4-3M2 20c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>'),
  fcd: S('<circle cx="12" cy="12" r="9"/><path d="M13 6l-4 7h4l-1 5 4-7h-4z" fill="currentColor" stroke="none"/>'),
  // Isla
  tA: S('<path d="M3 21 18 6M14 5l5-1-1 5M14 5l4 4M6 18l-2-2M8 16l-2-2"/>'),
  tR: S('<circle cx="12" cy="12" r="9"/><path d="M5 6l14 12M19 6 5 18M3 12h18M12 3v18" stroke-width="1.3"/>'),
  tN: S('<circle cx="12" cy="4.5" r="2"/><path d="M12 6.5V21M8 10h8M4 13a8 8 0 0 0 16 0M4 13l-1.5 1.5M20 13l1.5 1.5"/>'),
};

export const TAB_ICONS = [
  S('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  S('<path d="M3 21V9h4V6h4v3h2V6h4v3h4v12z"/><path d="M3 15h18M9 9v6M15 15v6"/>'),
  S('<path d="M2 12c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 17c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 7c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>'),
  S('<path d="M3 20c3-3 15-3 18 0"/><path d="M12 18V8M12 8c-2-3-6-3-7-1 3 0 5 .5 7 1zM12 8c2-3 6-3 7-1-3 0-5 .5-7 1zM12 8c-1-3 1-5 3-5"/>'),
];
