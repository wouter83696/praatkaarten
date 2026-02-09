// Praatkaartjes – config (gedeeld)
// Geen modules: bewust ES5 + één globale namespace.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  PK.VERSION = '3.7.1.76';

  // Centrale paden (één bron van waarheid)
  // Bepaal basispad (werkt ook als je vanuit /uitleg/ of /kaarten/ draait)
  var base = '.';
  try{
    var p = w.location && w.location.pathname ? w.location.pathname : '';
    if(p.indexOf('/uitleg/') !== -1 || p.indexOf('/kaarten/') !== -1) base = '..';
  }catch(_eBase){}

  PK.BASE = base;
  PK.PATHS = PK.PATHS || {
    // Gebruik altijd relatieve paden zodat alles vanuit een map kan draaien.
    base: base,
    setsIndex: base + '/sets/index.json',
    setsDir: base + '/sets',
    assets: base + '/assets',
    gridPage: base + '/index.html',
    cardsPage: base + '/kaarten.html'
  };

  PK.pathForSet = function(setId, rel){
    var s = String(setId||'').replace(/^\s+|\s+$/g,'') || 'samenwerken';
    var r = String(rel||'').replace(/^\//,'');
    return PK.PATHS.setsDir + '/' + encodeURIComponent(s) + '/' + r;
  };
  PK.pathForAsset = function(rel){
    var r = String(rel||'').replace(/^\//,'');
    var dir = (PK.PATHS && (PK.PATHS.assets || PK.PATHS.assetsDir)) ? (PK.PATHS.assets || PK.PATHS.assetsDir) : base + '/assets';
    return dir + '/' + r;
  };
  PK.withV = function(url){
    return url + (url.indexOf('?')===-1 ? '?' : '&') + 'v=' + encodeURIComponent(PK.VERSION);
  };
  // Cache-bust sets index (belangrijk voor main index)
  try{ PK.PATHS.setsIndex = PK.withV(PK.PATHS.setsIndex); }catch(_eSet){}
})(window);
