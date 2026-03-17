// Praatkaartjes – kaarten.page.js

import { resolveCardsIndexBackground, DEFAULT_CARDS_INDEX_BACKGROUND } from '../components/autoBackground.js';

export function initKaarten() {
  var DEBUG_BUILD = '';

  // Desktop/iPad landing: app niet initialiseren
  try{
    var dl = document && document.documentElement && document.documentElement.getAttribute('data-layout');
    if(dl === 'landing') return;
  }catch(_e){}

  var mainCarousel = document.getElementById('mainCarousel');
  if(!mainCarousel) return;

  // debug badge removed

  var THEMES = [];
  var THEME_LABELS = {};

  function pathForSet(setId, rel){
    if(window.PK.pathForSet) return window.PK.pathForSet(setId, rel);
    var s = String(setId||'').replace(/^\s+|\s+$/g,'') || 'samenwerken';
    var r = String(rel||'').replace(/^\//,'');
    var base = (window.PK.PATHS && window.PK.PATHS.setsDir) ? window.PK.PATHS.setsDir : '.';
    return base + '/' + encodeURIComponent(s) + '/' + r;
  }

  var CARD_BASE = pathForSet('samenwerken', 'cards_rect/');

  var CURRENT_SET = 'samenwerken';
  var CURRENT_META = null;
  var CURRENT_COVER = 'voorkant.svg';
  var CURRENT_BACK_MODE = 'mirror';
  var PENDING_THEME = '';
  try{
    PENDING_THEME = (window.PK.getQueryParam && window.PK.getQueryParam('theme')) ? String(window.PK.getQueryParam('theme')) : '';
    PENDING_THEME = PENDING_THEME.replace(/^\s+|\s+$/g,'');
  }catch(_eTheme){ PENDING_THEME = ''; }
  // Huidige data-volgorde (grid + carrousel)
  var ITEMS = [];
  // Originele volgorde om terug te kunnen als shuffle uitgaat
  var ORIGINAL_ITEMS = [];
  // Shuffle state (komt uit localStorage + toggle)
  var SHUFFLE_ON = false;
  var sheetAPI = null;
  var infoAPI = null;
  var UI_DEFAULTS = {};
  var CARDS_INDEX_PAGE_BG = null;
  var doc = document;
  var __cardsPageIntroPlayed = false;
  var __cardsPageIntroTimer = 0;

  function playCardsPageIntro(){
    if(__cardsPageIntroPlayed) return;
    __cardsPageIntroPlayed = true;
    if(!doc || !doc.body || !doc.body.classList) return;
    try{ doc.body.classList.add('pkCardsIntro'); }catch(_eAdd){}
    if(__cardsPageIntroTimer){
      try{ window.clearTimeout(__cardsPageIntroTimer); }catch(_eClr){}
      __cardsPageIntroTimer = 0;
    }
    __cardsPageIntroTimer = window.setTimeout(function(){
      __cardsPageIntroTimer = 0;
      try{ if(doc && doc.body && doc.body.classList) doc.body.classList.remove('pkCardsIntro'); }catch(_eRem){}
    }, 620);
  }

  function parseHexToRgbCsv(input){
    var hex = String(input || '').replace(/^\s+|\s+$/g,'').replace('#','');
    if(hex.length === 3){
      hex = hex.charAt(0)+hex.charAt(0)+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2);
    }
    if(hex.length !== 6) return '';
    var r = parseInt(hex.slice(0,2),16);
    var g = parseInt(hex.slice(2,4),16);
    var b = parseInt(hex.slice(4,6),16);
    if(!isFinite(r) || !isFinite(g) || !isFinite(b)) return '';
    return r + ', ' + g + ', ' + b;
  }

  function parseRgbFuncToCsv(input){
    var m = String(input || '').match(/rgba?\(([^)]+)\)/i);
    if(!m || !m[1]) return '';
    var p = m[1].split(',');
    if(p.length < 3) return '';
    var r = Math.max(0, Math.min(255, parseFloat(String(p[0]).replace(/^\s+|\s+$/g,''))));
    var g = Math.max(0, Math.min(255, parseFloat(String(p[1]).replace(/^\s+|\s+$/g,''))));
    var b = Math.max(0, Math.min(255, parseFloat(String(p[2]).replace(/^\s+|\s+$/g,''))));
    if(!isFinite(r) || !isFinite(g) || !isFinite(b)) return '';
    return Math.round(r) + ', ' + Math.round(g) + ', ' + Math.round(b);
  }

  function colorToRgbCsv(input){
    var raw = String(input || '').replace(/^\s+|\s+$/g,'');
    if(!raw) return '';
    if(raw.charAt(0) === '#') return parseHexToRgbCsv(raw);
    if(/^rgba?\(/i.test(raw)) return parseRgbFuncToCsv(raw);
    if(/^\d+\s*,\s*\d+\s*,\s*\d+/.test(raw)) return raw.replace(/\s+/g,'');
    return '';
  }

  function resolveMenuBaseRgb(meta){
    var candidates = [];
    var cssVars = (meta && meta.cssVars && typeof meta.cssVars === 'object') ? meta.cssVars : null;
    if(cssVars){
      candidates.push(cssVars['--pk-set-bg']);
      candidates.push(cssVars['pk-set-bg']);
      candidates.push(cssVars['--bg-base-color']);
      candidates.push(cssVars['bg-base-color']);
      candidates.push(cssVars['--cardsPageBg']);
      candidates.push(cssVars['cardsPageBg']);
      candidates.push(cssVars['--pk-set-card']);
      candidates.push(cssVars['pk-set-card']);
    }
    try{
      var activeBg = PK && window.PK.UI_ACTIVE && window.PK.UI_ACTIVE.cardsIndex && window.PK.UI_ACTIVE.cardsIndex.background
        ? window.PK.UI_ACTIVE.cardsIndex.background
        : null;
      if(activeBg){
        if(typeof activeBg.baseColor === 'string') candidates.push(activeBg.baseColor);
        if(Array.isArray(activeBg.palette) && activeBg.palette.length) candidates.push(activeBg.palette[0]);
      }
    }catch(_eBg){}
    try{
      var rs = window.getComputedStyle ? window.getComputedStyle(document.documentElement) : null;
      if(rs){
        candidates.push(rs.getPropertyValue('--pk-set-bg'));
        candidates.push(rs.getPropertyValue('--bg-base-color'));
        candidates.push(rs.getPropertyValue('--cardsPageBg'));
      }
    }catch(_eRs){}
    candidates.push('#FAFAF8');
    for(var i=0;i<candidates.length;i++){
      var csv = colorToRgbCsv(candidates[i]);
      if(csv) return csv;
    }
    return '250, 250, 248';
  }

  function applyMenuSurfaceTint(meta){
    var root = document && document.documentElement;
    if(!root || !root.style || !root.style.setProperty) return;
    var rgb = resolveMenuBaseRgb(meta);
    try{
      root.style.setProperty('--menuSurface', rgb);
      root.style.setProperty('--menuTintRgb', rgb);
      root.style.setProperty('--menuSurfaceAlpha', '0.82');
      root.style.setProperty('--menuSheetAlpha', '0.82');
      root.style.setProperty('--menuBtnAlpha', '0.86');
    }catch(_eSet){}
  }

  function trackSetVisit(setId){
    var id = String(setId || '').replace(/^\s+|\s+$/g,'');
    if(!id) return;
    try{
      var raw = window.localStorage.getItem('pk_set_counts') || '';
      var data = raw ? JSON.parse(raw) : {};
      if(!data || typeof data !== 'object') data = {};
      var cur = parseInt(data[id], 10);
      if(!isFinite(cur)) cur = 0;
      data[id] = cur + 1;
      window.localStorage.setItem('pk_set_counts', JSON.stringify(data));
    }catch(_e){}
  }

  function getIndexBackgroundConfig(){
    try{
      return resolveCardsIndexBackground({
        defaults: (UI_DEFAULTS && UI_DEFAULTS.cardsIndex && UI_DEFAULTS.cardsIndex.background) ? UI_DEFAULTS.cardsIndex.background : null,
        setMeta: CURRENT_META,
        activeUi: (PK && window.PK.UI_ACTIVE) ? window.PK.UI_ACTIVE : null,
        legacyPageBg: CARDS_INDEX_PAGE_BG || null
      });
    }catch(_e){
      return DEFAULT_CARDS_INDEX_BACKGROUND;
    }
  }

  function renderIndexBackground(){
    var bgApi = (PK && window.PK.cardsBackground && window.PK.cardsBackground.render) ? window.PK.cardsBackground : null;
    if(!bgApi) return;
    var opts = { cardBase: CARD_BASE };
    var bg = getIndexBackgroundConfig() || DEFAULT_CARDS_INDEX_BACKGROUND;
    if(bg){
      if(Array.isArray(bg.palette)) opts.palette = bg.palette;
      if(Array.isArray(bg.darkPalette)) opts.darkPalette = bg.darkPalette;
      if(bg.baseWash === false) opts.baseWash = false;
      if(typeof bg.blobCount === 'number') opts.blobCount = bg.blobCount;
      if(typeof bg.alphaBoost === 'number') opts.alphaBoost = bg.alphaBoost;
      if(typeof bg.darkAlphaBoost === 'number') opts.darkAlphaBoost = bg.darkAlphaBoost;
      if(typeof bg.sizeScale === 'number') opts.sizeScale = bg.sizeScale;
      if(typeof bg.darkSizeScale === 'number') opts.darkSizeScale = bg.darkSizeScale;
      if(typeof bg.blobIrregularity === 'number') opts.blobIrregularity = bg.blobIrregularity;
      if(typeof bg.blobPointsMin === 'number') opts.blobPointsMin = bg.blobPointsMin;
      if(typeof bg.blobPointsMax === 'number') opts.blobPointsMax = bg.blobPointsMax;
      if(typeof bg.darkMix === 'number') opts.darkMix = bg.darkMix;
      if(typeof bg.blobWash === 'number') opts.blobWash = bg.blobWash;
      if(typeof bg.shapeWash === 'number') opts.shapeWash = bg.shapeWash;
      if(typeof bg.shapeAlphaBoost === 'number') opts.shapeAlphaBoost = bg.shapeAlphaBoost;
      if(typeof bg.blobAlphaCap === 'number') opts.blobAlphaCap = bg.blobAlphaCap;
      if(typeof bg.blobAlphaCapDark === 'number') opts.blobAlphaCapDark = bg.blobAlphaCapDark;
      if(typeof bg.blobSpread === 'string') opts.blobSpread = bg.blobSpread;
      if(typeof bg.blobSpreadMargin === 'number') opts.blobSpreadMargin = bg.blobSpreadMargin;
      if(typeof bg.sizeLimit === 'number') opts.sizeLimit = bg.sizeLimit;
      if(typeof bg.blobAlphaFixed === 'number') opts.blobAlphaFixed = bg.blobAlphaFixed;
      if(typeof bg.shapeEnabled === 'boolean') opts.shapeEnabled = bg.shapeEnabled;
    }
    // Kaartenindex: standaard géén SVG-shape-laag uit kaartbestanden
    // (die kan grote vlakken/letters veroorzaken bij bepaalde SVG's).
    if(typeof opts.shapeEnabled !== 'boolean') opts.shapeEnabled = false;
    bgApi.render(opts);
  }


  function fisherYates(arr){
    var a = (arr || []).slice();
    for(var i=a.length-1; i>0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function disableInfiniteCarousel(container){
    if(!container) return;
    try{
      if(container.__pkInfiniteOnScroll){
        container.removeEventListener('scroll', container.__pkInfiniteOnScroll);
        container.__pkInfiniteOnScroll = null;
      }
    }catch(_eL){}
    try{ container.removeAttribute('data-infinite'); }catch(_eA){}
    try{
      var clones = container.querySelectorAll('.is-clone');
      for(var i=0;i<clones.length;i++){
        var n = clones[i];
        if(n && n.parentNode === container) container.removeChild(n);
      }
    }catch(_eC){}
  }

  // Infinite scroll helper (clones first/last)
  function enableInfiniteCarousel(container, slideClass){
    if(!container) return { hasClones:false };
    // Reset eerder infinite-gedrag om dubbele listeners/jumps te voorkomen.
    disableInfiniteCarousel(container);

    var slides = container.querySelectorAll('.' + slideClass);
    if(!slides || slides.length < 2) return { hasClones:false };

    var first = slides[0].cloneNode(true);
    var last  = slides[slides.length-1].cloneNode(true);
    first.classList.add('is-clone');
    last.classList.add('is-clone');

    container.insertBefore(last, slides[0]);
    container.appendChild(first);
    container.setAttribute('data-infinite','1');

    function slideWidth(){
      var all = container.querySelectorAll('.' + slideClass);
      if(!all || all.length < 3) return 0;
      var r = all[1].getBoundingClientRect();
      return (r && r.width) ? r.width : 0;
    }

    // Start op eerste echte slide
    window.requestAnimationFrame(function(){
      var w1 = slideWidth();
      if(w1) container.scrollLeft = w1;
    });

    var jumping = false;
    var onScroll = function(){
      // Alleen actief zolang deze carousel expliciet infinite staat.
      if(container.getAttribute('data-infinite') !== '1') return;
      if(jumping) return;
      var all = container.querySelectorAll('.' + slideClass);
      if(!all || all.length < 3) return;
      var sw = slideWidth();
      if(!sw) return;
      var nReal = all.length - 2;
      var left = container.scrollLeft || 0;

      // dicht bij clone links
      if(left <= sw * 0.25){
        jumping = true;
        container.scrollLeft = sw * nReal;
        window.requestAnimationFrame(function(){ jumping = false; });
        return;
      }
      // dicht bij clone rechts
      if(left >= sw * (nReal + 1 - 0.25)){
        jumping = true;
        container.scrollLeft = sw;
        window.requestAnimationFrame(function(){ jumping = false; });
      }
    };
    container.__pkInfiniteOnScroll = onScroll;
    container.addEventListener('scroll', onScroll, { passive:true });

    return { hasClones:true };
  }

  function applyShuffleToUI(){
    // Houd ORIGINAL_ITEMS intact, pas alleen ITEMS + render aan.
    var next = SHUFFLE_ON ? fisherYates(ORIGINAL_ITEMS) : ORIGINAL_ITEMS.slice();
    ITEMS = next;
    render(ITEMS);
    // Als de sheet al kaarten bevat: opnieuw vullen met dezelfde volgorde.
    if(cardsCarousel && cardsCarousel.children && cardsCarousel.children.length){
      renderCards(ITEMS);
      // terug naar eerste kaart (voorspelbaar)
      window.setTimeout(function(){ goToCardIndex(0); }, 30);
    }
  }

  function setThemePillText(txt){
    var pillText = document.getElementById('themePillText');
    var next = (txt || window.PK.prettyName(window.PK.getActiveSet()));
    if(pillText) pillText.textContent = next;
  }

  function openMenu(){
  if(sheetAPI && sheetAPI.open){ sheetAPI.open(); return; }
  var menu = document.getElementById('themeMenu');
  var overlay = document.getElementById('themeMenuOverlay');
  var pill = document.getElementById('themePill');
  if(menu) menu.hidden = false;
  if(overlay) overlay.hidden = false;
  if(pill) pill.setAttribute('aria-expanded','true');
  }

  function closeMenu(){
  if(sheetAPI && sheetAPI.close){ sheetAPI.close(); return; }
  var menu = document.getElementById('themeMenu');
  var overlay = document.getElementById('themeMenuOverlay');
  var pill = document.getElementById('themePill');
  if(menu) menu.hidden = true;
  if(overlay) overlay.hidden = true;
  if(pill) pill.setAttribute('aria-expanded','false');
  }


  function parseInlineQuestions(){
    try{
      var el = document.getElementById('questions-json');
      if(el && el.textContent && el.textContent.replace(/\s+/g,'').length) return JSON.parse(el.textContent);
    }catch(e){}
    return null;
  }

  function resolveActiveSet(){
    var fromUrl = (window.PK.getQueryParam('set') || window.PK.getQueryParam('s') || '').replace(/\s+$/,'').replace(/^\s+/,'');
    return window.PK.loadJson(window.PK.PATHS.setsIndex).then(function(idx){
      UI_DEFAULTS = (idx && idx.uiDefaults) ? idx.uiDefaults : {};
      CARDS_INDEX_PAGE_BG = (idx && idx.cardsIndexPage && idx.cardsIndexPage.background)
        ? idx.cardsIndexPage.background
        : null;
      try{ window.PK.UI_DEFAULTS = UI_DEFAULTS; }catch(_eU){}
      try{ renderIndexBackground(); }catch(_eBg1){}
      var sets = Array.isArray(idx.sets) ? idx.sets : [];
      var available = sets.filter(function(x){ return x && !x.placeholder; }).map(function(x){ return x.id; });
      var def = (idx.default || '').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'');
      if(fromUrl && available.indexOf(fromUrl)!==-1) return fromUrl;
      if(def && available.indexOf(def)!==-1) return def;
      if(available.length) return available[0];
      return fromUrl || 'samenwerken';
    }).catch(function(){
      return fromUrl || 'samenwerken';
    });
  }

  function applySetMeta(setId, meta){
    CURRENT_SET = setId;
    CURRENT_META = meta || null;
    CURRENT_COVER = (meta && meta.cover) ? meta.cover : 'voorkant.svg';
    CURRENT_BACK_MODE = normalizeBackMode(meta && meta.backMode);
    CARD_BASE = pathForSet(setId, 'cards_rect/');
    try{ window.localStorage.setItem('pk_last_set', String(setId || '').replace(/^\s+|\s+$/g,'')); }catch(_eStore){}

    var icon = document.getElementById('setCoverIcon');
    var brandIcon = false;
    try{
      brandIcon = !!(document && document.body && document.body.getAttribute('data-brand-icon') === '1');
    }catch(_e0){}
    if(icon && !brandIcon){
      icon.setAttribute('src', CARD_BASE + CURRENT_COVER);
    }

    var pill = document.getElementById('themePill');
    if(pill){ pill.setAttribute('aria-label', (meta && meta.name) ? meta.name : setId); }

    // Menu titel: kaartenset naam (ipv "Thema's")
    var menuHeaderTitle = document.getElementById('menuHeaderTitle');
    var menuSetName = (meta && meta.name) ? meta.name : window.PK.prettyName(setId);
    if(menuHeaderTitle){
      menuHeaderTitle.textContent = menuSetName;
    }
    setThemePillText(menuSetName);
    trackSetVisit(setId);

    // Per-set CSS vars (meta.cssVars)
    try{
      if(window.PK.shell && window.PK.shell.applyCssVars && meta && meta.cssVars){
        window.PK.shell.applyCssVars(meta.cssVars);
      }
    }catch(_eVars){}
    try{ applyMenuSurfaceTint(meta); }catch(_eMenuTint){}

    // Viewer template hint (voor CSS)
    try{
      if(meta && meta.viewerTemplate && document && document.body){
        document.body.setAttribute('data-viewer-template', String(meta.viewerTemplate));
      }
    }catch(_eTpl){}

    try{
      if(window.PK.DEBUG && window.console && window.console.log){
        window.console.log('[DEBUG] active set', setId);
        window.console.log('[DEBUG] viewer template', (meta && meta.viewerTemplate) ? meta.viewerTemplate : 'classic');
      }
    }catch(_eDbg){}

    THEMES = [];
    THEME_LABELS = {};
    if(meta && Array.isArray(meta.themes)){
      for(var i=0;i<meta.themes.length;i++){
        var k = String((meta.themes[i]||{}).key||'').replace(/^\s+|\s+$/g,'');
        if(k) THEMES.push(k);
        if(k){
          var th = meta.themes[i] || {};
          THEME_LABELS[k] = String(th.label || k);
        }
      }
    }

    var menuList = document.getElementById('menuList');
    if(menuList){
      menuList.innerHTML = '';
      if(meta && Array.isArray(meta.themes)){
        for(var j=0;j<meta.themes.length;j++){
          var th = meta.themes[j] || {};
          var key = String(th.key||'').replace(/^\s+|\s+$/g,'');
          if(!key) continue;
  var cardFile = th.card || (key + '.svg');
  if(window.PK.createMenuItem){
  menuList.appendChild(window.PK.createMenuItem({
    setId: setId,
    key: key,
    label: (th.label || key),
    thumbFile: (th && th.thumb) ? String(th.thumb) : '',
    cardFile: cardFile,
    cover: CURRENT_COVER
  }));
  }else{
  var btn = document.createElement('button');
  btn.className = 'menuItem themeItem';
  btn.type = 'button';
  btn.setAttribute('data-set', key);

  var lab = document.createElement('span');
  lab.className = 'miLabel';
  lab.textContent = (th.label || key);

  var thumb = document.createElement('span');
  thumb.className = 'miThumbRight';
  thumb.setAttribute('aria-hidden','true');

  var mini = document.createElement('div');
  mini.className = 'menuThumbCard';

  var miniImg = document.createElement('img');
  miniImg.className = 'bg';
  var miniSrc = pathForSet(setId, 'cards_rect/' + cardFile);
  miniImg.src = window.PK.withV ? window.PK.withV(miniSrc) : miniSrc;
  miniImg.alt = '';

  mini.appendChild(miniImg);
  thumb.appendChild(mini);

  btn.appendChild(lab);
  btn.appendChild(thumb);
  menuList.appendChild(btn);
  }
        }
      }
    }

    // UI overrides: defaults uit sets/index.json + per-set meta.ui
    if(window.PK.applyUiConfig){
      try{ window.PK.applyUiConfig(setId, meta && meta.ui ? meta.ui : null, UI_DEFAULTS); }catch(_eUi){}
    }
    try{ applyMenuSurfaceTint(meta); }catch(_eMenuTint2){}
    try{ renderIndexBackground(); }catch(_eBg){}
  }

  function normalizeBackMode(v){
    var s = String(v || '').toLowerCase();
    if(s === 'none' || s === 'empty' || s === 'leeg' || s === 'blank') return 'none';
    if(s === 'cover' || s === 'voorkant' || s === 'front') return 'cover';
    if(s === 'mirror' || s === 'spiegel' || s === 'mirrored') return 'mirror';
    return 'mirror'; // default
  }

  function loadMeta(setId){
    return window.PK.loadJson(window.PK.pathForSet ? window.PK.pathForSet(setId, 'meta.json') : pathForSet(setId, 'meta.json'));
  }

  function loadQuestions(setId){
    var indexUrl = window.PK.pathForSet ? window.PK.pathForSet(setId, 'cards_rect/index.json') : pathForSet(setId, 'cards_rect/index.json');
    var questionsUrl = window.PK.pathForSet ? window.PK.pathForSet(setId, 'questions.json') : pathForSet(setId, 'questions.json');

    function buildFromCardFiles(list){
      if(!Array.isArray(list) || !list.length) return Promise.reject(new Error('empty cards index'));
      var basePath = window.PK.pathForSet ? null : (window.PK.PATHS && window.PK.PATHS.setsDir ? window.PK.PATHS.setsDir : '.');
      var tasks = list.map(function(file){
        var rel = 'cards_rect/' + String(file || '').replace(/^\//,'');
        var url = window.PK.pathForSet ? window.PK.pathForSet(setId, rel) : (basePath + '/' + encodeURIComponent(setId) + '/' + rel);
        return window.PK.loadJson(url).then(function(card){
          card = card || {};
          card.__file = String(file||'');
          return card;
        });
      });
      return Promise.all(tasks).then(function(cards){
        var out = {};
        for(var i=0;i<cards.length;i++){
          var c = cards[i] || {};
          var theme = String(c.theme || c.category || 'verkennen');
          var q = c.voorkant || c.q || c.front || c.vraag || c.text || '';
          var back = c.achterkant || c.back || c.backText || c.achter || '';
          if(!out[theme]) out[theme] = [];
          out[theme].push({ q: String(q||''), back: String(back||'') });
        }
        return out;
      });
    }

    // Nieuwe structuur: cards_rect/index.json + per-kaart json
    return window.PK.loadJson(indexUrl).then(buildFromCardFiles).catch(function(){
      // Fallback: oude questions.json of inline
      return window.PK.loadJson(questionsUrl).catch(function(){
        return parseInlineQuestions();
      });
    });
  }

  function loadBacks(setId){
    return window.PK.loadJson(window.PK.pathForSet ? window.PK.pathForSet(setId, 'backs.json') : pathForSet(setId, 'backs.json')).catch(function(){
      return null;
    });
  }

  function cardUrl(themeKey){
    var file = themeKey + '.svg';
    if(CURRENT_META && Array.isArray(CURRENT_META.themes)){
      for(var i=0;i<CURRENT_META.themes.length;i++){
        var t = CURRENT_META.themes[i] || {};
        if(String(t.key||'').replace(/^\s+|\s+$/g,'')===themeKey){ file = (t.card || file); break; }
      }
    }
    return CARD_BASE + file;
  }

  function normalizeQuestionEntry(entry){
    if(entry === null || entry === undefined) return { q:'', back:'' };
    var t = typeof entry;
    if(t === 'string' || t === 'number'){ return { q: String(entry), back:'' }; }
    if(t === 'object'){
      var q = entry.voorkant || entry.q || entry.front || entry.vraag || entry.text || '';
      var back = entry.achterkant || entry.back || entry.backText || entry.achter || '';
      return { q: String(q || ''), back: String(back || '') };
    }
    return { q: String(entry), back:'' };
  }

  function buildData(qObj, backObj){
    var out=[];
    for(var t=0;t<THEMES.length;t++){
      var theme=THEMES[t];
      var arr=(qObj && qObj[theme]) ? qObj[theme] : [];
      var backArr=(backObj && backObj[theme]) ? backObj[theme] : null;
      for(var i=0;i<arr.length;i++){
        var norm = normalizeQuestionEntry(arr[i]);
        var backTxt = norm.back;
        if(!backTxt && backArr && backArr[i] !== undefined && backArr[i] !== null){
          backTxt = String(backArr[i] || '');
        }
        out.push({
          theme: theme,
          themeLabel: (THEME_LABELS[theme] || window.PK.prettyName(theme)),
          q: norm.q,
          voorkant: norm.q,
          back: backTxt,
          achterkant: backTxt,
          bg: cardUrl(theme)
        });
      }
    }
    return out;
  }

  function showError(msg){
    mainCarousel.innerHTML = '<div role="status" aria-live="polite" aria-atomic="true" style="padding:24px;font-family:system-ui;color:#444;">'+msg+'</div>';
  }

  function render(items){
    ITEMS = items || [];
    renderCards(ITEMS);
  }

  function scrollToTheme(themeKey){
    closeMenu();
    // Scroll in de centrale carrousel naar de eerste kaart van dit thema.
    var idx = -1;
    for(var i=0;i<(ITEMS||[]).length;i++){
      if((ITEMS[i]||{}).theme === themeKey){ idx = i; break; }
    }
    if(idx >= 0){
      window.setTimeout(function(){ goToCardIndex(idx); }, 40);
    }
  }

  function applyThemeFromQuery(){
    var key = String(PENDING_THEME || '').replace(/^\s+|\s+$/g,'');
    if(!key) return;
    PENDING_THEME = '';
    if(window.PK.setActiveTheme) window.PK.setActiveTheme(key);
    var label = (THEME_LABELS && THEME_LABELS[key]) ? THEME_LABELS[key] : window.PK.prettyName(key);
    setThemePillText(label);
    scrollToTheme(key);
  }

  // init
  resolveActiveSet()
    .then(function(setId){
      if(window.PK.setActiveSet) window.PK.setActiveSet(setId);
      return loadMeta(setId).then(function(meta){
        applySetMeta(setId, meta);
        return Promise.all([loadQuestions(setId), loadBacks(setId)]);
      });
    })
    .then(function(res){
      var qObj = res ? res[0] : null;
      var backObj = res ? res[1] : null;
      if(!qObj){ showError('Fout bij laden.'); return; }
      var items = buildData(qObj, backObj);
      if(!items.length){ showError('Geen kaarten gevonden.'); return; }
      ORIGINAL_ITEMS = items.slice();
      // Pas shuffle-state toe (als die al aan stond via localStorage)
      ITEMS = SHUFFLE_ON ? fisherYates(ORIGINAL_ITEMS) : ORIGINAL_ITEMS.slice();
      render(ITEMS);
      applyThemeFromQuery();
    })
    .catch(function(e){
      showError('Fout bij laden.');
      if(window.console && window.console.error) window.console.error(e);
    });

  setThemePillText();

  // Menu wiring
  var pillBtn = document.getElementById('themePill');
  var overlay = document.getElementById('themeMenuOverlay');
  var menuEl = document.getElementById('themeMenu');
  if(window.PK.createMenu){
    sheetAPI = window.PK.createMenu({ menu: menuEl, overlay: overlay, trigger: pillBtn });
  }else if(window.PK.createBottomSheet){
    sheetAPI = window.PK.createBottomSheet({ sheet: menuEl, overlay: overlay, trigger: pillBtn });
  }else if(pillBtn){
    pillBtn.onclick = function(){
      var expanded = pillBtn.getAttribute('aria-expanded') === 'true';
      if(expanded) closeMenu(); else openMenu();
    };
    if(overlay) overlay.onclick = closeMenu;
  }

  // Menu acties: info (open sheet in uitleg) + shuffle toggle (alleen state/UI)
  var menuInfoBtn = document.getElementById('menuInfoBtn');
  if(menuInfoBtn){
    menuInfoBtn.onclick = function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      closeMenu();
      // Open uitleg-sheet
      try{ setSheetMode('help'); }catch(_e){}
      if(infoSheet) openInfo();
    };
  }

  // Als uitleg-sheet open staat: 1 tap op de topbar-pill (menu/logo) sluit de sheet
  // en opent direct het menu (in plaats van eerst sheet sluiten en opnieuw tikken).
  if(pillBtn && !pillBtn.__pkInfoSheetMenuBridgeBound){
    pillBtn.__pkInfoSheetMenuBridgeBound = true;
    pillBtn.addEventListener('click', function(ev){
      var sheetOpen = !!(infoSheet && !infoSheet.hidden);
      if(!sheetOpen) return;
      if(ev){
        if(ev.preventDefault) ev.preventDefault();
        if(ev.stopPropagation) ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }
      try{ peekInfo(); }catch(_ePeek){}
      window.requestAnimationFrame(function(){
        try{ openMenu(); }catch(_eOpen){}
      });
    }, true);
  }

  // Contrast (licht/donker) – icon-only toggle in het menu
  var contrastBtn = document.getElementById('menuContrastToggle');
  var CONTRAST = 'light';
  function applyContrast(mode){
    var nextContrast = (mode === 'dark') ? 'dark' : 'light';
    var changed = (nextContrast !== CONTRAST);
    CONTRAST = nextContrast;
    // Session-only: default altijd LIGHT bij een nieuwe sessie,
    // maar na klikken mag DARK de rest van de sessie blijven.
    try{ window.sessionStorage.setItem('pk_contrast_session', CONTRAST); }catch(_e){}
    if(document && document.documentElement){
      document.documentElement.setAttribute('data-contrast', CONTRAST);
    }
    if(contrastBtn) contrastBtn.setAttribute('aria-pressed', (CONTRAST === 'dark') ? 'true' : 'false');
    if(changed){
      // Volg stable-1107: eerst alleen contrast + achtergrond opnieuw zetten.
      // Een directe tint-refresh VOOR de background render geeft op iOS soms
      // een zichtbare paars/wit-flits terwijl alle content al in beeld blijft.
      try{ renderIndexBackground(); }catch(_e3){}
      try{
        window.requestAnimationFrame(function(){
          try{ refreshActiveTintForContrast(); }catch(_eTint){}
          try{ retintInfoSlideTexts && retintInfoSlideTexts(); }catch(_e0){}
        });
      }catch(_eRaf){
        try{ refreshActiveTintForContrast(); }catch(_eTint2){}
        try{ retintInfoSlideTexts && retintInfoSlideTexts(); }catch(_e02){}
      }
      return;
    }
    // Geen echte mode-wissel: gewone sync update is prima.
    try{ refreshActiveTintForContrast(); }catch(_eTint3){}
    try{ retintInfoSlideTexts && retintInfoSlideTexts(); }catch(_e03){}
  }
  if(contrastBtn){
    var savedC = 'light';
    try{ savedC = window.sessionStorage.getItem('pk_contrast_session') || 'light'; }catch(_e){}
    applyContrast(savedC === 'dark' ? 'dark' : 'light');
    contrastBtn.onclick = function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      applyContrast(CONTRAST === 'dark' ? 'light' : 'dark');
    };
  }

  var shuffleBtn = document.getElementById('menuShuffleToggle');
  function setShuffleEnabled(on){
    on = !!on;
    SHUFFLE_ON = on;
    if(shuffleBtn) shuffleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if(document && document.body && document.body.classList){
      document.body.classList.toggle('shuffleOn', on);
    }
    try{ window.localStorage.setItem('pk_shuffle', on ? '1' : '0'); }catch(_e){}
    // Echte shuffle: pas de volgorde aan in grid + carrousel.
    // (We gebruiken ORIGINAL_ITEMS als bron, zodat 'uit' weer exact terug kan.)
    if(ORIGINAL_ITEMS && ORIGINAL_ITEMS.length){
      applyShuffleToUI();
    }
  }
  if(shuffleBtn){
    var saved = '0';
    try{ saved = window.localStorage.getItem('pk_shuffle') || '0'; }catch(_e){}
    setShuffleEnabled(saved === '1');
    shuffleBtn.onclick = function(ev){
      if(ev && ev.preventDefault) ev.preventDefault();
      var cur = shuffleBtn.getAttribute('aria-pressed') === 'true';
      setShuffleEnabled(!cur);
    };
  }


  var menuList = document.getElementById('menuList');
  if(menuList){
    menuList.addEventListener('click', function(e){
      var btn = e.target && (e.target.closest ? e.target.closest('button[data-set]') : null);
      if(!btn) return;
      var themeKey = (btn.getAttribute('data-set') || '').replace(/^\s+|\s+$/g,'');
      if(!themeKey) return;

      if(window.PK.setActiveTheme) window.PK.setActiveTheme(themeKey);

      var labelEl = btn.querySelector('.miLabel');
      var labelTxt = labelEl ? (labelEl.textContent || '').replace(/^\s+|\s+$/g,'') : window.PK.prettyName(themeKey);
      setThemePillText(labelTxt);

      scrollToTheme(themeKey);
    });
  }


  var naarOverzicht = document.getElementById('naarOverzicht');
  if(naarOverzicht){
    naarOverzicht.onclick = function(){
      closeMenu();
      if(window.PK.PATHS && window.PK.PATHS.gridPage){
        window.location.href = window.PK.PATHS.gridPage;
      }else{
        var base = (window.PK.PATHS && window.PK.PATHS.base) ? window.PK.PATHS.base : '.';
        window.location.href = base.replace(/\/$/,'') + '/index.html';
      }
    };
  }

  // ------------------------------------------------------------
  // ------------------------------------------------------------
  // Uitleg-sheet: subtiel aan de onderrand (Google Maps-achtig)
  // - geen info-knop
  // - sheet sluit nooit volledig (peek)
  // - swipe omlaag = naar peek
  // - swipe omhoog = open
  // - koppen boven kaartjes verwijderd
  // - tekstvlak kleurt mee op dominante kaartkleur
  // ------------------------------------------------------------

  var infoSheet = document.getElementById('infoSheet');
  var infoOverlay = document.getElementById('infoOverlay');
  var infoClose = document.getElementById('infoClose');
  var infoCarousel = document.getElementById('infoCarousel');
  // De kaarten-carrousel staat nu centraal op de pagina.
  var cardsCarousel = document.getElementById('mainCarousel');
  var sheetStack = document.getElementById('sheetStack');
  var sheetPageCards = document.getElementById('sheetPageCards');
  var sheetPageHelp = document.getElementById('sheetPageHelp');
  var sheetViewport = infoSheet ? infoSheet.querySelector('.sheetViewport') : null;
  var infoCard = infoSheet ? infoSheet.querySelector('.infoCard') : null;
  var handle = infoSheet ? infoSheet.querySelector('.sheetHandle') : null;
  var topPage = 'cards';
  var __infoOpenedOnce = false;
  var __infoResetOnNextOpen = false;
  var __infoReturnAnimRaf = 0;

  function cancelInfoReturnAnim(){
    if(!__infoReturnAnimRaf) return;
    try{ window.cancelAnimationFrame(__infoReturnAnimRaf); }catch(_e){}
    __infoReturnAnimRaf = 0;
  }

  // ------------------------------------------------------------
  // Scroll-lock (Google Maps-achtig)
  // - Als de sheet open is, mag de achtergrond (index grid) niet scrollen.
  // - iOS/Safari: overflow:hidden alleen is onbetrouwbaar; daarom body 'fixed'.
  // - In peek-stand blijft de pagina gewoon scrollbaar.
  // ------------------------------------------------------------
  var __pkScrollLock = { on:false, y:0 };
  function lockBackgroundScroll(enable){
    enable = !!enable;
    if(enable === __pkScrollLock.on) return;

    var docEl = document.documentElement;
    var body = document.body;

    if(enable){
      __pkScrollLock.on = true;
      __pkScrollLock.y = (window.pageYOffset || docEl.scrollTop || body.scrollTop || 0);

      // Zet body vast op huidige scrollpositie
      body.style.position = 'fixed';
      body.style.top = (-__pkScrollLock.y) + 'px';
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      // extra: voorkomt 'rubber band' op iOS
      docEl.style.overflow = 'hidden';
    }else{
      __pkScrollLock.on = false;
      // Body terugzetten
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      docEl.style.overflow = '';
      // Scroll herstellen
      try{ window.scrollTo(0, __pkScrollLock.y || 0); }catch(_e){}
    }
  }

  // --- Dynamic height helpers (compact kaarten -> max uitleg) ---
  function readCssPx(el, name, fallback){
    try{
      var v = window.getComputedStyle(el || document.documentElement).getPropertyValue(name);
      var n = parseFloat(String(v||'').replace('px',''));
      return isNaN(n) ? fallback : n;
    }catch(_e){ return fallback; }
  }

  function getHelpOpenH(){
    var fallback = readCssPx(document.documentElement, '--sheetPageH', 520);
    var topBar = document.querySelector ? document.querySelector('.topBar') : null;
    var barBottom = 0;
    if(topBar && topBar.getBoundingClientRect){
      var topBarRect = topBar.getBoundingClientRect();
      if(topBarRect && isFinite(topBarRect.bottom)) barBottom = topBarRect.bottom;
    }
    if(!(barBottom > 0)){
      barBottom = readCssPx(document.documentElement, '--topBarInset', 16)
        + readCssPx(document.documentElement, '--topBarHeight', 64);
    }
    var available = Math.round((window.innerHeight || 0) - barBottom - 8);
    if(!isFinite(available) || available < 240) available = fallback;
    return Math.max(240, available || fallback || 240);
  }

  function syncHelpSheetMaxH(){
    var px = getHelpOpenH();
    if(infoSheet && infoSheet.style && infoSheet.style.setProperty){
      infoSheet.style.setProperty('--sheetMaxH', px + 'px');
    }
    return px;
  }

  function getMaxH(){
    // Max hoogte komt uit CSS var op .infoSheet (fallback op root var)
    return readCssPx(
      infoSheet || document.documentElement,
      '--sheetMaxH',
      syncHelpSheetMaxH() || readCssPx(document.documentElement, '--sheetPageH', 520)
    );
  }
  function getCompactH(){
    return readCssPx(infoSheet || document.documentElement, '--sheetCompactH', Math.min(getMaxH(), 460));
  }
  function getCurH(){
    return readCssPx(infoSheet || document.documentElement, '--sheetCurH', getCompactH());
  }
  function setCurH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCurH', Math.max(220, px) + 'px');
  }
  function setCompactH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCompactH', Math.max(220, px) + 'px');
    // Bij init: start altijd compact
    setCurH(px);
  }

  var helpMeasureTimer = 0;
  function scheduleHelpMeasure(){
    if(!infoSheet) return;
    if(helpMeasureTimer) window.clearTimeout(helpMeasureTimer);
    helpMeasureTimer = window.setTimeout(function(){
      helpMeasureTimer = 0;
      setCurH(syncHelpSheetMaxH() || getMaxH());
    }, 60);
  }

  function setTopPage(which){
    which = (which==='help') ? 'help' : 'cards';
    topPage = which;
    if(infoCard) infoCard.setAttribute('data-top', which);
  }

  // ------------------------------------------------------------
  // Mode-switch (simpel en stabiel)
  // - default: kaarten
  // - info knop: uitleg
  // - sluiten: altijd terug naar kaarten
  // Geen pagina-wissel via drag.
  // ------------------------------------------------------------
  var sheetMode = 'cards'; // 'cards' | 'help'
  function setSheetMode(mode){
    mode = (mode === 'help') ? 'help' : 'cards';
    sheetMode = mode;

    if(sheetPageCards) sheetPageCards.style.display = (mode === 'cards') ? '' : 'none';
    if(sheetPageHelp)  sheetPageHelp.style.display  = (mode === 'help')  ? '' : 'none';

    // Visuele hint voor CSS indien gewenst
    if(infoCard) infoCard.setAttribute('data-mode', mode);

    // Viewport hoogte:
    // - kaarten = compact (kaart)
    // - uitleg  = dezelfde open hoogte als de main index
    var compactH = getCompactH();
    if(mode === 'help'){
      scheduleHelpMeasure();
      setTopPage('help');
    }else{
      setCurH(compactH);
      setTopPage('cards');
    }
  }
  try{ window.PK.setSheetMode = setSheetMode; }catch(_eSetMode){}

  // Kaartenindex gebruikt voor uitleg dezelfde open hoogte als de main index.
  function measureHelpH(){
    return syncHelpSheetMaxH() || getMaxH();
  }


  // Kaartenindex gebruikt hier dezelfde rustige sheet-opbouw als de main index.
  // Daarom geen extra verticale content-shift meer binnen de sheet.
  function alignInfoSheetToMainCard(){
    if(!infoSheet || !infoSheet.style || !infoSheet.style.setProperty) return;
    try{ infoSheet.style.setProperty('--helpShift', '0px'); }catch(_e){}
  }

  function getInfoSlides(){
    if(!infoCarousel) return [];
    try{
      // Sluit clones uit (infinite carousel voegt clones toe aan begin/eind)
      return Array.prototype.slice.call(infoCarousel.querySelectorAll('.infoSlide:not(.is-clone)') || []);
    }catch(_e){ return []; }
  }

  function getInfoActiveIndex(){
    if(!infoCarousel) return 0;
    var all = getInfoSlides();
    if(!all.length) return 0;
    var center = (infoCarousel.scrollLeft || 0) + (infoCarousel.clientWidth || 0) / 2;
    var bestIdx = 0;
    var bestDist = Infinity;
    for(var i=0;i<all.length;i++){
      var sl = all[i];
      if(!sl) continue;
      var slCenter = (sl.offsetLeft || 0) + (sl.offsetWidth || 0) / 2;
      var d = Math.abs(slCenter - center);
      if(d < bestDist){
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function getInfoSlideTargetLeft(index){
    if(!infoCarousel) return 0;
    var all = getInfoSlides();
    if(!all.length) return 0;
    var idx = Math.max(0, Math.min(all.length - 1, index|0));
    var slide = all[idx];
    if(!slide) return 0;
    var cw = infoCarousel.clientWidth || 0;
    var sw = slide.offsetWidth || 0;
    var left = (slide.offsetLeft || 0) - ((cw - sw) / 2);
    if(!isFinite(left)) left = (slide.offsetLeft || 0);
    if(left < 0) left = 0;
    return Math.round(left);
  }

  function isInfoCarouselAtCover(){
    return getInfoActiveIndex() === 0;
  }

  // Zet uitleg-carrousel terug op voorkant (optioneel smooth).
  function scrollInfoCarouselToCover(opts){
    opts = opts || {};
    var smooth = !!opts.smooth;
    var direction = String(opts.direction || '');
    if(!infoCarousel) return;

    // Eenvoudig terugscrollen naar links (natuurlijk 'terugspoelen')
    if(smooth && direction === 'right'){
      var targetLeft = getInfoSlideTargetLeft(0);
      if((infoCarousel.scrollLeft || 0) < 2) return;
      try{
        infoCarousel.scrollTo({ left: targetLeft, behavior: 'smooth' });
      }catch(_e){
        infoCarousel.scrollLeft = targetLeft;
      }
      return;
    }

    try{
      // Zet scroll-behavior tijdelijk, zodat we gecontroleerd kunnen animeren.
      var prevBehavior = infoCarousel.style.scrollBehavior;
      infoCarousel.style.scrollBehavior = smooth ? 'smooth' : 'auto';

      var targetLeft = getInfoSlideTargetLeft(0);
      try{
        infoCarousel.scrollTo({ left: targetLeft, behavior: smooth ? 'smooth' : 'auto' });
      }catch(_eScroll){
        infoCarousel.scrollLeft = targetLeft;
      }

      // Herstel scroll-behavior
      if(smooth){
        window.setTimeout(function(){
          try{ infoCarousel.style.scrollBehavior = prevBehavior || ''; }catch(_eRestore){}
        }, 280);
      }else{
        infoCarousel.style.scrollBehavior = prevBehavior || '';
      }
    }catch(_e){}
  }


  function openInfo(){
    if(!infoSheet) return;
    var shouldAnimateBackToCover = !!__infoResetOnNextOpen;

    // Reset eventuele drag/transforms uit oude sessies
    infoSheet.style.transition = '';
    infoSheet.style.transform = '';

    // 1) Maak zichtbaar in 'closed' staat (translateY(100%)) zodat we eerst kunnen meten
    infoSheet.hidden = false;
    if(infoSheet.classList) infoSheet.classList.remove('open');
    if(infoOverlay){
      infoOverlay.hidden = false;
      infoOverlay.style.pointerEvents = 'auto';
      if(infoOverlay.classList) infoOverlay.classList.remove('open');
    }

    // 2) Zet meteen naar uitleg, zodat DOM-sizes kloppen vóór de open-animatie
    try{ setSheetMode('help'); }catch(_e0){}

    // Force reflow zodat de definitieve sheethoogte stabiel is (ook op iOS)
    try{ infoSheet.offsetHeight; }catch(_eR){}

    // 3) Bepaal de definitieve sheet hoogte vóór het openen (voorkomt 'top-down' krimp)
    try{
      var h = syncHelpSheetMaxH();
      if(h) setCurH(h);
    }catch(_eH){}

    // 4) Open van onder naar boven (altijd bottom-up)
    window.requestAnimationFrame(function(){
      if(infoSheet.classList) infoSheet.classList.add('open');
      if(infoOverlay && infoOverlay.classList) infoOverlay.classList.add('open');
      __infoOpenedOnce = true;
      __infoResetOnNextOpen = false;

      // Altijd bij openen naar de cover-slide:
      // - eerste open: direct (voorkomt starten op clone/laatste kaart als sheet hidden was)
      // - heropen na sluiten op andere slide: geanimeerd terug naar rechts
      window.requestAnimationFrame(function(){
        try{
          scrollInfoCarouselToCover({
            smooth: shouldAnimateBackToCover,
            direction: shouldAnimateBackToCover ? 'right' : ''
          });
        }catch(_e3){}
      });

      // Init gestures 1x
      if(!window.__pkInfoDragInited){
        try{ initDrag(); }catch(_e){}
        window.__pkInfoDragInited = true;
      }

      // 5) Na het openen (transform=0) pas de optische align toe (zonder hoogte-wijziging)
      window.requestAnimationFrame(function(){
        try{ alignInfoSheetToMainCard(); }catch(_e2){}
      });
    });
  }
  function peekInfo(){
    // Sluit uitleg-sheet volledig (geen 'peek' meer)
    if(!infoSheet) return;
    cancelInfoReturnAnim();
    try{
      __infoResetOnNextOpen = !isInfoCarouselAtCover();
    }catch(_eTrack){
      __infoResetOnNextOpen = false;
    }
    if(infoSheet.classList) infoSheet.classList.remove('open');
    if(infoOverlay){
      infoOverlay.hidden = true;
      infoOverlay.style.pointerEvents = 'none';
    }
    // Kaarten-carousel blijft op huidige positie bij sluiten uitleg-sheet.
    // wacht transition uit en verberg dan echt
    window.setTimeout(function(){
      infoSheet.hidden = true;
      infoSheet.style.transform = '';
      infoSheet.style.transition = '';
      try{ infoSheet.style.setProperty('--helpShift','0px'); }catch(_e0){}
      lockBackgroundScroll(false);
    }, 220);
  }
  function isInfoOpen(){
    return !!(infoSheet && infoSheet.classList && infoSheet.classList.contains('open'));
  }

  function safeText(v){
    return (v===null || v===undefined) ? '' : String(v);
  }
  function escapeHtml(v){
    var s = safeText(v);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function formatInlineInfoText(raw, opts){
    var txt = escapeHtml(raw).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    if(!txt) return '';
    txt = txt.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if(opts && opts.boldLead){
      var m = txt.match(/^([^\n]{1,90}?)\s*(?:-|–|—)\s*(.+)$/);
      if(m){
        txt = '<strong>' + m[1].replace(/^\s+|\s+$/g, '') + '</strong> - ' + m[2].replace(/^\s+|\s+$/g, '');
      }
    }
    return txt;
  }
  function getInfoHeadingText(line){
    var t = String(line || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    var m = t.match(/^\*\*(.+?)\*\*$/);
    if(m && m[1]){
      t = String(m[1]).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    }
    if(
      t === 'Systemisch werken' ||
      t === 'Teamrollen van Belbin' ||
      t === 'Rollen van Belbin' ||
      t === 'In beweging' ||
      t === 'Waarom werkwoorden?' ||
      t === 'Samen onderzoeken'
    ){
      return t;
    }
    return '';
  }
  function isInfoHeadingLine(line){
    return !!getInfoHeadingText(line);
  }
  function setInfoTextContent(el, raw){
    if(!el) return;
    var text = safeText(raw).replace(/\r\n?/g, '\n');
    var lines = text.split('\n');
    var html = [];
    var para = [];
    var introAssigned = false;

    function flushParagraph(){
      if(!para.length) return;
      var lineParts = [];
      var k;
      for(k = 0; k < para.length; k++){
        var part = String(para[k] || '').replace(/^\s+|\s+$/g, '');
        if(part) lineParts.push(part);
      }
      var joined = lineParts.join('\n').replace(/^\s+|\s+$/g, '');
      para = [];
      if(!joined) return;
      var cls = '';
      var body = '';
      var heading = getInfoHeadingText(lineParts[0]);
      if(heading && lineParts.length === 1){
        cls = ' class="infoTextSubhead"';
        body = '<strong>' + escapeHtml(heading) + '</strong>';
      }else if(!introAssigned){
        cls = ' class="infoTextIntro"';
        introAssigned = true;
      }
      if(!body){
        var rendered = [];
        var startIdx = 0;
        if(heading && lineParts.length > 1){
          startIdx = 1;
        }
        for(k = startIdx; k < lineParts.length; k++){
          rendered.push(formatInlineInfoText(lineParts[k]));
        }
        body = rendered.join('<br>');
        if(heading && lineParts.length > 1){
          body = '<strong class="infoTextHeading">' + escapeHtml(heading) + '</strong><br>' + body;
        }
      }
      html.push('<p' + cls + '>' + body + '</p>');
    }

    var i = 0;
    while(i < lines.length){
      var line = String(lines[i] || '').replace(/^\s+|\s+$/g, '');
      if(!line){
        flushParagraph();
        i += 1;
        continue;
      }

      var headingLine = getInfoHeadingText(line);
      if(headingLine){
        flushParagraph();
        para.push('**' + headingLine + '**');
        i += 1;
        continue;
      }

      if(/^[*•-]\s+/.test(line)){
        flushParagraph();
        var items = [];
        while(i < lines.length){
          var liLine = String(lines[i] || '').replace(/^\s+|\s+$/g, '');
          if(!/^[*•-]\s+/.test(liLine)) break;
          liLine = liLine.replace(/^[*•-]\s+/, '');
          items.push('<li>' + formatInlineInfoText(liLine, { boldLead: true }) + '</li>');
          i += 1;
        }
        if(items.length){
          html.push('<ul class="infoTextList">' + items.join('') + '</ul>');
        }
        continue;
      }

      para.push(line);
      i += 1;
    }
    flushParagraph();

    el.innerHTML = html.join('');
  }

  function appendCoverFooterHint(el, hintText){
    if(!el || !el.appendChild) return;
    if(el.querySelector && el.querySelector('.infoCoverFooter')) return;
    var txt = String(hintText || '').replace(/^\s+|\s+$/g,'');
    if(!txt) return;

    var footer = document.createElement('div');
    footer.className = 'infoCoverFooter';

    var hint = document.createElement('p');
    hint.className = 'infoCoverHint';
    hint.textContent = txt;

    var topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.className = 'infoScrollTopBtn';
    topBtn.setAttribute('aria-label', 'Naar boven');
    topBtn.textContent = '⌃';

    footer.appendChild(hint);
    footer.appendChild(topBtn);
    el.appendChild(footer);
  }

  var __infoUiHandlersBound = false;
  function scrollHelpViewportToTop(smooth){
    var vp = sheetViewport || (infoSheet && infoSheet.querySelector ? infoSheet.querySelector('.sheetViewport') : null);
    if(!vp) return;
    if((vp.scrollTop || 0) <= 1) return;
    try{
      vp.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    }catch(_eVp){
      vp.scrollTop = 0;
    }
  }
  function ensureInfoUiHandlers(){
    if(__infoUiHandlersBound || !infoCarousel) return;
    __infoUiHandlersBound = true;

    infoCarousel.addEventListener('click', function(ev){
      var target = ev && ev.target;
      var btn = target && target.closest ? target.closest('.infoScrollTopBtn') : null;
      if(!btn) return;
      if(ev.preventDefault) ev.preventDefault();
      if(ev.stopPropagation) ev.stopPropagation();
      scrollHelpViewportToTop(true);
    }, false);
  }
  function cardPathRect(setId, file){
    return pathForSet(setId, 'cards_rect/' + file);
  }
  function cardPathSquare(setId, file){
    return pathForSet(setId, 'cards/' + file);
  }
  function buildSlides(setId, meta, uitleg, intro){
    var slides = [];
    meta = meta || {};
    uitleg = uitleg || {};
    intro = intro || {};
    var coverFile = meta.cover || 'voorkant.svg';
    var themes = Array.isArray(meta.themes) ? meta.themes : [];
    var mode = String(intro.mode || '').replace(/^\s+|\s+$/g,'') || (themes.length ? 'themes' : 'single');
    var activeThemes = Array.isArray(intro.activeThemes) && intro.activeThemes.length
      ? intro.activeThemes.map(function(v){ return String(v || '').replace(/^\s+|\s+$/g,''); }).filter(Boolean)
      : themes.map(function(t){ return String((t && t.key) || '').replace(/^\s+|\s+$/g,''); }).filter(Boolean);
    var hintText = mode === 'themes'
      ? String(intro.hint || 'Swipe naar links of rechts voor verdere uitleg per thema.').replace(/^\s+|\s+$/g,'')
      : '';
    slides.push({
      key: 'cover',
      isCover: true,
      title: '',
      srcRect: (window.PK.withV ? window.PK.withV(cardPathRect(setId, coverFile)) : cardPathRect(setId, coverFile)),
      srcFallback: (window.PK.withV ? window.PK.withV(cardPathSquare(setId, coverFile)) : cardPathSquare(setId, coverFile)),
      text: safeText(uitleg.cover || ''),
      footerHint: hintText
    });

    if(mode !== 'themes') return slides;

    for(var i=0;i<themes.length;i++){
      var t = themes[i] || {};
      var key = safeText(t.key || '').replace(/^\s+|\s+$/g,'');
      if(!key) continue;
      if(activeThemes.indexOf(key) === -1) continue;
      var label = safeText(t.label || key);
      var file = safeText(t.card || (key + '.svg'));
      slides.push({
        key: key,
        isCover: false,
        title: label,
        srcRect: (window.PK.withV ? window.PK.withV(cardPathRect(setId, file)) : cardPathRect(setId, file)),
        srcFallback: (window.PK.withV ? window.PK.withV(cardPathSquare(setId, file)) : cardPathSquare(setId, file)),
        text: safeText(uitleg[key] || '')
      });
    }
    return slides;
  }

  function renderSlides(slides){
    if(!infoCarousel) return;
    // Reset vorige staat
    disableInfiniteCarousel(infoCarousel);
    infoCarousel.innerHTML = '';
    for(var i=0;i<slides.length;i++){
      var s = slides[i];

      var slide = document.createElement('div');
      slide.className = 'infoSlide';

      var inner = document.createElement('div');
      inner.className = 'infoSlideInner';

      var card = document.createElement('div');
      card.className = 'infoSlideCard';

      var img = document.createElement('img');
      img.alt = s.isCover ? 'Voorkant' : (s.title || s.key);
      img.src = s.srcRect;
      img.onerror = function(){
        // fallback naar square
        if(this && this.dataset && this.dataset.fallback){
          this.onerror = null;
          this.src = this.dataset.fallback;
        }
      };
      img.dataset.fallback = s.srcFallback;

      card.appendChild(img);

      // Thema-naam in het midden (niet op de cover)
      if(!s.isCover && s.title){
        var mid = document.createElement('div');
        mid.className = 'infoSlideMidTitle';
        mid.textContent = s.title;
        card.appendChild(mid);
      }

      var text = document.createElement('div');
      text.className = 'infoSlideText indexInfoSlideText';
      setInfoTextContent(text, s.text);
      if(s.isCover){
        appendCoverFooterHint(text, s.footerHint);
      }
      inner.appendChild(card);
      inner.appendChild(text);

      slide.appendChild(inner);
      infoCarousel.appendChild(slide);
    }
    // Infinite carousel voor uitleg: peek links/rechts zoals de main carrousel.
    try{ enableInfiniteCarousel(infoCarousel, 'infoSlide'); }catch(_eInf){}
    ensureInfoUiHandlers();
    // Start op de eerste echte slide (na de clone aan de linkerkant).
    try{
      var firstReal = infoCarousel.querySelector('.infoSlide:not(.is-clone)');
      if(firstReal){ infoCarousel.scrollLeft = firstReal.offsetLeft; }
    }catch(_e0){}
  }

  // Laat het uitleg-tekstvlak volledig door CSS sturen, zodat kaartenindex
  // exact dezelfde afwerking kan delen als het main-index tekstvak.
  function retintInfoSlideTexts(){
    var nodes = (document && document.querySelectorAll) ? document.querySelectorAll('.infoSlideText') : [];
    for(var i=0;i<nodes.length;i++){
      var t = nodes[i];
      try{ t.style.background = ''; }catch(_e2){}
    }
  }

  function loadAndRender(){
    if(!window.PK.loadJson) return;
    var setId = (window.PK.getActiveSet ? window.PK.getActiveSet() : 'samenwerken') || 'samenwerken';
    var metaUrl = pathForSet(setId, 'meta.json');
    var uitlegUrl = pathForSet(setId, 'uitleg.json');
    var introUrl = pathForSet(setId, 'intro.json');

    return Promise.all([
      window.PK.loadJson(metaUrl).catch(function(){ return {}; }),
      window.PK.loadJson(uitlegUrl).catch(function(){ return {}; }),
      window.PK.loadJson(introUrl).catch(function(){ return {}; })
    ]).then(function(res){
      var slides = buildSlides(setId, res[0], res[1], res[2]);
      renderSlides(slides);
    });
  }

  // -----------------------------
  // KAARTEN carrousel (centraal op de pagina)
  // -----------------------------

  var __flipHandlersBound = false;
  var __activeCarouselIdx = 0;
  function setFlipState(cardEl, on){
    if(!cardEl) return;
    if(on) cardEl.classList.add('is-flipped');
    else cardEl.classList.remove('is-flipped');
    cardEl.setAttribute('aria-pressed', on ? 'true' : 'false');

    // Extra zekerheid: hide front text during flip (iOS sometimes leaks it).
    try{
      var frontText = cardEl.querySelector('.cardsSlideQ');
      if(frontText){
        frontText.style.display = on ? 'none' : '';
      }
    }catch(_e){}
  }

  function toggleFlip(cardEl){
    if(!cardEl) return;
    var on = cardEl.classList.contains('is-flipped');
    setFlipState(cardEl, !on);
  }

  function resetAllFlippedCards(){
    if(!cardsCarousel || !cardsCarousel.querySelectorAll) return;
    try{
      var flipped = cardsCarousel.querySelectorAll('.cardsSlideCard.is-flipped');
      var i;
      for(i = 0; i < flipped.length; i++){
        setFlipState(flipped[i], false);
      }
    }catch(_e){}
  }

  function ensureFlipHandlers(){
    if(__flipHandlersBound || !cardsCarousel) return;
    __flipHandlersBound = true;
    var start = null;

    cardsCarousel.addEventListener('pointerdown', function(ev){
      var card = ev.target && (ev.target.closest ? ev.target.closest('.pkFlip') : null);
      if(!card) return;
      start = { x: ev.clientX || 0, y: ev.clientY || 0, card: card };
    }, { passive:true });

    cardsCarousel.addEventListener('pointerup', function(ev){
      if(!start) return;
      var card = ev.target && (ev.target.closest ? ev.target.closest('.pkFlip') : null);
      var dx = Math.abs((ev.clientX || 0) - start.x);
      var dy = Math.abs((ev.clientY || 0) - start.y);
      if(card && card === start.card && dx < 8 && dy < 8){
        toggleFlip(card);
      }
      start = null;
    }, { passive:true });

    cardsCarousel.addEventListener('keydown', function(ev){
      var card = ev.target && (ev.target.closest ? ev.target.closest('.pkFlip') : null);
      if(!card) return;
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        toggleFlip(card);
      }
    });
  }

  function renderCards(items){
    if(!cardsCarousel) return;
    try{ cardsCarousel.removeAttribute('data-infinite'); }catch(_eInf){}
    cardsCarousel.innerHTML = '';
    for(var i=0;i<(items||[]).length;i++){
      var it = items[i] || {};

      var slide = document.createElement('div');
      slide.className = 'cardsSlide';

      var inner = document.createElement('div');
      inner.className = 'cardsSlideInner';

      var card = document.createElement('div');
      card.className = 'cardsSlideCard pkFlip';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-pressed','false');

      var flip = document.createElement('div');
      flip.className = 'pkFlipInner';

      var front = document.createElement('div');
      front.className = 'pkFace pkFront';

      var img = document.createElement('img');
      img.className = 'bg';
      var rectSrc = it.bg || '';
      var fullSrc = rectSrc.indexOf('/cards_rect/') !== -1 ? rectSrc.replace('/cards_rect/','/cards/') : rectSrc;
      img.setAttribute('data-src-rect', rectSrc);
      img.setAttribute('data-src-full', fullSrc);
      img.src = window.PK.withV ? window.PK.withV(rectSrc) : rectSrc;
      img.onerror = function(){
        var tried1 = this.getAttribute('data-fallback') === '1';
        if(!tried1){
          this.setAttribute('data-fallback','1');
          var next = this.getAttribute('data-src-full') || '';
          if(next && next !== this.src){
            this.src = window.PK.withV ? window.PK.withV(next) : next;
            return;
          }
        }
        if(this.getAttribute('data-fallback2') === '1') return;
        this.setAttribute('data-fallback2','1');
        if(CURRENT_SET && CURRENT_COVER){
          var coverRect = pathForSet(CURRENT_SET, 'cards_rect/' + CURRENT_COVER);
          this.src = window.PK.withV ? window.PK.withV(coverRect) : coverRect;
        }
      };
      img.alt = '';

      // VRAAGTEKST hoort op de index-kaart (overlay), niet eronder.
      // (Uitleg heeft z'n eigen sheet.)
      front.appendChild(img);

      var frontText = (it && (it.q || it.voorkant)) ? (it.q || it.voorkant) : '';
      if(frontText){
        var q = document.createElement('div');
        q.className = 'cardsSlideQ';
        var qSpan = document.createElement('span');
        qSpan.className = 'cardsSlideQText';
        qSpan.textContent = safeText(frontText);
        q.appendChild(qSpan);
        front.appendChild(q);
      }

      var back = document.createElement('div');
      back.className = 'pkFace pkBack';

      var backMode = CURRENT_BACK_MODE || 'mirror';
      if(backMode !== 'none'){
        var backSrc = '';
        var backSrcRect = '';
        var mirrorBack = (backMode === 'mirror');

        if(backMode === 'cover'){
          backSrc = pathForSet(CURRENT_SET, 'cards/' + CURRENT_COVER);
          backSrcRect = pathForSet(CURRENT_SET, 'cards_rect/' + CURRENT_COVER);
          var backImg = document.createElement('img');
          backImg.className = 'bg pkBackImg';
          backImg.src = window.PK.withV ? window.PK.withV(backSrcRect) : backSrcRect;
          backImg.onerror = function(){
            this.onerror = null;
            this.src = window.PK.withV ? window.PK.withV(backSrc) : backSrc;
          };
          backImg.alt = '';
          back.appendChild(backImg);
        }else{
          // mirror (default): gebruik dezelfde kaart als voorkant
          backSrc = it.bg || (it.theme ? cardUrl(it.theme) : '');
          backSrcRect = '';
          if(backSrc.indexOf('/cards_rect/') !== -1){
            backSrcRect = backSrc.replace('/cards_rect/','/cards/');
          }else if(backSrc.indexOf('/cards/') !== -1){
            backSrcRect = backSrc.replace('/cards/','/cards_rect/');
          }

          var backImg2 = document.createElement('img');
          backImg2.className = 'bg pkBackImg' + (mirrorBack ? ' is-mirror' : '');
          backImg2.src = window.PK.withV ? window.PK.withV(backSrc) : backSrc;
          if(backSrcRect){
            backImg2.onerror = function(){
              this.onerror = null;
              this.src = window.PK.withV ? window.PK.withV(backSrcRect) : backSrcRect;
            };
          }
          backImg2.alt = '';
          back.appendChild(backImg2);
        }
      }

      var backText = (it && (it.back || it.achterkant)) ? (it.back || it.achterkant) : '';
      if(backText){
        var bt = document.createElement('div');
        bt.className = 'cardsSlideBackText';
        var btSpan = document.createElement('span');
        btSpan.className = 'cardsSlideBackTextInner';
        btSpan.textContent = safeText(backText);
        bt.appendChild(btSpan);
        back.appendChild(bt);
      }

      flip.appendChild(front);
      flip.appendChild(back);
      card.appendChild(flip);
      inner.appendChild(card);
      slide.appendChild(inner);
      cardsCarousel.appendChild(slide);
    }
    // Infinite loop (clone first/last)
    enableInfiniteCarousel(cardsCarousel, 'cardsSlide');
    ensureFlipHandlers();
    __activeCarouselIdx = 0;
    resetAllFlippedCards();
    playCardsPageIntro();
    // Tint direct laten meekleuren met de eerste kaart.
    window.setTimeout(function(){ setActiveTintByIndex(0); }, 0);
    // Houd de sheet compact zolang alleen de kaart zichtbaar is.
    window.setTimeout(function(){
      syncHelpSheetMaxH();
      measureAndSetCompactH();
    }, 0);
  }

  // -----------------------------
  // Achtergrond-tint laten meekleuren met actieve kaart
  // -----------------------------
  var __tintCache = {}; // svgUrl -> "r,g,b" (CSS-ready)
  var __tintRgbCache = {}; // svgUrl -> {r,g,b} (raw)
  var __tintCanvas = null;
  var __tintCtx = null;
  var __lastTintIdx = -1;
  // Voorkom race-conditions bij snelle mode-switch of scroll.
  // Elke tint-berekening krijgt een oplopend request-id; alleen de laatste mag toepassen.
  var __tintReqId = 0;

  // Bepaal dominante kleur op basis van pixels (visueel dominant),
  // zodat de achtergrond echt meeloopt met de grootste kleurvlakken.
  // Werkt met same-origin SVG's (onze sets).
  function getDominantRgbFromSvgUrl(svgUrl){
    return new Promise(function(resolve){
      if(!svgUrl) return resolve(null);
      if(__tintRgbCache[svgUrl]) return resolve(__tintRgbCache[svgUrl]);

      try{
        if(!__tintCanvas){
          __tintCanvas = document.createElement('canvas');
          __tintCanvas.width = 64;
          __tintCanvas.height = 64;
          __tintCtx = __tintCanvas.getContext('2d', { willReadFrequently: true });
        }
      }catch(_e){
        return resolve(null);
      }

      var img = new Image();
      // same-origin; als dit ooit anders wordt, dan faalt canvas-sampling.
      img.onload = function(){
        try{
          __tintCtx.clearRect(0,0,64,64);
          __tintCtx.drawImage(img, 0, 0, 64, 64);
          var data = __tintCtx.getImageData(0,0,64,64).data;

          // quantize om snelheid te houden
          var counts = {};
          var bestKey = null;
          var bestN = 0;
          for(var i=0;i<data.length;i+=4){
            var a = data[i+3];
            if(a < 32) continue;
            var r = data[i], g = data[i+1], b = data[i+2];
            // ignore near-white/near-black
            if(r>245 && g>245 && b>245) continue;
            if(r<12 && g<12 && b<12) continue;
            // 5-bit quantization
            var rq = (r>>3)<<3;
            var gq = (g>>3)<<3;
            var bq = (b>>3)<<3;
            var key = rq+','+gq+','+bq;
            var n = (counts[key]||0) + 1;
            counts[key] = n;
            if(n > bestN){ bestN = n; bestKey = key; }
          }
          if(!bestKey) return resolve(null);
          var parts = bestKey.split(',');
          var rgb = { r: parseInt(parts[0],10), g: parseInt(parts[1],10), b: parseInt(parts[2],10) };
          __tintRgbCache[svgUrl] = rgb;
          resolve(rgb);
        }catch(_e2){
          resolve(null);
        }
      };
      img.onerror = function(){ resolve(null); };
      img.src = svgUrl;
    });
  }
  // Zet zowel de actieve achtergrondkleur (mode-afhankelijk) als de originele
  // dominante 'hue' kleur. In dark mode wordt --activeTintRgb donkerder gemaakt
  // (zelfde hue), maar voor de grote zachte 'meekleur-blob' willen we juist
  // de originele dominante kleur beschikbaar houden.
  function setCssTint(bgRgbCsv, hueRgbCsv){
    try{
      document.documentElement.style.setProperty('--activeTintRgb', bgRgbCsv || '255, 255, 255');
      document.documentElement.style.setProperty('--activeHueRgb', hueRgbCsv || bgRgbCsv || '255, 255, 255');
      // Backward compat (oude css gebruikte alpha). Niet meer leidend.
      document.documentElement.style.setProperty('--activeTintA','1');
    }catch(_e){}
  }

  // Kleine HSL helper (voor "donker maar kleurig")
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var h, s, l = (max+min)/2;
    if(max===min){ h=0; s=0; }
    else{
      var d = max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g<b ? 6 : 0); break;
        case g: h = (b-r)/d + 2; break;
        default: h = (r-g)/d + 4; break;
      }
      h /= 6;
    }
    return {h:h, s:s, l:l};
  }
  function hslToRgb(h,s,l){
    function hue2rgb(p,q,t){
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p + (q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    }
    var r,g,b;
    if(s===0){ r=g=b=l; }
    else{
      var q = l < 0.5 ? l*(1+s) : l + s - l*s;
      var p = 2*l - q;
      r = hue2rgb(p,q,h + 1/3);
      g = hue2rgb(p,q,h);
      b = hue2rgb(p,q,h - 1/3);
    }
    return {r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255)};
  }

  function tintFromDominantRgb(rgb, mode){
    if(!rgb) return null;
    var out;
    if((mode || 'light') === 'dark'){
      var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      var s = Math.max(0.34, Math.min(0.70, hsl.s * 1.10));
      var l = Math.max(0.28, Math.min(0.36, hsl.l * 0.50 + 0.14));
      out = hslToRgb(hsl.h, s, l);
    }else{
      var k = 0.82;
      out = {
        r: Math.round(domSafe(rgb.r)*(1-k) + 255*k),
        g: Math.round(domSafe(rgb.g)*(1-k) + 255*k),
        b: Math.round(domSafe(rgb.b)*(1-k) + 255*k)
      };
    }
    return {
      bgCsv: out.r + ', ' + out.g + ', ' + out.b,
      hueCsv: rgb.r + ', ' + rgb.g + ', ' + rgb.b
    };
  }

  function domSafe(v){
    v = parseInt(v, 10);
    if(!isFinite(v)) return 255;
    return Math.max(0, Math.min(255, v));
  }

  function refreshActiveTintForContrast(){
    var idx = getActiveCardIndex ? getActiveCardIndex() : 0;
    var it = (ITEMS && ITEMS[idx]) ? ITEMS[idx] : null;
    if(!it || !it.bg) return;
    var url = window.PK.withV ? window.PK.withV(it.bg) : it.bg;
    var mode = ((CONTRAST || 'light') === 'dark') ? 'dark' : 'light';
    if(__tintRgbCache[url]){
      var tint = tintFromDominantRgb(__tintRgbCache[url], mode);
      if(tint) setCssTint(tint.bgCsv, tint.hueCsv);
      return;
    }
    var cacheKey = url + '|' + mode;
    var cached = __tintCache[cacheKey];
    if(!cached) return;
    if(String(cached).indexOf('|') > -1){
      var parts = String(cached).split('|');
      setCssTint(parts[0], parts[1] || parts[0]);
    }else{
      setCssTint(cached, cached);
    }
  }

  function setActiveTintByIndex(idx){
    idx = Math.max(0, idx|0);
    if(idx === __lastTintIdx) return;
    __lastTintIdx = idx;
    var contrastAtCall = ((CONTRAST || 'light') === 'dark') ? 'dark' : 'light';
    var reqId = ++__tintReqId;
    var it = (ITEMS && ITEMS[idx]) ? ITEMS[idx] : null;
    if(!it || !it.bg){ setCssTint('255, 255, 255'); return; }
    var url = window.PK.withV ? window.PK.withV(it.bg) : it.bg;

    // cache per modus
    var cacheKey = url + '|' + contrastAtCall;
    if(__tintCache[cacheKey]){
      var cached = __tintCache[cacheKey];
      // cache kan "bg|hue" bevatten. Oud cacheformaat is alleen "bg".
      if(String(cached).indexOf('|')>-1){
        var parts0 = String(cached).split('|');
        setCssTint(parts0[0], parts0[1] || parts0[0]);
      }else{
        setCssTint(cached, cached);
      }
      return;
    }

    // 1) Visuele dominant via canvas-sampling (meest betrouwbaar)
    getDominantRgbFromSvgUrl(url).then(function(dom){
      if(!dom){
        // 2) Fallback: tekst-parsing
        if(window.PK.getText && window.PK.dominantColorFromSvgText){
          return window.PK.getText(url).then(function(txt){
            var d2 = window.PK.dominantColorFromSvgText(txt);
            return d2 || null;
          });
        }
        return null;
      }
      return dom;
    }).then(function(dom2){
      if(!dom2){
        // 3) Laatste fallback (Safari/iOS kan soms geen SVG->canvas dominantie pakken)
        //    Gebruik dan de themakleur, zodat de achtergrond ALTIJD meekleurt.
        var fallback = {
          verkennen:  {r:170,g:195,b:123},
          duiden:     {r:120,g:170,b:150},
          verbinden:  {r:150,g:205,b:195},
          verhelderen:{r: 48,g: 96,b:136},
          vertragen:  {r:120,g:200,b:205},
          bewegen:    {r:242,g:153,b: 74}
        };
        var th = it.theme;
        dom2 = fallback[th] || null;
        if(!dom2) return;
      }
      var tint;
      // Alleen toepassen als dit nog de laatste aanvraag is.
      if(reqId !== __tintReqId) return;
      tint = tintFromDominantRgb(dom2, contrastAtCall);
      if(!tint) return;
      var bgCsv = tint.bgCsv;
      var hueCsv = tint.hueCsv;
      __tintCache[cacheKey] = bgCsv + '|' + hueCsv;
      // Nogmaals checken: voorkom dat een late promise de huidige modus overschrijft.
      if(reqId !== __tintReqId) return;
      if(((CONTRAST || 'light') === 'dark' ? 'dark' : 'light') !== contrastAtCall) return;
      setCssTint(bgCsv, hueCsv);
    });
  }

  function goToCardIndex(idx){
    if(!cardsCarousel) return;
    var slides = cardsCarousel.children || [];
    if(!slides.length) return;
    var hasClones = slides[0] && slides[0].classList && slides[0].classList.contains('is-clone');
    var target = idx|0;
    if(hasClones) target = target + 1;
    target = Math.max(0, Math.min(slides.length-1, target));
    var s = slides[target];
    var x = s ? (s.offsetLeft || 0) : 0;
    try{ cardsCarousel.scrollTo({ left: x, behavior: 'smooth' }); }
    catch(_e){ cardsCarousel.scrollLeft = x; }
  }

  function getActiveCardIndex(){
    if(!cardsCarousel) return 0;
    var slides = cardsCarousel.children || [];
    if(!slides.length) return 0;
    var center = (cardsCarousel.scrollLeft || 0) + (cardsCarousel.clientWidth || 0) / 2;
    var bestIdx = 0;
    var bestDist = 1e18;
    for(var i=0;i<slides.length;i++){
      var el = slides[i];
      var mid = (el.offsetLeft || 0) + (el.offsetWidth || 0) / 2;
      var d = Math.abs(mid - center);
      if(d < bestDist){ bestDist = d; bestIdx = i; }
    }

    // Als we clones gebruiken: vertaal naar echte index (0..n-1)
    var hasClones = slides[0] && slides[0].classList && slides[0].classList.contains('is-clone');
    if(hasClones && slides.length >= 3){
      var nReal = slides.length - 2;
      if(bestIdx == 0) return nReal - 1;
      if(bestIdx == slides.length - 1) return 0;
      return Math.max(0, Math.min(nReal-1, bestIdx - 1));
    }
    return bestIdx;
  }

  // Update tint terwijl je swipet/scrollt (gedebounced)
  if(cardsCarousel){
    var __tintRaf = 0;
    function scheduleTintUpdate(){
      if(__tintRaf) return;
      __tintRaf = window.requestAnimationFrame(function(){
        __tintRaf = 0;
        var idx = getActiveCardIndex();
        if(idx !== __activeCarouselIdx){
          __activeCarouselIdx = idx;
          resetAllFlippedCards();
        }
        setActiveTintByIndex(idx);
        // Belangrijk: NIET continu de uitleg-sheet 'her-uitlijnen' tijdens horizontaal swipen.
        // Dat gaf op iOS soms een zichtbaar 'spring'-effect (inhoud schiet omhoog/omlaag).
        // We doen align alleen bij openen en bij resize/orientation.
      });
    }
    cardsCarousel.addEventListener('scroll', scheduleTintUpdate, { passive: true });
    window.addEventListener('resize', function(){
      window.setTimeout(function(){
        var idx = getActiveCardIndex();
        setActiveTintByIndex(idx);
        syncHelpSheetMaxH();
        measureAndSetCompactH();
        if(sheetMode === 'help' || isInfoOpen()){
          setCurH(syncHelpSheetMaxH() || getMaxH());
          window.requestAnimationFrame(function(){
            try{ alignInfoSheetToMainCard(); }catch(_eAlign){}
          });
        }
      }, 30);
    });
    window.addEventListener('orientationchange', function(){
      window.setTimeout(function(){
        syncHelpSheetMaxH();
        measureAndSetCompactH();
        if(sheetMode === 'help' || isInfoOpen()){
          setCurH(syncHelpSheetMaxH() || getMaxH());
          window.requestAnimationFrame(function(){
            try{ alignInfoSheetToMainCard(); }catch(_eAlign){}
          });
        }
      }, 60);
    });
  }

  // Landscape (telefoon) is nu pure CSS: we tonen dezelfde carrousel fullscreen.
  // Hierdoor klopt de actieve kaart altijd en blijft typografie identiek.

  // --- Sheet hoogte helpers (compact kaarten -> max uitleg) ---
  function getCssPx(el, name, fallback){
    try{
      var cs = window.getComputedStyle(el || document.documentElement);
      var v = cs.getPropertyValue(name);
      var n = parseFloat(String(v || '').replace('px',''));
      return isNaN(n) ? fallback : n;
    }catch(_e){ return fallback; }
  }

  function getSheetMaxH(){
    return getCssPx(
      infoSheet,
      '--sheetMaxH',
      syncHelpSheetMaxH() || getCssPx(document.documentElement, '--sheetPageH', 520) || 520
    );
  }

  function getSheetCurH(){
    return getCssPx(infoSheet, '--sheetCurH', getCssPx(infoSheet, '--sheetCompactH', 420));
  }

  function setSheetCurH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCurH', Math.max(240, px) + 'px');
  }

  function setSheetCompactH(px){
    if(!infoSheet) return;
    infoSheet.style.setProperty('--sheetCompactH', Math.max(240, px) + 'px');
    setSheetCurH(px);
  }

  function measureAndSetCompactH(){
    if(!infoSheet || !sheetViewport) return;
    syncHelpSheetMaxH();
    // Neem de eerste slide als referentie (kaart + kleine marge)
    var first = cardsCarousel ? cardsCarousel.querySelector('.cardsSlideInner') : null;
    if(!first || !first.getBoundingClientRect) return;
    var rect = first.getBoundingClientRect();
    var handleH = 18;
    // zo min mogelijk witruimte: alleen een klein beetje "adem" onder de kaart
    var pad = 8;
    var compact = Math.round(rect.height + handleH + pad);
    var maxH = getSheetMaxH();
    compact = Math.min(compact, maxH);
    setSheetCompactH(compact);
  }



  // Drag handle (Google Maps-achtig): omhoog = open, omlaag = peek
  function initDrag(){
    if(!handle || !infoSheet) return;

    var dragging = false;
    var startY = 0;
    var startX = 0;
    var dy = 0;
    var dx = 0;
    var raf = 0;
    var startTime = 0;
    var baseSheetY = 0;
    var baseStackY = 0;
    var baseCurH = 0;
    var lastMoveT = 0;
    var lastMoveY = 0;
    var vY = 0; // gesmoothde eindsnelheid (px/ms)
    var cancelled = false;

    // In dit ontwerp is 'peek' gelijk aan volledig dicht (translateY(100%)).
    function getPeekPx(){ return 0; }

    function getY(ev){
      if(!ev) return 0;
      if(ev.touches && ev.touches.length) return ev.touches[0].clientY;
      if(typeof ev.clientY === 'number') return ev.clientY;
      return 0;
    }

    function getX(ev){
      if(!ev) return 0;
      if(ev.touches && ev.touches.length) return ev.touches[0].clientX;
      if(typeof ev.clientX === 'number') return ev.clientX;
      return 0;
    }

    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

    // iOS-achtige weerstand bij overdrag
    function rubberBand(dist){
      var c = 160;
      var d = Math.abs(dist);
      var r = (c * d) / (c + d);
      return (dist < 0) ? -r : r;
    }

    function currentTranslateY(el){
      try{
        var st = window.getComputedStyle(el);
        var tr = st.transform || st.webkitTransform || 'none';
        if(!tr || tr === 'none') return 0;
        // matrix(a,b,c,d,tx,ty)
        var m = tr.match(/matrix\(([^)]+)\)/);
        if(m && m[1]){
          var parts = m[1].split(',');
          var ty = parseFloat(parts[5] || '0');
          return isNaN(ty) ? 0 : ty;
        }
        var m3 = tr.match(/matrix3d\(([^)]+)\)/);
        if(m3 && m3[1]){
          var p3 = m3[1].split(',');
          var ty3 = parseFloat(p3[13] || '0');
          return isNaN(ty3) ? 0 : ty3;
        }
      }catch(_e){}
      return 0;
    }

    function applySheet(y){
      infoSheet.style.transform = 'translate3d(0,' + y + 'px,0)';
    }

    function applyCurH(h){
      setSheetCurH(h);
    }

    function applyStack(y){
      if(!sheetStack) return;
      sheetStack.style.transform = 'translate3d(0,' + y + 'px,0)';
    }

    function pageH(){
      // Pagina's zijn altijd --sheetMaxH hoog (stabiel), viewport kan kleiner zijn.
      return getSheetMaxH();
    }

    function setInteractiveByStack(stackY){
      // stackY == 0 => cards boven, stackY == -pageH => help boven
      var h = pageH();
      var which = (stackY <= -h * 0.5) ? 'help' : 'cards';
      setTopPage(which);
    }

    function onDown(ev){
      var t = ev && ev.target;
      var inCarousel = !!(t && t.closest && (t.closest('.infoCarousel') || t.closest('.cardsCarousel')));
      var inHandle = !!(t && t.closest && t.closest('.sheetHandle'));
      var inClose = !!(t && t.closest && t.closest('.infoClose'));
      if(inClose) return;
      if(inCarousel && !inHandle) return;

      dragging = true;
      cancelled = false;
      startX = getX(ev);
      startY = getY(ev);
      dy = 0;
      dx = 0;
      startTime = Date.now();
      lastMoveT = startTime;
      lastMoveY = startY;
      vY = 0;

      // base positions
      baseSheetY = currentTranslateY(infoSheet);
      baseStackY = sheetStack ? currentTranslateY(sheetStack) : 0;
      baseCurH = getSheetCurH();

      // kill transitions during drag
      infoSheet.style.transition = 'none';
      if(sheetStack) sheetStack.style.transition = 'none';

      // Tijdens drag: altijd achtergrond locken, anders krijg je "dubbel scroll".
      lockBackgroundScroll(true);

      if(ev && ev.preventDefault) ev.preventDefault();

      window.addEventListener('touchmove', onMove, { passive:false });
      window.addEventListener('touchend', onUp, { passive:true });
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }

    function onMove(ev){
      if(!dragging || cancelled) return;

      var y = getY(ev);
      var x = getX(ev);
      dy = (y - startY);
      dx = (x - startX);

      // horizontaal? laat de carrousel doen
      if(Math.abs(dx) > Math.abs(dy) * 1.15){
        cancelled = true;
        onUp();
        return;
      }

      var sheetH = infoSheet.getBoundingClientRect ? infoSheet.getBoundingClientRect().height : 520;
      var peekY = Math.max(0, sheetH - getPeekPx());
      var openY = 0;

      // Alleen sheet drag (geen pagina-wissel via drag)
      var targetY = baseSheetY + dy;
      if(targetY < openY){
        targetY = openY + rubberBand(targetY - openY);
        infoCard && infoCard.classList && infoCard.classList.add('pkOverTop');
      }else{
        infoCard && infoCard.classList && infoCard.classList.remove('pkOverTop');
      }
      if(targetY > peekY){
        targetY = peekY + rubberBand(targetY - peekY);
        infoCard && infoCard.classList && infoCard.classList.add('pkOverBottom');
      }else{
        infoCard && infoCard.classList && infoCard.classList.remove('pkOverBottom');
      }

      // velocity tracking (smooth)
      var now = Date.now();
      var dtv = now - lastMoveT;
      if(dtv > 0){
        var inst = (y - lastMoveY) / dtv;
        vY = (vY * 0.8) + (inst * 0.2);
        lastMoveY = y;
        lastMoveT = now;
      }

      if(ev && ev.preventDefault) ev.preventDefault();

      if(!raf){
        raf = window.requestAnimationFrame(function(){
          raf = 0;
          applySheet(targetY);
        });
      }
    }

    function onUp(){
      if(!dragging) return;
      dragging = false;

      // cleanup listeners
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      // Google Maps-achtig rubber-band gedrag:
      // - omhoog trekken geeft alleen weerstand en veert altijd terug naar open
      // - omlaag trekken kan sluiten (threshold of snelle swipe)
      var sheetH = infoSheet.getBoundingClientRect ? infoSheet.getBoundingClientRect().height : 520;
      var peekY = Math.max(0, sheetH - getPeekPx());
      var openY = 0;

      var sheetY = currentTranslateY(infoSheet);
      var v = vY; // px/ms

      var closeThreshold = 90; // px omlaag voordat we sluiten
      var sheetTargetY = openY;
      if(sheetY > closeThreshold || v > 0.85){
        sheetTargetY = peekY;
      }

      infoSheet.style.transition = 'transform 280ms cubic-bezier(0.2, 0.85, 0.2, 1)';
      applySheet(sheetTargetY);

      window.setTimeout(function(){
        infoSheet.style.transition = '';
        infoSheet.style.transform = '';
        if(infoCard && infoCard.classList){
          infoCard.classList.remove('pkOverTop');
          infoCard.classList.remove('pkOverBottom');
        }
        // Als we open blijven: niets resetten/alignen (voorkomt 'jump').
        // Als we sluiten: normale close-flow.
        if(sheetTargetY === peekY) peekInfo();
      }, 320);
    }

    // Drag op handle en op hele card (behalve horizontale carrousel)
    handle.addEventListener('touchstart', onDown, { passive:false });
    handle.addEventListener('pointerdown', onDown);
    if(infoCard){
      infoCard.addEventListener('touchstart', onDown, { passive:false });
      infoCard.addEventListener('pointerdown', onDown);
    }

    // Tap op handle toggles open/peek
    handle.addEventListener('click', function(){
      if(isInfoOpen()) peekInfo(); else openInfo();
    });
  }
  // Init: content laden. Sheet is standaard volledig dicht en opent alleen via info-knop.
  if(infoSheet){
    // start altijd volledig dicht; alleen openen via info-knop
    infoSheet.hidden = true;
    syncHelpSheetMaxH();
    loadAndRender();
    // Kaartenpagina bestaat altijd: bouw de carrousel zodra items geladen zijn.
    // (Geen dynamisch mounten na interactie.)
    window.setTimeout(function(){
      if(cardsCarousel && !cardsCarousel.children.length && ITEMS && ITEMS.length){
        renderCards(ITEMS);
      }
    }, 260);
    // Overlay click = sluit volledig
    if(infoOverlay) infoOverlay.onclick = peekInfo;
    if(infoClose){
      infoClose.onclick = function(ev){
        if(ev && ev.preventDefault) ev.preventDefault();
        if(ev && ev.stopPropagation) ev.stopPropagation();
        peekInfo();
      };
    }
    // Gestures activeren (Google Maps-achtig) zodra de sheet wordt geopend.
    // (We initialiseren hier alvast zodat de handle meteen werkt als de sheet open is.)
    try{ initDrag(); window.__pkInfoDragInited = true; }catch(_e){}

  // Toetsenbordnavigatie: pijltoetsen door kaarten-carrousel
  document.addEventListener('keydown', function(ev) {
    var key = ev && (ev.key || '');
    var code = ev && (ev.keyCode || 0);
    if (key === 'ArrowLeft' || code === 37) {
      ev.preventDefault();
      var cur = getActiveCardIndex ? getActiveCardIndex() : 0;
      goToCardIndex(cur - 1);
    } else if (key === 'ArrowRight' || code === 39) {
      ev.preventDefault();
      var cur2 = getActiveCardIndex ? getActiveCardIndex() : 0;
      goToCardIndex(cur2 + 1);
    }
  });

  }
}
