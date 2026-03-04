// Praatkaartjes – dominante kleur uit SVG + lichte tint

function parseHexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) { h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; }
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

function parseRgbFunc(c) {
  const m = String(c || '').match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const p = m[1].split(',');
  if (p.length < 3) return null;
  const r = Math.max(0, Math.min(255, parseFloat(p[0].trim())));
  const g = Math.max(0, Math.min(255, parseFloat(p[1].trim())));
  const b = Math.max(0, Math.min(255, parseFloat(p[2].trim())));
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

function parseColorToRgb(c) {
  if (!c) return null;
  c = String(c).trim().toLowerCase();
  if (c === 'none' || c === 'transparent') return null;
  if (c.indexOf('url(') === 0) return null;
  if (c.charAt(0) === '#') return parseHexToRgb(c);
  if (c.indexOf('rgb') === 0) return parseRgbFunc(c);
  return null;
}

function isNearWhite(rgb) { return rgb.r > 245 && rgb.g > 245 && rgb.b > 245; }
function isNearBlack(rgb) { return rgb.r < 10 && rgb.g < 10 && rgb.b < 10; }

export function lighten(rgb, amount = 0.88) {
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * amount),
    g: Math.round(rgb.g + (255 - rgb.g) * amount),
    b: Math.round(rgb.b + (255 - rgb.b) * amount),
  };
}

export function dominantColorFromSvgText(svgText) {
  if (!svgText) return null;
  const counts = {};

  function addColor(raw) {
    const rgb = parseColorToRgb(raw);
    if (!rgb) return;
    if (isNearWhite(rgb) || isNearBlack(rgb)) return;
    const key = `${rgb.r},${rgb.g},${rgb.b}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  const attrRe = /(fill|stroke)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(svgText))) { addColor(m[2]); }

  const styleRe = /(fill|stroke)\s*:\s*([^;}]+)\s*[;}]/gi;
  while ((m = styleRe.exec(svgText))) { addColor(m[2]); }

  let bestKey = null;
  let bestN = 0;
  for (const k in counts) {
    if (counts[k] > bestN) { bestN = counts[k]; bestKey = k; }
  }
  if (!bestKey) return null;
  const [r, g, b] = bestKey.split(',').map(Number);
  return { r, g, b };
}
