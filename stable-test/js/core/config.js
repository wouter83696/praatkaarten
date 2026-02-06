// Praatkaartjes – config (gedeeld)
// Geen modules: bewust ES5 + één globale namespace.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  PK.VERSION = '3.7.1.76';

  // Centrale paden (één bron van waarheid)
  // Bepaal basispad (werkt ook als je vanuit /uitleg/ draait)
  var base = '.';
  try{
    var p = w.location && w.location.pathname ? w.location.pathname : '';
    if(p.indexOf('/uitleg/') !== -1) base = '..';
  }catch(_eBase){}

  PK.BASE = base;
  PK.PATHS = PK.PATHS || {
    // Gebruik altijd relatieve paden zodat alles vanuit een map kan draaien.
    base: base,
    setsIndex: base + '/sets/index.json',
    setsDir: base + '/sets',
    assets: base + '/assets'
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
