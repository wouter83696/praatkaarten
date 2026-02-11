// Praatkaartjes – UI config helpers (gedeeld)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  function isObj(v){
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  PK.mergeDeep = function(base, override){
    var out = {};
    var k;
    if(isObj(base)){
      for(k in base){
        if(Object.prototype.hasOwnProperty.call(base, k)){
          if(isObj(base[k])) out[k] = PK.mergeDeep(base[k], {});
          else out[k] = base[k];
        }
      }
    }
    if(isObj(override)){
      for(k in override){
        if(Object.prototype.hasOwnProperty.call(override, k)){
          if(isObj(override[k]) && isObj(out[k])){
            out[k] = PK.mergeDeep(out[k], override[k]);
          }else{
            out[k] = override[k];
          }
        }
      }
    }
    return out;
  };

  var DEBUG_UI = false;
  try{
    if(PK.getQueryParam){
      var q = PK.getQueryParam('uiDebug') || PK.getQueryParam('uidbg');
      if(String(q) === '1') DEBUG_UI = true;
    }
    if(!DEBUG_UI && w.localStorage && w.localStorage.getItem){
      DEBUG_UI = (w.localStorage.getItem('pk_ui_debug') === '1');
    }
  }catch(_eDbg){}
  try{ PK.UI_DEBUG = DEBUG_UI; }catch(_eDbg2){}

  function ensureUiWarnings(){
    if(!DEBUG_UI) return null;
    var doc = w.document;
    if(!doc || !doc.body) return null;
    var el = doc.getElementById('uiWarnings');
    if(!el){
      el = doc.createElement('div');
      el.id = 'uiWarnings';
      el.setAttribute('hidden','');
      doc.body.appendChild(el);
    }
    return el;
  }

  PK.uiWarn = function(msg){
    if(w.console && w.console.warn) w.console.warn('[UI]', msg);
    var host = ensureUiWarnings();
    if(!host) return;
    host.removeAttribute('hidden');
    var item = w.document.createElement('div');
    item.className = 'uiWarnItem';
    item.textContent = String(msg || '');
    host.appendChild(item);
    // behoud het klein: max 6 items
    var kids = host.children || [];
    if(kids.length > 6){
      host.removeChild(kids[0]);
    }
  };

  function warn(msg){
    if(PK.uiWarn){ PK.uiWarn(msg); return; }
    if(w.console && w.console.warn) w.console.warn('[UI]', msg);
  }

  PK.validateUiConfig = function(cfg){
    if(!cfg || typeof cfg !== 'object') return false;
    var ok = true;
    var allowed = { menu:1, sheet:1, index:1, vars:1, themeCss:1 };
    for(var k in cfg){
      if(Object.prototype.hasOwnProperty.call(cfg, k)){
        if(!allowed[k]){ warn('Onbekende ui-key: ' + k); ok = false; }
      }
    }
    if(cfg.menu){
      if(cfg.menu.showInfo !== undefined && typeof cfg.menu.showInfo !== 'boolean'){ warn('menu.showInfo moet boolean zijn'); ok = false; }
      if(cfg.menu.showShuffle !== undefined && typeof cfg.menu.showShuffle !== 'boolean'){ warn('menu.showShuffle moet boolean zijn'); ok = false; }
      if(cfg.menu.showAllSets !== undefined && typeof cfg.menu.showAllSets !== 'boolean'){ warn('menu.showAllSets moet boolean zijn'); ok = false; }
    }
    if(cfg.sheet){
      if(cfg.sheet.enabled !== undefined && typeof cfg.sheet.enabled !== 'boolean'){ warn('sheet.enabled moet boolean zijn'); ok = false; }
      if(cfg.sheet.defaultMode !== undefined){
        var m = String(cfg.sheet.defaultMode);
        if(m !== 'cards' && m !== 'help'){ warn('sheet.defaultMode moet \"cards\" of \"help\" zijn'); ok = false; }
      }
    }
    if(cfg.index){
      if(cfg.index.layout !== undefined){
        var l = String(cfg.index.layout);
        if(l !== 'carousel' && l !== 'grid' && l !== 'hero-grid' && l !== 'empty'){
          warn('index.layout moet \"carousel\", \"hero-grid\", \"grid\" of \"empty\" zijn');
          ok = false;
        }
      }
      if(cfg.index.gridLimit !== undefined){
        var gl = parseInt(cfg.index.gridLimit, 10);
        if(!(isFinite(gl) && gl >= 0)){
          warn('index.gridLimit moet een getal >= 0 zijn');
          ok = false;
        }
      }
    }
    if(cfg.themeCss !== undefined){
      var t = typeof cfg.themeCss;
      if(!(t === 'boolean' || t === 'string')){ warn('themeCss moet boolean of string zijn'); ok = false; }
    }
    if(cfg.vars !== undefined && (typeof cfg.vars !== 'object' || Array.isArray(cfg.vars))){ warn('vars moet object zijn'); ok = false; }
    return ok;
  };

  function setHidden(el, hidden){
    if(!el) return;
    if(hidden) el.setAttribute('hidden','');
    else el.removeAttribute('hidden');
  }

  function setCssVars(vars){
    if(!vars) return;
    var root = w.document && w.document.documentElement;
    if(!root || !root.style || !root.style.setProperty) return;
    for(var k in vars){
      if(!Object.prototype.hasOwnProperty.call(vars, k)) continue;
      var name = k;
      if(name.indexOf('--') !== 0) name = '--' + name;
      try{ root.style.setProperty(name, String(vars[k])); }catch(_e){}
    }
  }

  function resolveThemeCss(setId, ui){
    if(!ui) return null;
    var css = ui.themeCss;
    if(css === true) css = 'theme.css';
    if(typeof css !== 'string' || !css) return null;
    if(PK.pathForSet) return PK.pathForSet(setId, css);
    var dir = (PK.PATHS && PK.PATHS.setsDir) ? PK.PATHS.setsDir : '.';
    return dir + '/' + encodeURIComponent(setId) + '/' + css.replace(/^\//,'');
  }

  PK.applyUiConfig = function(setId, metaUi, defaults){
    var cfg = PK.mergeDeep(defaults || {}, metaUi || {});
    try{ PK.validateUiConfig && PK.validateUiConfig(cfg); }catch(_eV){}
    var body = w.document && w.document.body;
    if(body && setId){
      try{ body.setAttribute('data-set', setId); }catch(_e0){}
    }

    if(body && cfg.index && cfg.index.layout){
      try{ body.setAttribute('data-index-layout', cfg.index.layout); }catch(_e1){}
    }

    if(cfg.vars) setCssVars(cfg.vars);

    // Menu toggles
    var menuInfoBtn = w.document.getElementById('menuInfoBtn');
    var menuShuffle = w.document.getElementById('menuShuffleToggle');
    var menuAllSets = w.document.getElementById('naarOverzicht');
    var showInfo = !(cfg.menu && cfg.menu.showInfo === false);
    var showShuffle = !(cfg.menu && cfg.menu.showShuffle === false);
    var showAllSets = !(cfg.menu && cfg.menu.showAllSets === false);
    setHidden(menuInfoBtn, !showInfo);
    setHidden(menuShuffle, !showShuffle);
    setHidden(menuAllSets, !showAllSets);

    // Sheet
    var infoSheet = w.document.getElementById('infoSheet');
    var infoOverlay = w.document.getElementById('infoOverlay');
    if(cfg.sheet && cfg.sheet.enabled === false){
      setHidden(infoSheet, true);
      setHidden(infoOverlay, true);
      setHidden(menuInfoBtn, true);
    }

    var mode = cfg.sheet && (cfg.sheet.defaultMode || cfg.sheet.mode);
    if(mode && PK.setSheetMode){
      try{ PK.setSheetMode(mode); }catch(_e2){}
    }

    // Optional per-set CSS
    var cssUrl = resolveThemeCss(setId, cfg);
    var head = w.document && w.document.head;
    var link = w.document && w.document.getElementById('pk-set-theme');
    if(cssUrl && head){
      if(!link){
        link = w.document.createElement('link');
        link.id = 'pk-set-theme';
        link.rel = 'stylesheet';
        head.appendChild(link);
      }
      link.href = PK.withV ? PK.withV(cssUrl) : cssUrl;
    }else if(link && link.parentNode){
      link.parentNode.removeChild(link);
    }

    PK.UI_ACTIVE = cfg;
    return cfg;
  };
})(window);
