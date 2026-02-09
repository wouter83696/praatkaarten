// Praatkaartjes – gedeelde shell (menu/sheet/theme/background)
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};
  PK.shell = PK.shell || {};

  function applyCssVars(vars){
    if(!vars) return;
    var root = w.document && w.document.documentElement;
    if(!root || !root.style) return;
    for(var k in vars){
      if(!Object.prototype.hasOwnProperty.call(vars, k)) continue;
      var name = k.indexOf('--') === 0 ? k : ('--' + k);
      try{ root.style.setProperty(name, String(vars[k])); }catch(_e){}
    }
  }

  PK.shell.applyCssVars = applyCssVars;

  PK.shell.initShell = function(){
    // Shell init is bewust lichtgewicht. Menu/sheet worden door page-logica aangestuurd.
    try{
      if(PK.DEBUG && w.console && w.console.log){
        w.console.log('[DEBUG] shell init');
      }
    }catch(_e){}

    // Zorg dat het menu-icoon altijd via PATHS wordt gezet (relatief).
    try{
      var body = w.document && w.document.body;
      var brand = !!(body && body.getAttribute && body.getAttribute('data-brand-icon') === '1');
      var icon = w.document && w.document.getElementById ? w.document.getElementById('setCoverIcon') : null;
      if(brand && icon && PK.pathForAsset){
        var src = PK.pathForAsset('logo-icons/app/apple-touch-icon.png');
        icon.setAttribute('src', PK.withV ? PK.withV(src) : src);
      }
    }catch(_eIcon){}
  };
})(window);
