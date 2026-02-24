// Praatkaartjes – Menu component (ES5)
// Doel: menu open/close/toggle centraal beheren.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  PK.createMenu = function(options){
    options = options || {};
    var menu = options.menu || w.document.getElementById('themeMenu');
    var overlay = options.overlay || w.document.getElementById('themeMenuOverlay');
    var trigger = options.trigger || w.document.getElementById('themePill');

    if(!menu){
      return {
        open: function(){}, close: function(){}, toggle: function(){}, isOpen: function(){ return false; }
      };
    }

    if(PK.createBottomSheet){
      return PK.createBottomSheet({ sheet: menu, overlay: overlay, trigger: trigger });
    }

    function open(){
      menu.hidden = false;
      if(overlay) overlay.hidden = false;
      if(trigger) trigger.setAttribute('aria-expanded','true');
    }

    function close(){
      menu.hidden = true;
      if(overlay) overlay.hidden = true;
      if(trigger) trigger.setAttribute('aria-expanded','false');
    }

    function isOpen(){
      return !menu.hidden;
    }

    function toggle(){
      if(isOpen()) close(); else open();
    }

    if(trigger){
      trigger.onclick = function(){ toggle(); };
    }
    if(overlay){
      overlay.onclick = close;
    }

    return { open: open, close: close, toggle: toggle, isOpen: isOpen };
  };
})(window);
