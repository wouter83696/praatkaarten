// Praatkaartjes – config fallback
// Wordt alleen gebruikt als `core/paths.js` niet laadt.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  var base = '.';
  var PATHS;

  try{
    var p = (w.location && w.location.pathname) ? String(w.location.pathname) : '';
    if(p.indexOf('/uitleg/') !== -1 || p.indexOf('/kaarten/') !== -1) base = '..';
  }catch(_eBase){ base = '.'; }

  PATHS = PK.PATHS || {
    base: base,
    setsIndex: base + '/sets/index.json',
    setsDir: base + '/sets',
    assetsDir: base + '/assets',
    gridPage: base + '/index.html',
    cardsPage: base + '/kaarten/'
  };

  PK.PATHS = PATHS;
  w.PATHS = PATHS;
  PK.VERSION = PK.VERSION || '4.2.6';

  if(typeof PK.withV !== 'function'){
    PK.withV = function(url){
      return String(url || '') + (String(url || '').indexOf('?')===-1 ? '?' : '&') + 'v=' + encodeURIComponent(PK.VERSION);
    };
  }
  if(typeof PK.pathForSet !== 'function'){
    PK.pathForSet = function(setId, rel){
      var s = String(setId||'').replace(/^\s+|\s+$/g,'') || 'samenwerken';
      var r = String(rel||'').replace(/^\//,'');
      return PATHS.setsDir + '/' + encodeURIComponent(s) + '/' + r;
    };
  }
  if(typeof PK.pathForAsset !== 'function'){
    PK.pathForAsset = function(rel){
      var r = String(rel||'').replace(/^\//,'');
      return (PATHS.assetsDir || (base + '/assets')) + '/' + r;
    };
  }
  try{
    if(PATHS.setsIndex && !/[?&]v=/.test(PATHS.setsIndex)){
      PATHS.setsIndex = PK.withV(PATHS.setsIndex);
    }
  }catch(_eSet){}
})(window);
