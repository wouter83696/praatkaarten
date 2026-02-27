// Praatkaartjes – Menu component (ES5)
// Doel: menu open/close/toggle centraal beheren.
(function(w){
  'use strict';
  var PK = w.PK = w.PK || {};

  function goHome(){
    var target = '';
    try{
      if(PK && PK.PATHS && PK.PATHS.gridPage){
        target = String(PK.PATHS.gridPage || '');
      }
    }catch(_ePath){}
    if(!target){
      var p = '';
      try{ p = String((w.location && w.location.pathname) || ''); }catch(_eLoc){ p = ''; }
      target = (p.indexOf('/kaarten/') !== -1 || p.indexOf('/uitleg/') !== -1) ? '../index.html' : './index.html';
    }
    try{ w.location.href = target; }catch(_eNav){}
  }

  function isHomeAreaClick(trigger, ev){
    if(!trigger || !ev) return false;
    var t = ev.target || null;
    if(!t || !t.closest) return false;
    var main = t.closest('.themePillMain');
    return !!(main && trigger.contains(main));
  }

  function bindTopBarHome(trigger){
    if(!trigger || trigger.__pkTopBarHomeBound) return;
    trigger.__pkTopBarHomeBound = true;
    trigger.addEventListener('click', function(ev){
      if(!isHomeAreaClick(trigger, ev)) return;
      if(ev && ev.preventDefault) ev.preventDefault();
      if(ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      else if(ev && ev.stopPropagation) ev.stopPropagation();
      goHome();
    }, true);
  }

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
      bindTopBarHome(trigger);
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
      trigger.onclick = function(ev){
        if(isHomeAreaClick(trigger, ev)){
          goHome();
          return;
        }
        toggle();
      };
    }
    if(overlay){
      overlay.onclick = close;
    }

    return { open: open, close: close, toggle: toggle, isOpen: isOpen };
  };
})(window);
