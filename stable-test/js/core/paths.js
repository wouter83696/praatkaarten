// Praatkaartjes – centrale paden (relatief)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  var base = '.';
  try{
    var p = w.location && w.location.pathname ? w.location.pathname : '';
    if(p.indexOf('/uitleg/') !== -1 || p.indexOf('/kaarten/') !== -1){
      base = '..';
    }
  }catch(_eBase){}

  var PATHS = {
    base: base,
    setsIndex: base + '/sets/index.json',
    setsDir: base + '/sets',
    assetsDir: base + '/assets',
    gridPage: base + '/index.html',
    cardsPage: base + '/kaarten.html'
  };

  PK.PATHS = PATHS;
  w.PATHS = PATHS;

  PK.VERSION = PK.VERSION || '4.1.9';
  PK.withV = function(url){
    return url + (url.indexOf('?')===-1 ? '?' : '&') + 'v=' + encodeURIComponent(PK.VERSION);
  };

  // Cache-bust index.json zodat wijzigingen direct zichtbaar zijn
  try{ PATHS.setsIndex = PK.withV(PATHS.setsIndex); }catch(_eSet){}

  PK.pathForSet = function(setId, rel){
    var s = String(setId||'').replace(/^\s+|\s+$/g,'') || 'samenwerken';
    var r = String(rel||'').replace(/^\//,'');
    return PATHS.setsDir + '/' + encodeURIComponent(s) + '/' + r;
  };

  PK.pathForAsset = function(rel){
    var r = String(rel||'').replace(/^\//,'');
    return PATHS.assetsDir + '/' + r;
  };

  // Debug flag (?debug=1)
  try{
    var q = (w.location && w.location.search) ? w.location.search : '';
    PK.DEBUG = (q.indexOf('debug=1') !== -1);
  }catch(_e){ PK.DEBUG = false; }
})(window);
