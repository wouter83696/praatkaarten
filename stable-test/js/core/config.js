// Praatkaartjes – config (gedeeld)
// Geen modules: bewust ES5 + één globale namespace.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  PK.VERSION = '3.7.1.73a';

  // Centrale paden (één bron van waarheid)
  PK.PATHS = PK.PATHS || {
    setsIndex: 'sets/index.json',
    setsDir: 'sets'
  };

  PK.pathForSet = function(setId, rel){
    var s = String(setId||'').replace(/^\s+|\s+$/g,'') || 'samenwerken';
    var r = String(rel||'').replace(/^\//,'');
    return PK.PATHS.setsDir + '/' + encodeURIComponent(s) + '/' + r;
  };
  PK.withV = function(url){
    return url + (url.indexOf('?')===-1 ? '?' : '&') + 'v=' + encodeURIComponent(PK.VERSION);
  };
})(window);
