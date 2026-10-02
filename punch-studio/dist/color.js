// Color inputs are validated separately from the conversion helpers. RGB channels
// use 0–255, while HSV saturation and value use 0–1 and hue uses degrees.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const channel = value => Math.round(clamp(finite(value), 0, 255));

export function parseHex(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(value)) return `#${Array.from(value, c => c + c).join('').toLowerCase()}`;
  return /^[\da-f]{6}$/i.test(value) ? `#${value.toLowerCase()}` : null;
}

function channels(r, g, b) {
  if (Array.isArray(r)) return r;
  if (r && typeof r === 'object') return [r.r, r.g, r.b];
  return [r, g, b];
}

export function parseRgb(r, g, b) {
  const values = channels(r, g, b);
  if (values.length !== 3) return null;
  const parsed = Array.from(values, value => {
    if (typeof value === 'number') return Number.isInteger(value) && value >= 0 && value <= 255 ? value : null;
    if (typeof value !== 'string' || !/^\d{1,3}$/.test(value.trim())) return null;
    const number = Number(value.trim());
    return number <= 255 ? number : null;
  });
  return parsed.includes(null) ? null : {r: parsed[0], g: parsed[1], b: parsed[2]};
}

export function hexToRgb(input) {
  const hex = parseHex(input);
  return hex ? {r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16)} : null;
}

export function rgbToHex(r, g, b) {
  return `#${channels(r, g, b).map(value => channel(value).toString(16).padStart(2, '0')).join('')}`;
}

export function rgbToHsv(r, g, b) {
  const [red, green, blue] = channels(r, g, b).map(value => clamp(finite(value), 0, 255) / 255);
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue), delta = max - min;
  let h = 0;
  if (delta) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
    h = (h + 360) % 360;
  }
  return {h, s: max ? delta / max : 0, v: max};
}

export function hsvToRgb(h, s, v) {
  if (h && typeof h === 'object') ({h, s, v} = h);
  const hue = ((finite(h) % 360) + 360) % 360;
  const saturation = clamp(finite(s), 0, 1), value = clamp(finite(v), 0, 1);
  const c = value * saturation, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), m = value - c;
  const sector = Math.floor(hue / 60);
  const base = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][sector];
  return {r: channel((base[0] + m) * 255), g: channel((base[1] + m) * 255), b: channel((base[2] + m) * 255)};
}
