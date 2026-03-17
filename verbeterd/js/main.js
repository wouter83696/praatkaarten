// Praatkaartjes – centrale bootstrap
import { PATHS, VERSION, withV, pathForSet, pathForAsset, DEBUG } from './core/paths.js';
import { getText, getJson, loadJson } from './core/net.js';
import { getQueryParam, getActiveSet, prettyName, prettifySetName } from './core/query.js';
import { dominantColorFromSvgText, lighten } from './core/color.js';
import { state, setActiveSet, setActiveTheme } from './core/state.js';
import { mergeDeep, validateUiConfig, applyUiConfig, uiWarn, UI_ACTIVE } from './core/ui.js';
import { applyCssVars, initShell } from './shell/initShell.js';
import { viewer, resolveViewer } from './templates/index.js';
import { createMenu } from './components/menu.js';
import { createBottomSheet } from './components/bottomSheet.js';
import { createGridCard, createMenuItem, applyDominantTint } from './components/cardRenderer.js';
import { gridBackground } from './components/gridBackground.js';
import { cardsBackground } from './components/cardsBackground.js';
import { autoBackground } from './components/autoBackground.js';
import { initUitleg } from './pages/uitleg.js';
import { initGrid } from './pages/grid.page.js';
import { initKaarten } from './pages/kaarten.page.js';

'use strict';
const w = window;
const doc = document;
const PK = w.PK = w.PK || {};

// Vul PK met geïmporteerde modules (zodat IIFE-scripts nog steeds werken)
PK.PATHS      = PATHS;
PK.VERSION    = VERSION;
PK.withV      = withV;
PK.pathForSet = pathForSet;
PK.pathForAsset = pathForAsset;
PK.DEBUG      = DEBUG;
PK.getText    = getText;
PK.getJson    = getJson;
PK.loadJson   = loadJson;
PK.getQueryParam   = getQueryParam;
PK.getActiveSet    = getActiveSet;
PK.prettyName      = prettyName;
PK.prettifySetName = prettifySetName;
PK.dominantColorFromSvgText = dominantColorFromSvgText;
PK.lighten    = lighten;
PK.state      = state;
PK.setActiveSet   = setActiveSet;
PK.setActiveTheme = setActiveTheme;
PK.mergeDeep      = mergeDeep;
PK.validateUiConfig = validateUiConfig;
PK.applyUiConfig  = applyUiConfig;
PK.uiWarn         = uiWarn;
PK.shell          = PK.shell || {};
PK.shell.applyCssVars = applyCssVars;
PK.shell.initShell    = initShell;
PK.templates      = { viewer, resolveViewer };
PK.createMenu     = createMenu;
PK.createBottomSheet  = createBottomSheet;
PK.createGridCard     = createGridCard;
PK.createMenuItem     = createMenuItem;
PK.applyDominantTint  = applyDominantTint;
PK.gridBackground     = gridBackground;
PK.cardsBackground    = cardsBackground;
PK.autoBackground     = autoBackground;
PK.pages              = PK.pages || {};
PK.pages.initUitleg   = initUitleg;
PK.pages.initGrid     = initGrid;
PK.pages.initKaarten  = initKaarten;
var ASSET_V = '2.08';
var page = (doc.body && doc.body.getAttribute) ? (doc.body.getAttribute('data-page') || '') : '';
var pathName = '';
var lastRuntimeError = '';
w.PK_ASSET_V = ASSET_V;

try{ pathName = (w.location && w.location.pathname) ? String(w.location.pathname) : ''; }catch(_ePath){ pathName = ''; }
if(!page){
  if(pathName.indexOf('/kaarten/') !== -1) page = 'kaarten';
  else if(pathName.indexOf('/uitleg/') !== -1) page = 'uitleg';
  else page = 'grid';
}

function trimText(v){
  return String(v === undefined || v === null ? '' : v).replace(/^\s+|\s+$/g, '');
}

function normalizeThemeColor(input){
  var v = trimText(input);
  if(!v) return '';
  if(v === 'transparent') return '';
  if(v === 'rgba(0, 0, 0, 0)' || v === 'rgba(0,0,0,0)') return '';
  if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v;
  if(/^rgba?\(/i.test(v) || /^hsla?\(/i.test(v)) return v;
  if(/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(v)) return 'rgb(' + v + ')';
  return '';
}

function toHexByte(v){
  var n = Math.max(0, Math.min(255, parseInt(v, 10) || 0));
  var s = n.toString(16);
  return s.length < 2 ? ('0' + s) : s;
}

function coerceThemeColor(input, fallback){
  var v = trimText(input);
  if(!v) return fallback;
  var m;
  if(/^#([0-9a-f]{3})$/i.test(v)){
    return '#' + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2) + v.charAt(3) + v.charAt(3);
  }
  if(/^#([0-9a-f]{6})$/i.test(v)) return v.toLowerCase();
  m = v.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
  if(m){
    return '#' + toHexByte(m[1]) + toHexByte(m[2]) + toHexByte(m[3]);
  }
  return fallback;
}

function resolveThemeColor(contrast){
  var fallback = (contrast === 'dark') ? '#18123c' : '#f7f7f6';
  var rs = null;
  var candidates = [];
  var i;
  function push(v){
    if(v === undefined || v === null) return;
    if(String(v) === '') return;
    candidates.push(v);
  }

  try{ rs = (w.getComputedStyle && doc.documentElement) ? w.getComputedStyle(doc.documentElement) : null; }catch(_eRs){ rs = null; }

  if(rs){
    // Belangrijk: hier NIET --pkStatusBg of huidige backgroundColor teruglezen.
    // Dat geeft op iOS/Safari een feedback-loop waarbij een oude lichte waarde
    // de nieuwe donkere statusbar blijft "overschrijven".
    if(contrast === 'dark'){
      push(rs.getPropertyValue('--darkBaseRgb'));
    }
    push(rs.getPropertyValue('--pageBg'));
    push(rs.getPropertyValue('--cardsPageBg'));
    push(rs.getPropertyValue('--setsBaseBg'));
    push(rs.getPropertyValue('--setsHeroBg'));
    push(rs.getPropertyValue('--pk-set-bg'));
    push(rs.getPropertyValue('--bg-base-color'));
  }

  for(i = 0; i < candidates.length; i++){
    var c = normalizeThemeColor(candidates[i]);
    if(c) return c;
  }
  return fallback;
}

function syncLegacyContrastClasses(mode){
  var isDark = (mode === 'dark');
  try{
    if(doc.documentElement && doc.documentElement.classList){
      doc.documentElement.classList.toggle('dark', isDark);
      doc.documentElement.classList.toggle('light', !isDark);
    }
    if(doc.body && doc.body.classList){
      doc.body.classList.toggle('dark', isDark);
      doc.body.classList.toggle('light', !isDark);
    }
  }catch(_eLegacy){}
}

function isIOSLike(){
  var ua = '';
  var platform = '';
  var mtp = 0;
  try{ ua = String((w.navigator && w.navigator.userAgent) || ''); }catch(_eUa){}
  try{ platform = String((w.navigator && w.navigator.platform) || ''); }catch(_ePl){}
  try{ mtp = (w.navigator && typeof w.navigator.maxTouchPoints === 'number') ? w.navigator.maxTouchPoints : 0; }catch(_eTp){}
  if(/iPad|iPhone|iPod/i.test(ua)) return true;
  if(platform === 'MacIntel' && mtp > 1) return true; // iPadOS desktop UA
  return false;
}

function ensureStatusFill(){ return null; }

function replaceMeta(name, content){
  var el = null;
  var metas = [];
  var i;
  try{
    if(!doc.head) return null;
    metas = doc.querySelectorAll('meta[name="' + name + '"]');
    for(i = 0; i < metas.length; i++){
      if(metas[i] && metas[i].getAttribute('data-pk-dynamic') === '1'){
        el = metas[i];
        break;
      }
    }
    if(!el && metas.length) el = metas[0];
    if(!el){
      el = doc.createElement('meta');
      doc.head.insertBefore(el, doc.head.firstChild || null);
    }
    el.setAttribute('name', name);
    el.setAttribute('content', content);
    el.setAttribute('data-pk-dynamic', '1');
    for(i = 0; i < metas.length; i++){
      if(metas[i] && metas[i] !== el && metas[i].parentNode){
        metas[i].parentNode.removeChild(metas[i]);
      }
    }
  }catch(_eMeta){ el = null; }
  return el;
}

function forceIOSChromeRefresh(activeColor){
  var docEl = null;
  var body = null;
  if(!isIOSLike()) return;
  try{
    docEl = doc.documentElement;
    body = doc.body;
    if(docEl && docEl.style) docEl.style.backgroundColor = activeColor;
    if(body && body.style) body.style.backgroundColor = activeColor;
    if(docEl && docEl.offsetHeight >= 0){}
    if(body && body.offsetHeight >= 0){}
  }catch(_eReflow){}
}

function updateThemeChrome(mode){
  var contrast = (mode === 'dark') ? 'dark' : 'light';
  var iosLike = isIOSLike();
  var fallbackLight = '#f7f7f6';
  var fallbackDark = '#18123c';
  var fallbackColor = (contrast === 'dark') ? fallbackDark : fallbackLight;
  var statusStyle = (contrast === 'dark') ? 'black-translucent' : 'default';
  var metas;
  var dynTheme;
  var dynStatus;
  var i;

  syncLegacyContrastClasses(contrast);

  function applyMetaValues(){
    // Gebruik voorspelbare fallback per mode; Safari/iOS houdt niet van twijfelwaarden.
    var activeColor = coerceThemeColor(resolveThemeColor(contrast), fallbackColor);
    try{
      dynTheme = replaceMeta('theme-color', activeColor);
      if(dynTheme && dynTheme.hasAttribute('media')) dynTheme.removeAttribute('media');
    }catch(_eTheme){}

    try{
      dynStatus = replaceMeta('apple-mobile-web-app-status-bar-style', statusStyle);
    }catch(_eStatus){}

    try{
      if(doc.documentElement && doc.documentElement.style){
        doc.documentElement.style.setProperty('--pkStatusBg', activeColor);
      }
      if(doc.body && doc.body.style){
        doc.body.style.setProperty('--pkStatusBg', activeColor);
      }
    }catch(_eStatusBg){}

    // iOS Safari/Web-app: statusbar-tint volgt betrouwbaarder als html/body
    // achtergrond ook meteen dezelfde kleur krijgt.
    if(iosLike){
      try{
        if(doc.documentElement && doc.documentElement.style){
          doc.documentElement.style.backgroundColor = activeColor;
        }
        if(doc.body && doc.body.style){
          doc.body.style.backgroundColor = activeColor;
        }
      }catch(_eIosBg){}
    }
    return activeColor;
  }

  var appliedColor = applyMetaValues();
  if(iosLike) forceIOSChromeRefresh(appliedColor);
  if(iosLike){
    // Houd iOS/Safari rustig: geen serie meta-rewrites meer, alleen 1 nudge
    // nadat de nieuwe contrast-classes/layout zijn toegepast.
    w.requestAnimationFrame(function(){
      forceIOSChromeRefresh(appliedColor);
    });
  }

  try{
    if(doc.documentElement) doc.documentElement.style.colorScheme = contrast;
    if(doc.body) doc.body.style.colorScheme = contrast;
  }catch(_eScheme){}
}

function syncThemeChromeFromDom(){
  var mode = 'light';
  try{
    mode = (doc.documentElement && doc.documentElement.getAttribute('data-contrast') === 'dark') ? 'dark' : 'light';
  }catch(_eMode){ mode = 'light'; }
  syncLegacyContrastClasses(mode);
  updateThemeChrome(mode);
}

function bindThemeChromeSync(){
  syncThemeChromeFromDom();
  PK.setThemeChrome = updateThemeChrome;
  try{
    if(w.MutationObserver && doc.documentElement){
      var obs = new w.MutationObserver(function(list){
        var i;
        for(i = 0; i < (list || []).length; i++){
          if(list[i] && list[i].attributeName === 'data-contrast'){
            syncThemeChromeFromDom();
            break;
          }
        }
      });
      obs.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-contrast'] });
    }
  }catch(_eObs){}
  try{
    w.addEventListener('pk:contrast', function(ev){
      var mode = (ev && ev.detail && ev.detail.mode === 'dark') ? 'dark' : 'light';
      updateThemeChrome(mode);
    });
    w.addEventListener('pageshow', syncThemeChromeFromDom);
    w.addEventListener('focus', syncThemeChromeFromDom);
    w.addEventListener('orientationchange', syncThemeChromeFromDom);
    doc.addEventListener('visibilitychange', function(){
      if(!doc.hidden) syncThemeChromeFromDom();
    });
  }catch(_eEvt){}
}

function basePath(){
  if(pathName.indexOf('/kaarten/') !== -1 || pathName.indexOf('/uitleg/') !== -1) return '..';
  return '.';
}
var base = basePath();

function _withV(src){
  if(!src) return src;
  if(/[?&]v=/.test(src)) return src;
  return src + (src.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(ASSET_V);
}

function p(rel){
  if(!rel) return rel;
  var clean = String(rel).replace(/^\./,'').replace(/^\//,'');
  return base === '.' ? ('./' + clean) : ('../' + clean);
}

function ensureFallbackCore() { /* core now via ES imports */ }

function rememberRuntimeError(err){
  if(!err) return;
  var txt = String(err);
  if(!txt) return;
  if(txt.length > 220) txt = txt.slice(0, 220) + '...';
  lastRuntimeError = txt;
}

try{
  w.addEventListener('error', function(ev){
    var msg = '';
    try{
      msg = (ev && (ev.message || (ev.error && ev.error.message))) ? String(ev.message || ev.error.message) : '';
    }catch(_eMsg){ msg = ''; }
    rememberRuntimeError(msg);
  });
  w.addEventListener('unhandledrejection', function(ev){
    var msg = '';
    try{
      var r = ev ? ev.reason : null;
      if(r && r.message) msg = String(r.message);
      else if(r) msg = String(r);
    }catch(_eRej){ msg = ''; }
    rememberRuntimeError(msg);
  });
}catch(_eGlobal){}


function showBootError(title, detail){
  var target = null;
  if(page === 'kaarten'){
    target = doc.getElementById('mainCarousel');
  }else if(page === 'grid'){
    target = doc.getElementById('setsGrid') || doc.getElementById('setsCarousel');
  }else if(page === 'uitleg'){
    target = doc.getElementById('desc');
  }
  if(!target) return;
  var txt = String(title || 'Pagina kon niet laden.');
  if(detail) txt += ' ' + String(detail);
  target.innerHTML = '<div role="status" aria-live="polite" aria-atomic="true" style="padding:20px;font-family:system-ui;color:#4b5963;">' + txt + '</div>';
}

function mountBuildBadge(){
  var el = null;
  if(!doc || !doc.body) return;
  try{
    el = doc.getElementById('pkBuildBadge');
    if(!el){
      el = doc.createElement('div');
      el.id = 'pkBuildBadge';
      el.className = 'pkBuildBadge';
      el.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(el);
    }
    el.textContent = 'build ' + ASSET_V;
  }catch(_eBadge){}
}

function bindStaticMenuFallback(force){
  var pill = doc.getElementById('themePill');
  var menu = doc.getElementById('themeMenu');
  var overlay = doc.getElementById('themeMenuOverlay');
  if(!pill || !menu || !overlay) return;
  if(!force && (PK.createMenu || PK.createBottomSheet)) return;
  if(pill.__pkStaticMenuBound) return;
  pill.__pkStaticMenuBound = true;

  function openMenu(){
    menu.hidden = false;
    overlay.hidden = true;
    pill.setAttribute('aria-expanded', 'true');
  }
  function closeMenu(){
    menu.hidden = true;
    overlay.hidden = true;
    pill.setAttribute('aria-expanded', 'false');
  }
  function isHomeAreaClick(ev){
    var t = ev && ev.target ? ev.target : null;
    var main = (t && t.closest) ? t.closest('.themePillMain') : null;
    return !!(main && pill.contains(main));
  }
  function goHome(){
    var target = '';
    try{ target = (PK && PK.PATHS && PK.PATHS.gridPage) ? String(PK.PATHS.gridPage) : ''; }catch(_eHome){}
    if(!target){
      target = (page === 'kaarten' || page === 'uitleg') ? '../index.html' : './index.html';
    }
    try{ w.location.href = target; }catch(_eNav){}
  }
  function toggleMenu(){
    if(menu.hidden) openMenu();
    else closeMenu();
  }
  function onPillClick(ev){
    if(isHomeAreaClick(ev)){
      if(ev && ev.preventDefault) ev.preventDefault();
      closeMenu();
      goHome();
      return;
    }
    toggleMenu();
  }
  function onDocPointerDown(ev){
    var t = ev && ev.target ? ev.target : null;
    if(menu.hidden || !t) return;
    if(menu.contains(t) || pill.contains(t)) return;
    closeMenu();
  }

  pill.addEventListener('click', onPillClick);
  doc.addEventListener('pointerdown', onDocPointerDown, true);
}

function initCurrentPage(){
  try{
    bindStaticMenuFallback();
    if(PK.shell && typeof PK.shell.initShell === 'function'){
      PK.shell.initShell();
    }
    if(page === 'grid' && PK.pages && typeof PK.pages.initGrid === 'function'){
      PK.pages.initGrid();
    }
    if(page === 'kaarten' && PK.pages && typeof PK.pages.initKaarten === 'function'){
      PK.pages.initKaarten();
    }
    if(page === 'uitleg' && PK.pages && typeof PK.pages.initUitleg === 'function'){
      PK.pages.initUitleg();
    }
  }catch(e){
    bindStaticMenuFallback(true);
    showBootError('Initialisatie mislukte.', (e && e.message) ? e.message : '');
  }
}

function validateRender(){
  window.setTimeout(function(){
    if(page === 'kaarten'){
      var car = doc.getElementById('mainCarousel');
      var hasCards = !!(car && car.children && car.children.length);
      if(!hasCards && lastRuntimeError){
        showBootError('Kaarten konden niet worden geladen.', lastRuntimeError);
      }
    }else if(page === 'grid'){
      var setsGrid = doc.getElementById('setsGrid');
      var setsCarousel = doc.getElementById('setsCarousel');
      var hasGrid = !!(setsGrid && setsGrid.children && setsGrid.children.length);
      var hasHero = !!(setsCarousel && setsCarousel.children && setsCarousel.children.length);
      if(!hasGrid && !hasHero && lastRuntimeError){
        showBootError('Kaartensets konden niet worden geladen.', lastRuntimeError);
      }
    }
  }, 1400);
}

bindThemeChromeSync();
mountBuildBadge();
bindStaticMenuFallback();
initCurrentPage();
validateRender();
