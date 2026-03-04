// Praatkaartjes – UI config helpers (gedeeld)
import { getQueryParam } from './query.js';
import { pathForSet, withV, PATHS } from './paths.js';

function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

export function mergeDeep(base, override) {
  const out = {};
  if (isObj(base)) {
    for (const k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) {
        out[k] = isObj(base[k]) ? mergeDeep(base[k], {}) : base[k];
      }
    }
  }
  if (isObj(override)) {
    for (const k in override) {
      if (Object.prototype.hasOwnProperty.call(override, k)) {
        out[k] = (isObj(override[k]) && isObj(out[k])) ? mergeDeep(out[k], override[k]) : override[k];
      }
    }
  }
  return out;
}

// UI Debug flag
let DEBUG_UI = false;
try {
  if (String(getQueryParam('uiDebug') || getQueryParam('uidbg')) === '1') DEBUG_UI = true;
  if (!DEBUG_UI && typeof localStorage !== 'undefined') {
    DEBUG_UI = localStorage.getItem('pk_ui_debug') === '1';
  }
} catch {}
export const UI_DEBUG = DEBUG_UI;

function ensureUiWarnings() {
  if (!DEBUG_UI || !document.body) return null;
  let el = document.getElementById('uiWarnings');
  if (!el) {
    el = document.createElement('div');
    el.id = 'uiWarnings';
    el.setAttribute('hidden', '');
    document.body.appendChild(el);
  }
  return el;
}

export function uiWarn(msg) {
  if (typeof console !== 'undefined') console.warn('[UI]', msg);
  const host = ensureUiWarnings();
  if (!host) return;
  host.removeAttribute('hidden');
  const item = document.createElement('div');
  item.className = 'uiWarnItem';
  item.textContent = String(msg || '');
  host.appendChild(item);
  if ((host.children || []).length > 6) host.removeChild(host.children[0]);
}

export function validateUiConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  let ok = true;
  const allowed = { menu: 1, sheet: 1, index: 1, vars: 1, themeCss: 1 };
  for (const k in cfg) {
    if (Object.prototype.hasOwnProperty.call(cfg, k) && !allowed[k]) {
      uiWarn('Onbekende ui-key: ' + k); ok = false;
    }
  }
  if (cfg.menu) {
    if (cfg.menu.showInfo !== undefined && typeof cfg.menu.showInfo !== 'boolean') { uiWarn('menu.showInfo moet boolean zijn'); ok = false; }
    if (cfg.menu.showShuffle !== undefined && typeof cfg.menu.showShuffle !== 'boolean') { uiWarn('menu.showShuffle moet boolean zijn'); ok = false; }
    if (cfg.menu.showAllSets !== undefined && typeof cfg.menu.showAllSets !== 'boolean') { uiWarn('menu.showAllSets moet boolean zijn'); ok = false; }
  }
  if (cfg.sheet) {
    if (cfg.sheet.enabled !== undefined && typeof cfg.sheet.enabled !== 'boolean') { uiWarn('sheet.enabled moet boolean zijn'); ok = false; }
    if (cfg.sheet.defaultMode !== undefined) {
      const m = String(cfg.sheet.defaultMode);
      if (m !== 'cards' && m !== 'help') { uiWarn('sheet.defaultMode moet "cards" of "help" zijn'); ok = false; }
    }
  }
  if (cfg.index && cfg.index.layout !== undefined) {
    const l = String(cfg.index.layout);
    if (!['carousel', 'grid', 'hero-grid', 'empty'].includes(l)) { uiWarn('index.layout moet "carousel", "hero-grid", "grid" of "empty" zijn'); ok = false; }
  }
  if (cfg.index && cfg.index.gridLimit !== undefined) {
    const gl = parseInt(cfg.index.gridLimit, 10);
    if (!isFinite(gl) || gl < 0) { uiWarn('index.gridLimit moet een getal >= 0 zijn'); ok = false; }
  }
  if (cfg.themeCss !== undefined) {
    const t = typeof cfg.themeCss;
    if (t !== 'boolean' && t !== 'string') { uiWarn('themeCss moet boolean of string zijn'); ok = false; }
  }
  if (cfg.vars !== undefined && (typeof cfg.vars !== 'object' || Array.isArray(cfg.vars))) { uiWarn('vars moet object zijn'); ok = false; }
  return ok;
}

function setHidden(el, hidden) {
  if (!el) return;
  if (hidden) el.setAttribute('hidden', ''); else el.removeAttribute('hidden');
}

function setCssVars(vars) {
  if (!vars || !document.documentElement) return;
  for (const k in vars) {
    if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
    const name = k.indexOf('--') === 0 ? k : '--' + k;
    try { document.documentElement.style.setProperty(name, String(vars[k])); } catch {}
  }
}

function resolveThemeCss(setId, ui) {
  if (!ui) return null;
  let css = ui.themeCss;
  if (css === true) css = 'theme.css';
  if (typeof css !== 'string' || !css) return null;
  return pathForSet(setId, css);
}

// Mutable export: wordt gezet door applyUiConfig
export let UI_ACTIVE = null;

export function applyUiConfig(setId, metaUi, defaults, setSheetModeFn) {
  const cfg = mergeDeep(defaults || {}, metaUi || {});
  try { validateUiConfig(cfg); } catch {}

  if (document.body && setId) {
    try { document.body.setAttribute('data-set', setId); } catch {}
  }
  if (document.body && cfg.index && cfg.index.layout) {
    try { document.body.setAttribute('data-index-layout', cfg.index.layout); } catch {}
  }
  if (cfg.vars) setCssVars(cfg.vars);

  const menuInfoBtn   = document.getElementById('menuInfoBtn');
  const menuShuffle   = document.getElementById('menuShuffleToggle');
  const menuAllSets   = document.getElementById('naarOverzicht');
  setHidden(menuInfoBtn,  !!(cfg.menu && cfg.menu.showInfo   === false));
  setHidden(menuShuffle,  !!(cfg.menu && cfg.menu.showShuffle === false));
  setHidden(menuAllSets,  !!(cfg.menu && cfg.menu.showAllSets === false));

  const infoSheet  = document.getElementById('infoSheet');
  const infoOverlay = document.getElementById('infoOverlay');
  if (cfg.sheet && cfg.sheet.enabled === false) {
    setHidden(infoSheet, true);
    setHidden(infoOverlay, true);
    setHidden(menuInfoBtn, true);
  }

  const mode = cfg.sheet && (cfg.sheet.defaultMode || cfg.sheet.mode);
  if (mode && typeof setSheetModeFn === 'function') {
    try { setSheetModeFn(mode); } catch {}
  }

  const cssUrl = resolveThemeCss(setId, cfg);
  let link = document.getElementById('pk-set-theme');
  if (cssUrl && document.head) {
    if (!link) {
      link = document.createElement('link');
      link.id = 'pk-set-theme';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = withV(cssUrl);
  } else if (link && link.parentNode) {
    link.parentNode.removeChild(link);
  }

  UI_ACTIVE = cfg;
  return cfg;
}
