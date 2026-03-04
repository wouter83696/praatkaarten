// Praatkaartjes – query & naming helpers (ES5)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  PK.getQueryParam = function(name){
    var s = w.location.search || '';
    if(s.charAt(0)==='?') s = s.substring(1);
    var parts = s.split('&');
    for(var i=0;i<parts.length;i++){
      var kv = parts[i].split('=');
      if(decodeURIComponent(kv[0]||'')===name) return decodeURIComponent(kv[1]||'');
    }
    return '';
  };

  PK.getActiveSet = function(){
    // 1) state (als pagina set bepaald heeft)
    if(PK.state && PK.state.activeSet){
      return String(PK.state.activeSet).replace(/^\s+|\s+$/g,'') || 'samenwerken';
    }
    // 2) querystring
    var s = (PK.getQueryParam('set') || PK.getQueryParam('s') || '').replace(/^\s+|\s+$/g,'');
    return s ? s : 'samenwerken';
  };

  PK.prettyName = function(setId){
    var s = String(setId||'').toLowerCase();
    if(s==='check-in' || s==='checkin') return 'Check-in';
    if(s==='samenwerken') return 'Samen onderzoeken';
    if(s==='verbinden') return 'Verbinden';
    if(s==='verkennen') return 'Verkennen';
    if(s==='verhelderen') return 'Verhelderen';
    if(s==='vertragen') return 'Vertragen';
    if(s==='bewegen') return 'Bewegen';
    if(s==='teamstart') return 'Teamstart';
    if(s==='reflectie') return 'Reflectie';
    if(s==='spanning') return 'Spanning';
    if(s==='feedback') return 'Feedback';
    if(s==='energie') return 'Energie';
    return s ? (s.charAt(0).toUpperCase()+s.slice(1)) : 'Samen onderzoeken';
  };

  PK.prettifySetName = function(s){
    s = String(s || '').replace(/[._-]+/g,' ').replace(/^\s+|\s+$/g,'');
    if(!s) return '';
    var words = s.split(/\s+/);
    for(var i=0;i<words.length;i++){
      var w0 = words[i];
      words[i] = w0 ? (w0.charAt(0).toUpperCase() + w0.slice(1)) : '';
    }
    return words.join(' ');
  };
})(window);
