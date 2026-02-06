// Praatkaartjes – entrypoint
(function(){
  'use strict';
  var doc = document;
  var page = (doc.body && doc.body.getAttribute('data-page')) ? doc.body.getAttribute('data-page') : '';

  function loadScript(src){
    return new Promise(function(resolve, reject){
      var s = doc.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error('Script load failed: ' + src)); };
      doc.head.appendChild(s);
    });
  }

  function loadScripts(list){
    return list.reduce(function(p, src){
      if(!src) return p;
      return p.then(function(){ return loadScript(src); });
    }, Promise.resolve());
  }

  var base = '.';
  try{
    var cs = doc.currentScript && doc.currentScript.getAttribute('src');
    if(cs && cs.indexOf('/js/main.js') !== -1){
      base = cs.split('/js/main.js')[0] || '.';
    }else if(cs && cs.indexOf('\\/js/main.js') !== -1){
      base = cs.split('\\/js/main.js')[0] || '.';
    }
  }catch(_eBase){}

  function p(path){
    if(!path) return path;
    if(base === '.' || base === '') return path;
    return base.replace(/\\/$/,'') + '/' + path.replace(/^\\./,'').replace(/^\\//,'');
  }

  var common = [
    p('./js/core/paths.js'),
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

  loadScripts(common.concat([pageScript])).then(function(){
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
  }).catch(function(err){
    try{ console.error(err); }catch(_e){}
  });
})();
