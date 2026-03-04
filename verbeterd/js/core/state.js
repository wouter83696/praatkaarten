// Praatkaartjes – eenvoudige state (ES5)
// Doel: één bron van waarheid voor actieve set/thema, zodat links en pagina's consistent zijn.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  PK.state = PK.state || {
    activeSet: '',
    activeTheme: ''
  };

  PK.setActiveSet = function(setId){
    PK.state.activeSet = String(setId || '').replace(/^\s+|\s+$/g,'');
  };

  PK.setActiveTheme = function(themeKey){
    PK.state.activeTheme = String(themeKey || '').replace(/^\s+|\s+$/g,'');
  };
})(window);
