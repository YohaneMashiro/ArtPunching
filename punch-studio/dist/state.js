export const STATE_KEY = 'alive-punch-state-v1';
export const STATE_TTL = 7 * 24 * 60 * 60 * 1000;

export function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

const ranges = {
  holeSize: [3, 60], spacing: [15, 55], positionY: [0, 100], positionX: [0, 100],
  areaWidth: [35, 94], imageDensity: [0, 12], imageHoleSize: [6, 60],
};
const choices = {
  mode: ['punch', 'transfer'], shape: ['square', 'circle'], fontStyle: ['classic', 'fusion'],
  split: ['auto', 'vertical', 'horizontal'], imageShape: ['square', 'circle'],
};
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

// Restore only known fields. Browser storage can be stale or edited externally.
export function readState(storage, defaults, now = Date.now()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || state.version !== 1 || !inRange(state.savedAt, 0, now + 60_000) || now - state.savedAt >= STATE_TTL) {
      storage.removeItem(STATE_KEY); return null;
    }
    const settings = {...defaults};
    const saved = state.settings && typeof state.settings === 'object' ? state.settings : {};
    for (const [key, bounds] of Object.entries(ranges)) if (inRange(saved[key], ...bounds)) settings[key] = saved[key];
    for (const [key, values] of Object.entries(choices)) if (values.includes(saved[key])) settings[key] = saved[key];
    for (const key of ['autoSize', 'autoColor', 'depth']) if (typeof saved[key] === 'boolean') settings[key] = saved[key];
    if (color(saved.paperColor)) settings.paperColor = saved.paperColor.toLowerCase();
    if (saved.imageHoleColor === null || color(saved.imageHoleColor)) settings.imageHoleColor = saved.imageHoleColor?.toLowerCase() ?? null;
    settings.position = settings.positionY;
    const view = state.view && typeof state.view === 'object' ? state.view : {};
    return {
      language: state.language === 'en' ? 'en' : 'zh',
      letters: typeof state.letters === 'string' && state.letters.length <= 240 ? state.letters : 'ALIVE ART',
      settings,
      view: {
        zoom: inRange(view.zoom, .25, 3) ? view.zoom : 1,
        sensitivity: inRange(view.sensitivity, .2, 2.5) ? view.sensitivity : 1,
        original: typeof view.original === 'boolean' ? view.original : false,
        exportScale: [1, 2].includes(view.exportScale) ? view.exportScale : 1,
      },
    };
  } catch {
    try { storage.removeItem(STATE_KEY); } catch {}
    return null;
  }
}

export function writeState(storage, state, now = Date.now()) {
  try {
    if (!storage) return false;
    storage.setItem(STATE_KEY, JSON.stringify({...state, version: 1, savedAt: now}));
    return true;
  } catch { return false; }
}
