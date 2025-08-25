/* ===================== Color Utilities ===================== */

/**
 * Ensure a HEX string is normalized as #RRGGBB
 */
export function normalizeHex(h) {
  if (!h) return '';
  h = h.trim();
  if (!h.startsWith('#')) h = '#' + h;
  return h.toUpperCase();
}

/**
 * Decide if text should be white or dark on a given background.
 * Returns '#fff' or dark hex '#0a0e14'.
 */
export function textOn(hex) {
  if (!hex) return '#fff';
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '#fff';
  const [r, g, b] = [m[1], m[2], m[3]].map(h => parseInt(h, 16) / 255);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#0a0e14' : '#fff';
}

/**
 * Convert RGB values (0-255) to HEX string
 */
export function rgbToHex(r, g, b) {
  const to2 = v => ('0' + Math.max(0, Math.min(255, v | 0)).toString(16)).slice(-2);
  return '#' + to2(r) + to2(g) + to2(b);
}

/**
 * Darken a HEX color by 20%
 */
export function darken20(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '';
  const r = Math.floor(parseInt(m[1], 16) * 0.8);
  const g = Math.floor(parseInt(m[2], 16) * 0.8);
  const b = Math.floor(parseInt(m[3], 16) * 0.8);
  return rgbToHex(r, g, b);
}

/**
 * Deterministically generate a HEX color from a string (e.g., AMC name).
 * Ensures each unknown AMC gets a stable color across sessions.
 */
export function nameToHex(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  const sat = 58 + (Math.abs(h) >> 3) % 22; // 58–80
  const lig = 46 + (Math.abs(h) >> 5) % 12; // 46–58
  return hsl2rgb(hue, sat, lig);
}

/* ---- internal helper: HSL → HEX ---- */
function hsl2rgb(H, S, L) {
  S /= 100; L /= 100;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs((H / 60) % 2 - 1));
  const m = L - C / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= H && H < 60) { r = C; g = X; b = 0; }
  else if (60 <= H && H < 120) { r = X; g = C; b = 0; }
  else if (120 <= H && H < 180) { r = 0; g = C; b = X; }
  else if (180 <= H && H < 240) { r = 0; g = X; b = C; }
  else if (240 <= H && H < 300) { r = X; g = 0; b = C; }
  else { r = C; g = 0; b = X; }
  return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}