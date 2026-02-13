// Praatkaartjes – netwerk helpers (ES5)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  PK.getText = function(url){
    try{
      if(PK.DEBUG && w.console && w.console.log){
        w.console.log('[DEBUG] fetch', url);
      }
    }catch(_eDbg){}
    if(w.fetch){
      return fetch(url, { cache:'no-store' }).then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status+' '+url);
        return r.text();
      });
    }
    // XHR fallback
    return new Promise(function(resolve, reject){
      try{
        var x = new XMLHttpRequest();
        x.open('GET', url, true);
        x.onreadystatechange = function(){
          if(x.readyState===4){
            if(x.status>=200 && x.status<300) resolve(x.responseText);
            else reject(new Error('HTTP '+x.status+' '+url));
          }
        };
        x.send(null);
      }catch(e){ reject(e); }
    });
  };

  PK.getJson = function(url){
    return PK.getText(url).then(function(t){
      try{ return JSON.parse(t); }catch(e){ return {}; }
    }, function(){
      return {};
    });
  };

  PK.loadJson = function(url){
    // Alias voor index: harde fout bij HTTP errors (catch in page)
    return PK.getText(url).then(function(t){ return JSON.parse(t); });
  };
})(window);
