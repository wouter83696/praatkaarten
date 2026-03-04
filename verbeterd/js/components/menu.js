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
    var api = null;

    if(menu && menu.__pkMenuApi) return menu.__pkMenuApi;

    if(!menu){
      return {
        open: function(){}, close: function(){}, toggle: function(){}, isOpen: function(){ return false; }
      };
    }

    function open(){
      menu.hidden = false;
      if(overlay) overlay.hidden = true;
      if(trigger) trigger.setAttribute('aria-expanded','true');
      // Focus eerste focusbare knop in het menu (toegankelijkheid)
      w.requestAnimationFrame(function(){
        var first = menu.querySelector('button:not([hidden]), [tabindex]:not([tabindex="-1"]):not([hidden])');
        if(first && first.focus) first.focus();
      });
    }

    function close(){
      menu.hidden = true;
      if(overlay) overlay.hidden = true;
      if(trigger) trigger.setAttribute('aria-expanded','false');
      // Focus terug naar de trigger (toegankelijkheid)
      if(trigger && trigger.focus) trigger.focus();
    }

    function isOpen(){
      return !menu.hidden;
    }

    function toggle(){
      if(isOpen()) close(); else open();
    }

    function onTriggerClick(ev){
      if(isHomeAreaClick(trigger, ev)){
        close();
        goHome();
        return;
      }
      toggle();
    }

    function onDocPointerDown(ev){
      var t = ev && ev.target ? ev.target : null;
      if(!isOpen() || !t) return;
      if(menu.contains(t)) return;
      if(trigger && trigger.contains(t)) return;
      close();
    }

    function onDocClick(ev){
      var t = ev && ev.target ? ev.target : null;
      if(!t) return;
      if(!isOpen()) return;
      if(menu.contains(t)) return;
      if(trigger && trigger.contains(t)) return;
      close();
    }

    function onKeyDown(ev){
      ev = ev || w.event;
      if(ev && ev.key === 'Escape') close();
    }

    bindTopBarHome(trigger);
    if(trigger) trigger.addEventListener('click', onTriggerClick);
    if(overlay){
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
    }
    w.document.addEventListener('pointerdown', onDocPointerDown, true);
    w.document.addEventListener('click', onDocClick, true);
    w.document.addEventListener('keydown', onKeyDown);

    api = {
      open: open,
      close: close,
      toggle: toggle,
      isOpen: isOpen,
      destroy: function(){
        if(trigger) trigger.removeEventListener('click', onTriggerClick);
        w.document.removeEventListener('pointerdown', onDocPointerDown, true);
        w.document.removeEventListener('click', onDocClick, true);
        w.document.removeEventListener('keydown', onKeyDown);
      }
    };
    menu.__pkMenuApi = api;
    return api;
  };
})(window);
