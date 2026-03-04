// Praatkaartjes – bootstrap (ES module)
import { PATHS, withV, pathForSet, pathForAsset, VERSION, DEBUG } from './core/paths.js';
import { getText, getJson, loadJson } from './core/net.js';
import { getQueryParam, getActiveSet, prettyName } from './core/query.js';
import { state, setActiveSet, setActiveTheme } from './core/state.js';
import { initShell } from './shell/initShell.js';
import { setThemeChrome, syncLegacyContrastClasses, bindThemeChromeSync } from './core/theme.js';

// Asset versie (voor build-badge)
const ASSET_V = '1.40';

// Paginatype bepalen
const _pathName = (window.location && window.location.pathname) ? String(window.location.pathname) : '';
let page = (document.body && document.body.getAttribute) ? (document.body.getAttribute('data-page') || '') : '';
if (!page) {
  if (_pathName.indexOf('/kaarten/') !== -1) page = 'kaarten';
  else if (_pathName.indexOf('/uitleg/') !== -1) page = 'uitleg';
  else page = 'grid';
}


// ─── Build badge ──────────────────────────────────────────────────────────────

function mountBuildBadge() {
  if (!document.body) return;
  try {
    let el = document.getElementById('pkBuildBadge');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pkBuildBadge';
      el.className = 'pkBuildBadge';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    el.textContent = 'build ' + ASSET_V;
  } catch {}
}

// ─── Error feedback ───────────────────────────────────────────────────────────

let lastRuntimeError = '';

function showBootError(title, detail) {
  const targets = {
    kaarten: 'mainCarousel',
    grid:    'setsGrid',
    uitleg:  'desc',
  };
  const target = document.getElementById(targets[page] || 'setsCarousel');
  if (!target) return;
  const msg = String(title || 'Pagina kon niet laden.') + (detail ? ' ' + String(detail) : '');
  target.innerHTML = `<div role="status" aria-live="polite" aria-atomic="true" style="padding:20px;font-family:system-ui;color:#4b5963;">${msg}</div>`;
}

window.addEventListener('error', ev => {
  try { lastRuntimeError = String(ev.message || (ev.error && ev.error.message) || '').slice(0, 220); } catch {}
});
window.addEventListener('unhandledrejection', ev => {
  try {
    const r = ev && ev.reason;
    lastRuntimeError = String(r && r.message ? r.message : r || '').slice(0, 220);
  } catch {}
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

bindThemeChromeSync();
mountBuildBadge();
initShell();

async function boot() {
  try {
    if (page === 'grid') {
      const { initGrid } = await import('./pages/grid.page.js');
      initGrid();
    } else if (page === 'kaarten') {
      const { initKaarten } = await import('./pages/kaarten.page.js');
      initKaarten();
    } else if (page === 'uitleg') {
      const { initUitleg } = await import('./pages/uitleg.js');
      initUitleg();
    }
    } catch (e) {
    showBootError('Initialisatie mislukte.', e && e.message ? e.message : '');
  }
}

boot();
