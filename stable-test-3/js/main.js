// Praatkaartjes – centrale bootstrap
(function(){
  'use strict';
  var w = window;
  var doc = document;
  var PK = w.PK = w.PK || {};
  var ASSET_V = '0.67';
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

  function basePath(){
    if(pathName.indexOf('/kaarten/') !== -1 || pathName.indexOf('/uitleg/') !== -1) return '..';
    return '.';
  }
  var base = basePath();

  function withV(src){
    if(!src) return src;
    if(/[?&]v=/.test(src)) return src;
    return src + (src.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(ASSET_V);
  }

  function p(rel){
    if(!rel) return rel;
    var clean = String(rel).replace(/^\./,'').replace(/^\//,'');
    return base === '.' ? ('./' + clean) : ('../' + clean);
  }

  function ensureFallbackCore(){
    if(!PK.PATHS){
      PK.PATHS = {
        base: base,
        setsIndex: base + '/sets/index.json',
        setsDir: base + '/sets',
        assetsDir: base + '/assets',
        gridPage: base + '/index.html',
        cardsPage: base + '/kaarten/'
      };
    }
    if(typeof PK.withV !== 'function'){
      PK.VERSION = PK.VERSION || ASSET_V;
      PK.withV = function(url){
        return String(url || '') + (String(url || '').indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(PK.VERSION);
      };
    }
    if(typeof PK.pathForSet !== 'function'){
      PK.pathForSet = function(setId, rel){
        var s = String(setId || '').replace(/^\s+|\s+$/g,'') || 'samenwerken';
        var r = String(rel || '').replace(/^\//,'');
        return PK.PATHS.setsDir + '/' + encodeURIComponent(s) + '/' + r;
      };
    }
    if(typeof PK.pathForAsset !== 'function'){
      PK.pathForAsset = function(rel){
        var r = String(rel || '').replace(/^\//,'');
        var dir = PK.PATHS.assetsDir || PK.PATHS.assets || (base + '/assets');
        return dir + '/' + r;
      };
    }
    if(typeof PK.getQueryParam !== 'function'){
      PK.getQueryParam = function(name){
        var s = (w.location && w.location.search) ? String(w.location.search) : '';
        if(s.charAt(0) === '?') s = s.substring(1);
        var parts = s ? s.split('&') : [];
        var i;
        for(i = 0; i < parts.length; i++){
          var kv = parts[i].split('=');
          if(decodeURIComponent(kv[0] || '') === name){
            return decodeURIComponent(kv[1] || '');
          }
        }
        return '';
      };
    }
    if(typeof PK.prettyName !== 'function'){
      PK.prettyName = function(setId){
        var s = String(setId || '').toLowerCase();
        if(s === 'samenwerken') return 'Samen onderzoeken';
        if(!s) return 'Samen onderzoeken';
        return s.charAt(0).toUpperCase() + s.slice(1);
      };
    }
    if(typeof PK.getActiveSet !== 'function'){
      PK.getActiveSet = function(){
        var s = '';
        try{
          s = (PK.state && PK.state.activeSet) ? String(PK.state.activeSet) : '';
        }catch(_eS){ s = ''; }
        s = String(s || '').replace(/^\s+|\s+$/g,'');
        if(s) return s;
        s = String(PK.getQueryParam('set') || PK.getQueryParam('s') || '').replace(/^\s+|\s+$/g,'');
        return s || 'samenwerken';
      };
    }
    if(typeof PK.getText !== 'function'){
      PK.getText = function(url){
        if(!w.fetch) return Promise.reject(new Error('fetch unavailable'));
        return w.fetch(url, { cache: 'no-store' }).then(function(r){
          if(!r || !r.ok) throw new Error('HTTP ' + (r ? r.status : '0') + ' ' + url);
          return r.text();
        });
      };
    }
    if(typeof PK.loadJson !== 'function'){
      PK.loadJson = function(url){
        return PK.getText(url).then(function(t){ return JSON.parse(t); });
      };
    }
    if(typeof PK.getJson !== 'function'){
      PK.getJson = function(url){
        return PK.loadJson(url).catch(function(){ return {}; });
      };
    }
  }

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

  function normalizeScriptUrl(src){
    var raw = String(src || '');
    try{
      if(w.URL){
        return String(new w.URL(raw, doc.baseURI || (w.location && w.location.href) || '').href).replace(/[?].*$/,'');
      }
    }catch(_eUrl){}
    return raw.replace(/[?].*$/,'');
  }

  function isScriptAlreadyLoaded(src){
    var normalized = normalizeScriptUrl(src);
    var scripts = doc.getElementsByTagName('script');
    var i;
    for(i = 0; i < scripts.length; i++){
      var s = scripts[i];
      if(!s || !s.src) continue;
      var current = normalizeScriptUrl(s.src);
      if(current === normalized) return true;
    }
    return false;
  }

  function loadScript(src){
    return new Promise(function(resolve){
      if(!src) return resolve({ ok: true, src: src, skipped: true });
      if(isScriptAlreadyLoaded(src)) return resolve({ ok: true, src: src, existing: true });
      var s = doc.createElement('script');
      s.src = withV(src);
      s.defer = true;
      s.onload = function(){ resolve({ ok: true, src: src }); };
      s.onerror = function(){
        try{ if(w.console && w.console.error) w.console.error('[PK] Script load failed:', src); }catch(_eLog){}
        resolve({ ok: false, src: src });
      };
      doc.head.appendChild(s);
    });
  }

  function loadScripts(list){
    var out = [];
    return list.reduce(function(chain, src){
      return chain.then(function(){
        return loadScript(src).then(function(r){ out.push(r); });
      });
    }, Promise.resolve()).then(function(){
      return out;
    });
  }

  function missingScripts(results){
    var miss = [];
    var i;
    for(i = 0; i < (results || []).length; i++){
      var r = results[i];
      if(r && r.ok === false && r.src) miss.push(r.src);
    }
    return miss;
  }

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
      overlay.hidden = false;
      pill.setAttribute('aria-expanded', 'true');
    }
    function closeMenu(){
      menu.hidden = true;
      overlay.hidden = true;
      pill.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu(){
      if(menu.hidden) openMenu();
      else closeMenu();
    }

    pill.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
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

  function validateRender(results){
    var miss = missingScripts(results);
    w.setTimeout(function(){
      if(page === 'kaarten'){
        var car = doc.getElementById('mainCarousel');
        var hasCards = !!(car && car.children && car.children.length);
        if(!hasCards){
          if(miss.length){
            showBootError('Kaarten konden niet worden geladen.', 'Missende scripts: ' + miss.join(', '));
          }else if(lastRuntimeError){
            showBootError('Kaarten konden niet worden geladen.', 'Scriptfout: ' + lastRuntimeError);
          }else{
            showBootError('Kaarten konden niet worden geladen.', 'Controleer set-bestanden en scriptfouten.');
          }
        }
      }else if(page === 'grid'){
        var setsGrid = doc.getElementById('setsGrid');
        var setsCarousel = doc.getElementById('setsCarousel');
        var hasGrid = !!(setsGrid && setsGrid.children && setsGrid.children.length);
        var hasHero = !!(setsCarousel && setsCarousel.children && setsCarousel.children.length);
        if(!hasGrid && !hasHero && miss.length){
          showBootError('Kaartensets konden niet worden geladen.', 'Missende scripts: ' + miss.join(', '));
        }
      }
    }, 1400);
  }

  function scriptPlan(){
    var commonCore = [
      p('js/core/net.js'),
      p('js/core/query.js'),
      p('js/core/state.js'),
      p('js/core/color.js'),
      p('js/core/ui.js')
    ];
    var shell = [
      p('js/components/bottomSheet.js'),
      p('js/components/menu.js'),
      p('js/components/cardRenderer.js'),
      p('js/shell/initShell.js'),
      p('js/templates/index.js')
    ];
    if(page === 'grid'){
      return commonCore.concat(shell, [p('js/components/gridBackground.js'), p('js/pages/grid.page.js')]);
    }
    if(page === 'kaarten'){
      return commonCore.concat(shell, [p('js/components/cardsBackground.js'), p('js/pages/kaarten.page.js')]);
    }
    if(page === 'uitleg'){
      return commonCore.concat([p('js/pages/uitleg.js')]);
    }
    return [];
  }

  ensureFallbackCore();

  loadScript(p('js/core/paths.js')).then(function(res){
    if(res && res.ok) return res;
    return loadScript(p('js/core/config.js'));
  }).then(function(){
    ensureFallbackCore();
    return loadScripts(scriptPlan());
  }).then(function(results){
    ensureFallbackCore();
    bindStaticMenuFallback();
    initCurrentPage();
    validateRender(results || []);
  }).catch(function(e){
    bindStaticMenuFallback(true);
    showBootError('Bootstrap mislukte.', (e && e.message) ? e.message : '');
  });
})();
