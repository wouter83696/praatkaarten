// Praatkaartjes – entrypoint
(function(){
  'use strict';
  var w = window;
  var doc = document;
  var page = (doc.body && doc.body.getAttribute('data-page')) ? doc.body.getAttribute('data-page') : '';

  function loadScript(src){
    return new Promise(function(resolve){
      var s = doc.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = function(){ resolve({ ok: true, src: src }); };
      s.onerror = function(){
        try{ console.error('[PK] Script load failed:', src); }catch(_e){}
        resolve({ ok: false, src: src });
      };
      doc.head.appendChild(s);
    });
  }

  function loadScripts(list){
    return list.reduce(function(p, src){
      if(!src) return p;
      return p.then(function(){ return loadScript(src); });
    }, Promise.resolve());
  }

  // Altijd relatieve basis (map-onafhankelijk)
  var base = '.';
  try{
    var pth = (w.location && w.location.pathname) ? w.location.pathname : '';
    if(pth.indexOf('/uitleg/') !== -1 || pth.indexOf('/kaarten/') !== -1){
      base = '..';
    }
  }catch(_eBase){}

  function p(path){
    if(!path) return path;
    if(base === '.' || base === '') return path;
    return base.replace(/\/$/,'') + '/' + path.replace(/^\./,'').replace(/^\//,'');
  }

  var pathsSrc = p('./js/core/paths.js');
  var configSrc = p('./js/core/config.js');

  var common = [
    p('./js/core/net.js'),
    p('./js/core/query.js'),
    p('./js/core/color.js'),
    p('./js/core/ui.js'),
    p('./js/components/bottomSheet.js'),
    p('./js/components/menu.js'),
    p('./js/components/cardRenderer.js'),
    p('./js/components/indexBackground.js'),
    p('./js/shell/initShell.js'),
    p('./js/templates/index.js')
  ];

  var pageScript = null;
  if(page === 'grid') pageScript = p('./js/pages/grid.page.js');
  if(page === 'kaarten') pageScript = p('./js/pages/kaarten.page.js');

  // 1) probeer paths.js, anders config.js (fallback)
  loadScript(pathsSrc).then(function(res){
    if(!res || !res.ok){
      return loadScript(configSrc);
    }
    return res;
  }).then(function(){
    return loadScripts(common.concat([pageScript]));
  }).then(function(){
    try{
      if(window.PK && PK.DEBUG && console && console.log){
        console.log('[DEBUG] page', page);
        console.log('[DEBUG] PATHS', window.PATHS || (window.PK && PK.PATHS));
      }
    }catch(_e){}

    if(window.PK && PK.shell && PK.shell.initShell){
      PK.shell.initShell();
    }

    if(window.PK && PK.pages){
      if(page === 'grid' && PK.pages.initGrid) PK.pages.initGrid();
      if(page === 'kaarten' && PK.pages.initKaarten) PK.pages.initKaarten();
    }

    // Legacy fallback: als nieuwe page modules ontbreken, laad oude scripts.
    if(page === 'grid' && (!window.PK || !PK.pages || !PK.pages.initGrid)){
      return loadScripts([p('./js/pages/sets.js')]);
    }
    if(page === 'kaarten' && (!window.PK || !PK.pages || !PK.pages.initKaarten)){
      return loadScripts([p('./js/pages/index.js')]);
    }
  });
})();
