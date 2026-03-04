// Praatkaartjes – CardRenderer component
// Één plek voor het bouwen van kaart-UI (grid kaarten + menu thumbnails)
// en voor het toepassen van de dominante tint (uitleg tekstvlak).

import { withV, pathForSet, PATHS } from '../core/paths.js';
import { getText } from '../core/net.js';
import { dominantColorFromSvgText, lighten } from '../core/color.js';

export function createGridCard(item) {
  // item: { theme, themeLabel, q, bg }
  const btn = document.createElement('button');
  btn.className = 'card';
  btn.type = 'button';
  if (item && item.theme) btn.setAttribute('data-theme', item.theme);

  const inner = document.createElement('div');
  inner.className = 'cardInner';

  const img = document.createElement('img');
  img.className = 'bg';
  img.loading = 'lazy';
  img.decoding = 'async';
  const rectSrc = (item && item.bg) || '';
  const fullSrc = rectSrc.indexOf('/cards_rect/') !== -1
    ? rectSrc.replace('/cards_rect/', '/cards/')
    : rectSrc;
  img.setAttribute('data-src-rect', rectSrc);
  img.setAttribute('data-src-full', fullSrc);
  img.src = withV(rectSrc);
  img.onerror = function() {
    if (this.getAttribute('data-fallback') === '1') return;
    this.setAttribute('data-fallback', '1');
    const next = this.getAttribute('data-src-full') || '';
    if (next && next !== this.src) this.src = withV(next);
  };
  img.alt = '';

  const q = document.createElement('div');
  q.className = 'q';

  const span = document.createElement('span');
  span.className = 'qText';
  span.textContent = (item && item.q) || '';
  q.appendChild(span);

  inner.appendChild(img);
  inner.appendChild(q);
  btn.appendChild(inner);

  return btn;
}

export function createMenuItem(args) {
  // args: { setId, key, label, cardFile, cover }
  const btn = document.createElement('button');
  btn.className = 'menuItem themeItem';
  btn.type = 'button';
  btn.setAttribute('data-set', args.key);

  const lab = document.createElement('span');
  lab.className = 'miLabel';
  lab.textContent = args.label || args.key;

  const thumb = document.createElement('span');
  thumb.className = 'miThumbRight';
  thumb.setAttribute('aria-hidden', 'true');

  const mini = document.createElement('div');
  mini.className = 'menuThumbCard';

  const miniImg = document.createElement('img');
  miniImg.className = 'bg';
  miniImg.loading = 'lazy';
  miniImg.decoding = 'async';

  const cardFile  = args.cardFile || (args.key + '.svg');
  const coverFile = args.cover || 'voorkant.svg';
  const srcRect   = pathForSet(args.setId, 'cards_rect/' + cardFile);
  const srcFull   = pathForSet(args.setId, 'cards/' + cardFile);
  const coverRect = pathForSet(args.setId, 'cards_rect/' + coverFile);
  const coverFull = pathForSet(args.setId, 'cards/' + coverFile);

  miniImg.setAttribute('data-fallback-step', '0');
  miniImg.setAttribute('data-src-rect',   srcRect);
  miniImg.setAttribute('data-src-full',   srcFull);
  miniImg.setAttribute('data-cover-rect', coverRect);
  miniImg.setAttribute('data-cover-full', coverFull);
  miniImg.src = withV(srcRect);
  miniImg.onerror = function() {
    const step = parseInt(this.getAttribute('data-fallback-step') || '0', 10);
    const sources = [srcFull, coverRect, coverFull];
    const next = sources[step] || '';
    this.setAttribute('data-fallback-step', String(step + 1));
    if (next && next !== this.src) this.src = withV(next);
  };
  miniImg.alt = '';

  mini.appendChild(miniImg);
  thumb.appendChild(mini);
  btn.appendChild(lab);
  btn.appendChild(thumb);

  return btn;
}

export function applyDominantTint(targetEl, svgUrl, defaultBg) {
  if (!targetEl) return;

  const base = defaultBg || 'rgba(255, 255, 255, 0.975)';
  try {
    targetEl.style.setProperty('--pkTextBg', base);
  } catch {
    targetEl.style.background = base;
  }

  // In dark mode geen lichte tintberekening
  const isDark = !!(document.documentElement && document.documentElement.getAttribute('data-contrast') === 'dark');
  if (isDark) return;

  getText(svgUrl).then(txt => {
    const dom = dominantColorFromSvgText(txt);
    if (!dom) return;
    const lite = lighten(dom, 0.95);

    let tintAlpha = 0.12;
    try {
      const rs = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;
      if (rs) {
        const n = parseFloat(String(rs.getPropertyValue('--menuSheetAlpha') || '').trim());
        if (isFinite(n)) tintAlpha = Math.max(0.10, Math.min(0.18, n * 0.16));
      }
    } catch {}

    const rgb = `rgba(${lite.r}, ${lite.g}, ${lite.b}, ${tintAlpha})`;
    try {
      targetEl.style.setProperty('--pkTextBg', rgb);
    } catch {
      targetEl.style.background = rgb;
    }
  }).catch(() => {}); // keep base on error
}
