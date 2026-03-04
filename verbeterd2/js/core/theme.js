// Praatkaartjes – theme chrome sync (statusbalk / meta theme-color)

function trimText(v) { return String(v === undefined || v === null ? '' : v).replace(/^\s+|\s+$/g, ''); }

function normalizeThemeColor(input) {
  const v = trimText(input);
  if (!v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)' || v === 'rgba(0,0,0,0)') return '';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v;
  if (/^rgba?\(/i.test(v) || /^hsla?\(/i.test(v)) return v;
  if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(v)) return 'rgb(' + v + ')';
  return '';
}

function toHexByte(v) {
  const n = Math.max(0, Math.min(255, parseInt(v, 10) || 0));
  const s = n.toString(16);
  return s.length < 2 ? '0' + s : s;
}

function coerceThemeColor(input, fallback) {
  const v = trimText(input);
  if (!v) return fallback;
  if (/^#([0-9a-f]{3})$/i.test(v)) return '#' + v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
  if (/^#([0-9a-f]{6})$/i.test(v)) return v.toLowerCase();
  const m = v.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
  if (m) return '#' + toHexByte(m[1]) + toHexByte(m[2]) + toHexByte(m[3]);
  return fallback;
}

function resolveThemeColor(contrast) {
  const fallback = contrast === 'dark' ? '#18123c' : '#f7f7f6';
  const candidates = [];
  try {
    const rs = window.getComputedStyle && document.documentElement
      ? window.getComputedStyle(document.documentElement) : null;
    if (rs) {
      if (contrast === 'dark') candidates.push(rs.getPropertyValue('--darkBaseRgb'));
      candidates.push(
        rs.getPropertyValue('--pageBg'),
        rs.getPropertyValue('--cardsPageBg'),
        rs.getPropertyValue('--setsBaseBg'),
        rs.getPropertyValue('--setsHeroBg'),
        rs.getPropertyValue('--pk-set-bg'),
        rs.getPropertyValue('--bg-base-color'),
      );
    }
  } catch {}
  for (const c of candidates) { const n = normalizeThemeColor(c); if (n) return n; }
  return fallback;
}

export function syncLegacyContrastClasses(mode) {
  const isDark = mode === 'dark';
  try {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
  } catch {}
}

function isIOSLike() {
  const ua  = String((window.navigator && window.navigator.userAgent) || '');
  const plt = String((window.navigator && window.navigator.platform) || '');
  const mtp = (window.navigator && typeof window.navigator.maxTouchPoints === 'number') ? window.navigator.maxTouchPoints : 0;
  return /iPad|iPhone|iPod/i.test(ua) || (plt === 'MacIntel' && mtp > 1);
}

function replaceMeta(name, content) {
  if (!document.head) return null;
  let el = null;
  const metas = document.querySelectorAll(`meta[name="${name}"]`);
  for (const m of metas) { if (m.getAttribute('data-pk-dynamic') === '1') { el = m; break; } }
  if (!el && metas.length) el = metas[0];
  if (!el) {
    el = document.createElement('meta');
    document.head.insertBefore(el, document.head.firstChild || null);
  }
  el.setAttribute('name', name);
  el.setAttribute('content', content);
  el.setAttribute('data-pk-dynamic', '1');
  for (const m of metas) { if (m && m !== el && m.parentNode) m.parentNode.removeChild(m); }
  return el;
}

export function setThemeChrome(mode) {
  const contrast    = mode === 'dark' ? 'dark' : 'light';
  const iosLike     = isIOSLike();
  const fallback    = contrast === 'dark' ? '#18123c' : '#f7f7f6';
  const statusStyle = contrast === 'dark' ? 'black-translucent' : 'default';

  syncLegacyContrastClasses(contrast);

  const activeColor = coerceThemeColor(resolveThemeColor(contrast), fallback);
  try { replaceMeta('theme-color', activeColor); } catch {}
  try { replaceMeta('apple-mobile-web-app-status-bar-style', statusStyle); } catch {}
  try {
    document.documentElement.style.setProperty('--pkStatusBg', activeColor);
    document.body.style.setProperty('--pkStatusBg', activeColor);
  } catch {}
  if (iosLike) {
    try {
      document.documentElement.style.backgroundColor = activeColor;
      document.body.style.backgroundColor = activeColor;
    } catch {}
    requestAnimationFrame(() => {
      try {
        document.documentElement.style.backgroundColor = activeColor;
        document.body.style.backgroundColor = activeColor;
      } catch {}
    });
  }
  try {
    document.documentElement.style.colorScheme = contrast;
    document.body.style.colorScheme = contrast;
  } catch {}
}

function syncThemeChromeFromDom() {
  const mode = document.documentElement && document.documentElement.getAttribute('data-contrast') === 'dark'
    ? 'dark' : 'light';
  syncLegacyContrastClasses(mode);
  setThemeChrome(mode);
}

export function bindThemeChromeSync() {
  syncThemeChromeFromDom();
  try {
    if (window.MutationObserver && document.documentElement) {
      new MutationObserver(list => {
        for (const rec of list) {
          if (rec.attributeName === 'data-contrast') { syncThemeChromeFromDom(); break; }
        }
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-contrast'] });
    }
    window.addEventListener('pk:contrast', ev => {
      setThemeChrome((ev && ev.detail && ev.detail.mode === 'dark') ? 'dark' : 'light');
    });
    window.addEventListener('pageshow',          syncThemeChromeFromDom);
    window.addEventListener('focus',             syncThemeChromeFromDom);
    window.addEventListener('orientationchange', syncThemeChromeFromDom);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) syncThemeChromeFromDom(); });
  } catch {}
}
